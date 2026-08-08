import { describe, it, expect, vi, afterEach } from "vitest";
import type { GeneratedTest } from "@prisma/client";

// executeTest() runs assertSafeUrl() before every request, which does a real DNS
// lookup — stub it to resolve to a public IP so these tests exercise fetch-handling
// logic without depending on the test environment's network/DNS availability.
vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]) },
}));

const { buildUrl, executeTest } = await import("./test-runner.js");

function makeTest(overrides: Partial<GeneratedTest> = {}): GeneratedTest {
  return {
    id: "test_1",
    projectId: "proj_1",
    endpointId: "endpoint_1",
    title: "Returns 200",
    description: "",
    category: "positive",
    method: "GET",
    path: "/pets/{id}",
    requestSpec: { headers: {}, pathParams: { id: "42" }, queryParams: {}, body: null },
    expected: { statusCodes: [200], notes: "" },
    severity: "low",
    createdAt: new Date(),
    ...overrides,
  } as GeneratedTest;
}

describe("buildUrl", () => {
  it("substitutes path params and appends query params", () => {
    const url = buildUrl("https://api.example.com", "/pets/{id}", { id: "42" }, { verbose: "true" });
    expect(url.toString()).toBe("https://api.example.com/pets/42?verbose=true");
  });

  it("normalizes a base URL with a trailing slash", () => {
    const url = buildUrl("https://api.example.com/", "/pets", {}, {});
    expect(url.toString()).toBe("https://api.example.com/pets");
  });

  it("adds a leading slash to a relative path", () => {
    const url = buildUrl("https://api.example.com", "pets", {}, {});
    expect(url.toString()).toBe("https://api.example.com/pets");
  });
});

describe("executeTest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes when the actual status matches an expected status code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 42 }), { status: 200, headers: { "content-type": "application/json" } })
      )
    );
    const result = await executeTest("https://api.example.com", makeTest());
    expect(result.passed).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.responseBodyRedacted).toEqual({ id: 42 });
  });

  it("fails when the actual status is not in the expected list", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
    const result = await executeTest("https://api.example.com", makeTest());
    expect(result.passed).toBe(false);
    expect(result.statusCode).toBe(500);
  });

  it("redacts sensitive fields in the stored response body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ token: "secret-abc", name: "ok" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        })
      )
    );
    const result = await executeTest("https://api.example.com", makeTest());
    expect(result.responseBodyRedacted).toEqual({ token: "[REDACTED]", name: "ok" });
  });

  it("captures a transport error as a failed result instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await executeTest("https://api.example.com", makeTest());
    expect(result.passed).toBe(false);
    expect(result.statusCode).toBeNull();
    expect(result.errorMessage).toContain("network down");
  });

  it("blocks requests whose base URL resolves to a private address, without ever calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const result = await executeTest("http://127.0.0.1:9999", makeTest());
    expect(result.passed).toBe(false);
    expect(result.errorMessage).toContain("SSRF_BLOCKED");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
