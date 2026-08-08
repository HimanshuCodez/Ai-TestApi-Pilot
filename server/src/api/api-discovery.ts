import { prisma } from "../db.js";
import { fetchUrlSafely } from "./api-fetcher.js";
import { parseOpenApiDocument } from "./openapi-parser.js";
import type { NormalizedApiSource } from "./types.js";

export interface DiscoveryResult {
  endpointCount: number;
  authSchemeCount: number;
  specVersion: string;
  baseUrl: string | null;
}

async function persist(
  projectId: string,
  source: NormalizedApiSource,
  kind: "URL" | "FILE",
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
