import type { HttpMethod, NormalizedEndpoint, NormalizedParameter } from "./types.js";

const HTTP_METHODS = new Set<HttpMethod>(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function isHttpMethod(value: string): value is HttpMethod {
  return HTTP_METHODS.has(value as HttpMethod);
}

/** Extensions the scanner knows how to read, and the file kind they map to. */
export function fileKindFor(path: string): "js" | "py" | null {
  if (/\.(js|jsx|mjs|cjs|ts|tsx)$/i.test(path)) return "js";
  if (/\.py$/i.test(path)) return "py";
  return null;
}

const EXCLUDED_PATH_SEGMENTS =
  /(^|\/)(node_modules|dist|build|out|\.git|vendor|venv|\.venv|env|site-packages|__pycache__|coverage)(\/|$)/i;
const TEST_FILE = /\.(test|spec)\.(js|jsx|ts|tsx|py)$|(^|\/)(tests?|__tests__)\//i;
const PRIORITY_HINT = /(route|router|controller|api|views?|urls|endpoints?)/i;

export function isScannableSourceFile(path: string): boolean {
  return fileKindFor(path) !== null && !EXCLUDED_PATH_SEGMENTS.test(path) && !TEST_FILE.test(path);
}

/** Ranks likely-relevant files first so a truncated scan still finds the real routes. */
export function rankCandidateFiles(paths: string[]): string[] {
  return [...paths].sort((a, b) => {
    const aHint = PRIORITY_HINT.test(a) ? 0 : 1;
    const bHint = PRIORITY_HINT.test(b) ? 0 : 1;
    if (aHint !== bHint) return aHint - bHint;
    return a.length - b.length;
  });
}

interface RawRoute {
  method: HttpMethod;
  rawPath: string;
  file: string;
  contextLines: string;
}

const AUTH_HINT = /auth|guard|login_required|jwt|permission_classes|is_authenticated|protect\(|requireauth/i;

/** Normalizes framework-specific path-param syntax (:id, <int:id>) to {id}. */
function normalizePath(rawPath: string): string {
  let path = rawPath.trim();
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/<[^:>]+:([A-Za-z0-9_]+)>/g, "{$1}"); // Flask typed: <int:id>
  path = path.replace(/<([A-Za-z0-9_]+)>/g, "{$1}"); // Flask untyped: <id>
  path = path.replace(/:([A-Za-z0-9_]+)/g, "{$1}"); // Express/NestJS: :id
  return path.replace(/\/+/g, "/").replace(/(.)\/$/, "$1");
}

function extractPathParams(path: string): NormalizedParameter[] {
  const params: NormalizedParameter[] = [];
  const re = /\{([A-Za-z0-9_]+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    params.push({ name: m[1], type: "string", required: true, in: "path", description: "" });
  }
  return params;
}

function joinPaths(prefix: string, suffix: string): string {
  const p = prefix.trim();
  const s = suffix.trim();
  if (!p) return s || "/";
  if (!s) return p;
  return `${p.replace(/\/$/, "")}/${s.replace(/^\//, "")}`;
}

function scanJsFile(content: string, filePath: string): RawRoute[] {
  const routes: RawRoute[] = [];
  const lines = content.split("\n");

  const controllerMatch = /@Controller\(\s*(['"`])([^'"`]*)\1\s*\)/.exec(content);
  const controllerPrefix = controllerMatch ? controllerMatch[2] : "";

  const expressRe = /\b(?:app|router|fastify)\.(get|post|put|patch|delete|head|options)\(\s*(['"`])([^'"`]*)\2/gi;
  const nestRe = /@(Get|Post|Put|Patch|Delete|Head|Options)\(\s*(?:(['"`])([^'"`)]*)\2)?\s*\)/g;

  lines.forEach((line, idx) => {
    const context = lines.slice(Math.max(0, idx - 2), idx + 2).join("\n");

    expressRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = expressRe.exec(line))) {
      const method = m[1].toUpperCase();
      if (isHttpMethod(method)) {
        routes.push({ method, rawPath: m[3] || "/", file: filePath, contextLines: context });
      }
    }

    nestRe.lastIndex = 0;
    while ((m = nestRe.exec(line))) {
      const method = m[1].toUpperCase();
      if (isHttpMethod(method)) {
        routes.push({
          method,
          rawPath: joinPaths(controllerPrefix, m[3] ?? ""),
          file: filePath,
          contextLines: context,
        });
      }
    }
  });

  return routes;
}

function scanPyFile(content: string, filePath: string): RawRoute[] {
  const routes: RawRoute[] = [];
  const lines = content.split("\n");
  const isUrlsFile = /urls\.py$/i.test(filePath);

  const fastapiRe = /@(?:app|router)\.(get|post|put|patch|delete|head|options)\(\s*(['"])([^'"]*)\2/gi;
  const flaskRe = /@app\.route\(\s*(['"])([^'"]*)\1(?:\s*,\s*methods\s*=\s*\[([^\]]*)\])?/gi;
  const djangoRe = /\b(?:path|re_path)\(\s*(['"])([^'"]*)\1/g;

  lines.forEach((line, idx) => {
    const context = lines.slice(Math.max(0, idx - 2), idx + 2).join("\n");

    fastapiRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = fastapiRe.exec(line))) {
      const method = m[1].toUpperCase();
      if (isHttpMethod(method)) {
        routes.push({ method, rawPath: m[3] || "/", file: filePath, contextLines: context });
      }
    }

    flaskRe.lastIndex = 0;
    while ((m = flaskRe.exec(line))) {
      const methodsRaw = m[3];
      const methods = methodsRaw
        ? methodsRaw
            .split(",")
            .map((s) => s.replace(/['"]/g, "").trim().toUpperCase())
            .filter(isHttpMethod)
        : (["GET"] as HttpMethod[]);
      for (const method of methods) {
        routes.push({ method, rawPath: m[2] || "/", file: filePath, contextLines: context });
      }
    }

    if (isUrlsFile) {
      djangoRe.lastIndex = 0;
      while ((m = djangoRe.exec(line))) {
        // Django's urls.py doesn't declare an HTTP method — the view function does.
        // We surface it as GET with a note; the user should verify the real method.
        routes.push({ method: "GET", rawPath: m[2] || "/", file: filePath, contextLines: context });
      }
    }
  });

  return routes;
}

/** Regex-scans one source file's content for route definitions. Best-effort, not an AST parser. */
export function scanFileForRoutes(content: string, filePath: string): RawRoute[] {
  const kind = fileKindFor(filePath);
  if (kind === "js") return scanJsFile(content, filePath);
  if (kind === "py") return scanPyFile(content, filePath);
  return [];
}

function tagFor(filePath: string): string {
  const base = filePath.split("/").pop() ?? filePath;
  return base.replace(/\.(js|jsx|mjs|cjs|ts|tsx|py)$/i, "");
}

/** Converts raw regex-matched routes into the shared NormalizedEndpoint shape, deduped. */
export function routesToEndpoints(rawRoutes: RawRoute[], maxEndpoints = 400): NormalizedEndpoint[] {
  const seen = new Set<string>();
  const endpoints: NormalizedEndpoint[] = [];

  for (const raw of rawRoutes) {
    const path = normalizePath(raw.rawPath);
    const key = `${raw.method} ${path}`;
    if (seen.has(key)) continue;
    seen.add(key);

    endpoints.push({
      method: raw.method,
      path,
      summary: `Detected via static code scan of ${raw.file} — verify manually.`,
      tag: tagFor(raw.file),
      authRequired: AUTH_HINT.test(raw.contextLines),
      parameters: extractPathParams(path),
      requestBodySchema: null,
      responses: [],
      source: "github",
    });

    if (endpoints.length >= maxEndpoints) break;
  }

  return endpoints;
}
