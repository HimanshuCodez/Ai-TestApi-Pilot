import yaml from "js-yaml";
import type { HttpMethod, NormalizedApiSource, NormalizedEndpoint, NormalizedParameter, NormalizedResponse } from "./types.js";

const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete", "head", "options"].map(
  (m) => m.toUpperCase() as HttpMethod
);

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function detectFormat(raw: string): "JSON" | "YAML" {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "JSON";
  return "YAML";
}

export function parseSpecText(raw: string): unknown {
  try {
    return yaml.load(raw);
  } catch {
    throw new Error("INVALID_SPEC: could not parse as JSON or YAML");
  }
}

/** Resolves local `#/a/b/c` refs, inlining them with cycle protection. */
function resolveRefs(node: unknown, root: JsonObject, seen: Set<string>, depth = 0): unknown {
  if (depth > 20) return node;
  if (Array.isArray(node)) return node.map((n) => resolveRefs(n, root, seen, depth + 1));
  if (!isObject(node)) return node;

  const ref = node["$ref"];
  if (typeof ref === "string" && ref.startsWith("#/")) {
    if (seen.has(ref)) return { description: "(circular reference)" };
    const path = ref.slice(2).split("/");
    let target: unknown = root;
    for (const segment of path) {
      if (!isObject(target)) {
        target = undefined;
        break;
      }
      target = target[segment];
    }
    if (target === undefined) return { description: `(unresolved reference ${ref})` };
    const nextSeen = new Set(seen);
    nextSeen.add(ref);
    return resolveRefs(target, root, nextSeen, depth + 1);
  }

  const out: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = resolveRefs(value, root, seen, depth + 1);
  }
  return out;
}

function extractParamsV3(params: unknown, root: JsonObject): NormalizedParameter[] {
  if (!Array.isArray(params)) return [];
  return params.map((p) => {
    const resolved = resolveRefs(p, root, new Set()) as JsonObject;
    const schema = isObject(resolved.schema) ? resolved.schema : {};
    return {
      name: String(resolved.name ?? ""),
      type: String((schema as JsonObject).type ?? "string"),
      required: Boolean(resolved.required),
      in: (resolved.in as NormalizedParameter["in"]) ?? "query",
      description: String(resolved.description ?? ""),
      example: resolved.example !== undefined ? String(resolved.example) : undefined,
    };
  });
}

function extractRequestBodyV3(operation: JsonObject, root: JsonObject): unknown | null {
  const requestBody = resolveRefs(operation.requestBody, root, new Set());
  if (!isObject(requestBody)) return null;
  const content = requestBody.content;
  if (!isObject(content)) return null;
  const jsonContent = content["application/json"] ?? Object.values(content)[0];
  if (!isObject(jsonContent)) return null;
  return jsonContent.schema ?? null;
}

function extractResponsesV3(operation: JsonObject, root: JsonObject): NormalizedResponse[] {
  const responses = resolveRefs(operation.responses, root, new Set());
  if (!isObject(responses)) return [];
  return Object.entries(responses).map(([status, value]) => {
    const resValue = isObject(value) ? value : {};
    const content = isObject(resValue.content) ? resValue.content : {};
    const jsonContent = isObject(content["application/json"]) ? content["application/json"] : undefined;
    const example = jsonContent?.example ?? jsonContent?.schema ?? {};
    return {
      status: Number.parseInt(status, 10) || 0,
      description: String(resValue.description ?? ""),
      example: JSON.stringify(example),
    };
  });
}

