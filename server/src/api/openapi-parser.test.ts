import { describe, it, expect } from "vitest";
import { parseOpenApiDocument } from "./openapi-parser.js";

const OPENAPI_3_DOC = JSON.stringify({
  openapi: "3.0.3",
  info: { title: "Pet Store", version: "1.0.0" },
  servers: [{ url: "https://api.example.com/v1" }],
  paths: {
    "/pets": {
      get: {
        summary: "List pets",
        tags: ["Pets"],
        responses: { "200": { description: "OK" } },
      },
      post: {
        summary: "Create a pet",
        tags: ["Pets"],
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { "application/json": { schema: { type: "object" } } },
        },
        responses: { "201": { description: "Created" } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer" },
    },
  },
});

const SWAGGER_2_DOC = JSON.stringify({
  swagger: "2.0",
  host: "api.example.com",
  basePath: "/v1",
  schemes: ["https"],
  paths: {
    "/widgets": {
      get: {
        summary: "List widgets",
        responses: { "200": { description: "OK" } },
      },
    },
  },
});

describe("parseOpenApiDocument", () => {
  it("parses an OpenAPI 3.0 JSON document into the normalized model", () => {
    const result = parseOpenApiDocument(OPENAPI_3_DOC);
    expect(result.specVersion).toBe("3.0.3");
    expect(result.baseUrl).toBe("https://api.example.com/v1");
    expect(result.endpoints).toHaveLength(2);

    const getPets = result.endpoints.find((e) => e.method === "GET" && e.path === "/pets");
    expect(getPets?.authRequired).toBe(false);

    const postPets = result.endpoints.find((e) => e.method === "POST" && e.path === "/pets");
    expect(postPets?.authRequired).toBe(true);
    expect(postPets?.requestBodySchema).toEqual({ type: "object" });
    expect(result.authSchemes).toEqual([
      { type: "http", scheme: "bearer", name: "bearerAuth", in: undefined, description: undefined },
    ]);
  });

  it("parses a Swagger 2.0 JSON document into the normalized model", () => {
    const result = parseOpenApiDocument(SWAGGER_2_DOC);
    expect(result.specVersion).toBe("2.0");
    expect(result.baseUrl).toBe("https://api.example.com/v1");
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0]).toMatchObject({ method: "GET", path: "/widgets" });
  });

  it("parses YAML spec text", () => {
    const yamlDoc = [
      "openapi: 3.0.0",
      "info:",
      "  title: Test",
      "  version: 1.0.0",
      "paths:",
      "  /ping:",
      "    get:",
      "      responses:",
      "        '200':",
      "          description: OK",
    ].join("\n");
    const result = parseOpenApiDocument(yamlDoc);
    expect(result.rawFormat).toBe("YAML");
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0].path).toBe("/ping");
  });

  it("falls back to the document URL's origin when the spec declares no base URL", () => {
    const doc = JSON.stringify({
      openapi: "3.0.0",
      paths: { "/x": { get: { responses: { "200": { description: "OK" } } } } },
    });
    const result = parseOpenApiDocument(doc, "https://fetched-from.example.com/openapi.json");
    expect(result.baseUrl).toBe("https://fetched-from.example.com");
  });

  it("rejects a document with no openapi/swagger version field", () => {
    expect(() => parseOpenApiDocument(JSON.stringify({ paths: {} }))).toThrow(/NOT_OPENAPI/);
  });

  it("rejects a document with an unsupported OpenAPI major version", () => {
    const doc = JSON.stringify({
      openapi: "2.0.0",
      paths: { "/x": { get: { responses: {} } } },
    });
    expect(() => parseOpenApiDocument(doc)).toThrow(/UNSUPPORTED_SPEC_VERSION/);
  });

  it("rejects a document with no paths", () => {
    const doc = JSON.stringify({ openapi: "3.0.0", paths: {} });
    expect(() => parseOpenApiDocument(doc)).toThrow(/INVALID_SPEC/);
  });

  it("rejects a document with paths but no operations", () => {
    const doc = JSON.stringify({ openapi: "3.0.0", paths: { "/x": {} } });
    expect(() => parseOpenApiDocument(doc)).toThrow(/INVALID_SPEC/);
  });

  it("rejects text that isn't a JSON/YAML object", () => {
    expect(() => parseOpenApiDocument("just some plain text")).toThrow(/NOT_OPENAPI/);
  });
});
