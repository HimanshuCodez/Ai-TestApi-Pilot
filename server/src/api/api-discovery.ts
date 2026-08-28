import pLimit from "p-limit";
import { prisma } from "../db.js";
import { fetchUrlSafely } from "./api-fetcher.js";
import { parseOpenApiDocument } from "./openapi-parser.js";
import { fetchRawFile, fetchRepoTree, parseGithubRepoUrl, type GithubTreeEntry } from "./github-fetcher.js";
import { isScannableSourceFile, rankCandidateFiles, routesToEndpoints, scanFileForRoutes } from "./route-scanner.js";
import type { NormalizedApiSource } from "./types.js";

export interface DiscoveryResult {
  endpointCount: number;
  authSchemeCount: number;
  specVersion: string;
  baseUrl: string | null;
}

const GITHUB_SCAN_CONCURRENCY = 8;
const GITHUB_SCAN_FILE_CAP = 200;
const SPEC_FILENAME_RE = /^(openapi|swagger)\.(json|ya?ml)$/i;

async function persist(
  projectId: string,
  source: NormalizedApiSource,
  kind: "URL" | "FILE" | "GITHUB",
  origin: { sourceUrl?: string; fileName?: string }
): Promise<DiscoveryResult> {
  await prisma.$transaction([
    prisma.apiSource.deleteMany({ where: { projectId } }),
    prisma.endpoint.deleteMany({ where: { projectId } }),
  ]);

  await prisma.$transaction([
    prisma.apiSource.create({
      data: {
        projectId,
        kind,
        sourceUrl: origin.sourceUrl,
        fileName: origin.fileName,
        specVersion: source.specVersion,
        rawFormat: source.rawFormat,
        authSchemes: source.authSchemes as object[],
      },
    }),
    prisma.endpoint.createMany({
      data: source.endpoints.map((e) => ({
        projectId,
        method: e.method,
        path: e.path,
        summary: e.summary,
        tag: e.tag,
        authRequired: e.authRequired,
        parameters: e.parameters as unknown as object[],
        requestBodySchema: e.requestBodySchema === null ? undefined : (e.requestBodySchema as object),
        responses: e.responses as unknown as object[],
        source: e.source,
      })),
    }),
    prisma.project.update({
      where: { id: projectId },
      data: {
        baseUrl: source.baseUrl ?? undefined,
        status: "healthy",
      },
    }),
  ]);

  return {
    endpointCount: source.endpoints.length,
    authSchemeCount: source.authSchemes.length,
    specVersion: source.specVersion,
    baseUrl: source.baseUrl,
  };
}

/** Fetches a spec from a public URL (SSRF-guarded), parses, and persists it. */
export async function discoverFromUrl(projectId: string, url: string): Promise<DiscoveryResult> {
  const fetched = await fetchUrlSafely(url);
  const normalized = parseOpenApiDocument(fetched.content, fetched.finalUrl);
  return persist(projectId, normalized, "URL", { sourceUrl: fetched.finalUrl });
}

/** Parses an uploaded spec file's raw text content and persists it. */
export async function discoverFromFile(
  projectId: string,
  fileName: string,
  content: string
): Promise<DiscoveryResult> {
  const normalized = parseOpenApiDocument(content);
  return persist(projectId, normalized, "FILE", { fileName });
}

function findSpecFileInTree(tree: GithubTreeEntry[]): GithubTreeEntry | null {
  const candidates = tree.filter((e) => SPEC_FILENAME_RE.test(e.path.split("/").pop() ?? ""));
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.path.split("/").length - b.path.split("/").length || a.path.localeCompare(b.path));
  return candidates[0];
}

async function scanRepoForRoutes(
  owner: string,
  repo: string,
  ref: string,
  tree: GithubTreeEntry[]
): Promise<NormalizedApiSource["endpoints"]> {
  const candidatePaths = rankCandidateFiles(tree.map((e) => e.path).filter(isScannableSourceFile)).slice(
    0,
    GITHUB_SCAN_FILE_CAP
  );

  const limit = pLimit(GITHUB_SCAN_CONCURRENCY);
  const rawRoutesByFile = await Promise.all(
    candidatePaths.map((path) =>
      limit(async () => {
        try {
          const content = await fetchRawFile(owner, repo, ref, path);
          return scanFileForRoutes(content, path);
        } catch {
          return []; // best-effort — one unreadable/oversized file shouldn't fail the whole scan
        }
      })
    )
  );

  return routesToEndpoints(rawRoutesByFile.flat());
}

/**
 * Connects a public GitHub repository (spec §4). First looks for a checked-in
 * OpenAPI/Swagger spec file anywhere in the repo tree and parses it exactly
 * like the URL/file paths. If none is found, falls back to a best-effort
 * regex-based scan of source files for Express/Fastify/NestJS/Flask/FastAPI/
 * Django route definitions — no request/response schemas, no auth detection
 * beyond a keyword heuristic, but enough to seed test generation without a
 * spec file at all.
 */
export async function discoverFromGithub(projectId: string, repoUrl: string): Promise<DiscoveryResult> {
  const { owner, repo } = parseGithubRepoUrl(repoUrl);
  const { defaultBranch, tree } = await fetchRepoTree(owner, repo);

  const specEntry = findSpecFileInTree(tree);
  if (specEntry) {
    try {
      const raw = await fetchRawFile(owner, repo, defaultBranch, specEntry.path);
      const normalized = parseOpenApiDocument(raw);
      return persist(projectId, normalized, "GITHUB", {
        sourceUrl: `https://github.com/${owner}/${repo}/blob/${defaultBranch}/${specEntry.path}`,
      });
    } catch {
      // The file matched a spec-like name but didn't actually parse — fall through to route scanning.
    }
  }

  const endpoints = await scanRepoForRoutes(owner, repo, defaultBranch, tree);
  if (endpoints.length === 0) {
    throw new Error("NOT_OPENAPI: no OpenAPI spec or recognizable routes found in this repository");
  }

  const normalized: NormalizedApiSource = {
    specVersion: "github-scan",
    rawFormat: "JSON",
    baseUrl: null,
    authSchemes: [],
    endpoints,
  };
  return persist(projectId, normalized, "GITHUB", { sourceUrl: repoUrl });
}