function extractBaseUrlV3(doc: JsonObject, documentUrl?: string): string | null {
  const servers = doc.servers;
  if (!Array.isArray(servers) || servers.length === 0) return null;
  const first = servers[0];
  if (!isObject(first) || typeof first.url !== "string" || first.url.length === 0) return null;
  try {
    return new URL(first.url, documentUrl).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function extractBaseUrlV2(doc: JsonObject, documentUrl?: string): string | null {
  const host = typeof doc.host === "string" ? doc.host : undefined;
  if (!host) return null;
  const basePath = typeof doc.basePath === "string" ? doc.basePath : "";
  const schemes = Array.isArray(doc.schemes) ? doc.schemes : [];
  const scheme = typeof schemes[0] === "string" ? schemes[0] : "https";
  return `${scheme}://${host}${basePath}`.replace(/\/$/, "");
}

function extractSecuritySchemesV3(doc: JsonObject): NormalizedApiSource["authSchemes"] {
  const components = isObject(doc.components) ? doc.components : {};
  const schemes = isObject(components.securitySchemes) ? components.securitySchemes : {};
  return Object.entries(schemes).map(([name, def]) => {
    const d = isObject(def) ? def : {};
    return {
      type: String(d.type ?? "unknown"),
      scheme: d.scheme ? String(d.scheme) : undefined,
      name: d.name ? String(d.name) : name,
      in: d.in ? String(d.in) : undefined,
      description: d.description ? String(d.description) : undefined,
    };
  });
}

function extractSecuritySchemesV2(doc: JsonObject): NormalizedApiSource["authSchemes"] {
  const defs = isObject(doc.securityDefinitions) ? doc.securityDefinitions : {};
  return Object.entries(defs).map(([name, def]) => {
    const d = isObject(def) ? def : {};
    return {
      type: String(d.type ?? "unknown"),
      name: d.name ? String(d.name) : name,
      in: d.in ? String(d.in) : undefined,
      description: d.description ? String(d.description) : undefined,
    };
  });
}

function parseOpenApi3(doc: JsonObject, version: string, documentUrl?: string): NormalizedApiSource {
  const paths = isObject(doc.paths) ? doc.paths : {};
  const authSchemes = extractSecuritySchemesV3(doc);
  const globallyRequiresAuth = Array.isArray(doc.security) && doc.security.length > 0;

  const endpoints: NormalizedEndpoint[] = [];
  for (const [path, pathItemRaw] of Object.entries(paths)) {
    const pathItem = resolveRefs(pathItemRaw, doc, new Set()) as JsonObject;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method.toLowerCase()];
      if (!isObject(operation)) continue;

      const hasOwnSecurity = Array.isArray(operation.security);
      const authRequired = hasOwnSecurity ? (operation.security as unknown[]).length > 0 : globallyRequiresAuth;

      const tags = Array.isArray(operation.tags) ? operation.tags : [];
      endpoints.push({
        method,
        path,
        summary: String(operation.summary ?? operation.description ?? ""),
        tag: tags.length > 0 ? String(tags[0]) : "General",
        authRequired,
        parameters: [
          ...extractParamsV3(pathItem.parameters, doc),
          ...extractParamsV3(operation.parameters, doc),
        ],
        requestBodySchema: extractRequestBodyV3(operation, doc),
        responses: extractResponsesV3(operation, doc),
        source: "openapi",
      });
    }
  }

  return {
    specVersion: version,
    rawFormat: "JSON",
    baseUrl: extractBaseUrlV3(doc, documentUrl),
    authSchemes,
    endpoints,
  };
}

