export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface NormalizedParameter {
  name: string;
  type: string;
  required: boolean;
  in: "query" | "path" | "header" | "body";
  description: string;
  example?: string;
}

export interface NormalizedResponse {
  status: number;
  description: string;
  example: string;
}

/** The normalized API model shared by both the OpenAPI-URL path and the
 * future GitHub-repo path (spec §4) — every downstream stage (AI analysis,
 * test generation, execution, reporting) only ever depends on this shape. */
export interface NormalizedEndpoint {
  method: HttpMethod;
  path: string;
  summary: string;
  tag: string;
  authRequired: boolean;
  parameters: NormalizedParameter[];
  requestBodySchema: unknown | null;
  responses: NormalizedResponse[];
  source: "openapi" | "github";
}

export interface NormalizedApiSource {
  specVersion: string;
  rawFormat: "JSON" | "YAML";
  /** Server base URL declared by the spec itself (v3 `servers[0].url`, v2
   * `schemes[0]://host+basePath`), if any — used as the default target for
   * test execution. Falls back to the fetched document's own origin when
   * the spec declares none (common for relative-only specs). */
  baseUrl: string | null;
  authSchemes: Array<{ type: string; scheme?: string; name?: string; in?: string; description?: string }>;
  endpoints: NormalizedEndpoint[];
}