function parseSwagger2(doc: JsonObject, documentUrl?: string): NormalizedApiSource {
  const paths = isObject(doc.paths) ? doc.paths : {};
  const authSchemes = extractSecuritySchemesV2(doc);
  const globallyRequiresAuth = Array.isArray(doc.security) && doc.security.length > 0;

  const endpoints: NormalizedEndpoint[] = [];
  for (const [path, pathItemRaw] of Object.entries(paths)) {
    const pathItem = resolveRefs(pathItemRaw, doc, new Set()) as JsonObject;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method.toLowerCase()];
      if (!isObject(operation)) continue;

      const hasOwnSecurity = Array.isArray(operation.security);
      const authRequired = hasOwnSecurity ? (operation.security as unknown[]).length > 0 : globallyRequiresAuth;

      const params = Array.isArray(operation.parameters) ? operation.parameters : [];
      const resolvedParams = (resolveRefs(params, doc, new Set()) as unknown[]).filter(isObject);
      const bodyParam = resolvedParams.find((p) => p.in === "body");

      const tags = Array.isArray(operation.tags) ? operation.tags : [];
      endpoints.push({
        method,
        path,
        summary: String(operation.summary ?? operation.description ?? ""),
        tag: tags.length > 0 ? String(tags[0]) : "General",
        authRequired,
        parameters: resolvedParams
          .filter((p) => p.in !== "body")
          .map((p) => ({
            name: String(p.name ?? ""),
            type: String(p.type ?? "string"),
            required: Boolean(p.required),
            in: (p.in as NormalizedParameter["in"]) ?? "query",
            description: String(p.description ?? ""),
          })),
        requestBodySchema: bodyParam ? (bodyParam.schema ?? null) : null,
        responses: isObject(operation.responses)
          ? Object.entries(operation.responses).map(([status, value]) => {
              const resValue = isObject(value) ? value : {};
              return {
                status: Number.parseInt(status, 10) || 0,
                description: String(resValue.description ?? ""),
                example: JSON.stringify(resValue.examples ?? resValue.schema ?? {}),
              };
            })
          : [],
        source: "openapi" as const,
      });
    }
  }

  return {
    specVersion: "2.0",
    rawFormat: "JSON",
    baseUrl: extractBaseUrlV2(doc, documentUrl),
    authSchemes,
    endpoints,
  };
}

/**
 * Parses raw spec text (JSON or YAML) into the normalized API model.
 * `documentUrl` (the URL the spec was fetched from, if any) is used to
 * resolve relative `servers[].url` entries and as a last-resort base URL.
 * Throws NOT_OPENAPI / UNSUPPORTED_SPEC_VERSION / INVALID_SPEC prefixed
 * errors that utils/errors.ts translates into friendly messages.
 */
export function parseOpenApiDocument(raw: string, documentUrl?: string): NormalizedApiSource {
  const format = detectFormat(raw);
  const parsed = parseSpecText(raw);

  if (!isObject(parsed)) {
    throw new Error("NOT_OPENAPI: document is not a JSON/YAML object");
  }

  const openapiVersion = typeof parsed.openapi === "string" ? parsed.openapi : undefined;
  const swaggerVersion = typeof parsed.swagger === "string" ? parsed.swagger : undefined;

  if (!openapiVersion && !swaggerVersion) {
    throw new Error("NOT_OPENAPI: missing openapi/swagger version field");
  }

  if (!isObject(parsed.paths) || Object.keys(parsed.paths).length === 0) {
    throw new Error("INVALID_SPEC: document has no paths defined");
  }

  let result: NormalizedApiSource;
  if (swaggerVersion) {
    if (!swaggerVersion.startsWith("2.")) {
      throw new Error(`UNSUPPORTED_SPEC_VERSION: swagger ${swaggerVersion}`);
    }
    result = parseSwagger2(parsed, documentUrl);
  } else if (openapiVersion) {
    if (!openapiVersion.startsWith("3.")) {
      throw new Error(`UNSUPPORTED_SPEC_VERSION: openapi ${openapiVersion}`);
    }
    result = parseOpenApi3(parsed, openapiVersion, documentUrl);
  } else {
    throw new Error("NOT_OPENAPI: could not determine spec version");
  }

  if (result.endpoints.length === 0) {
    throw new Error("INVALID_SPEC: no operations found in any path");
  }

  if (!result.baseUrl && documentUrl) {
    try {
      result = { ...result, baseUrl: new URL(documentUrl).origin };
    } catch {
      // documentUrl wasn't a real URL (e.g. an uploaded file) — leave baseUrl null
    }
  }

  return { ...result, rawFormat: format };
}
