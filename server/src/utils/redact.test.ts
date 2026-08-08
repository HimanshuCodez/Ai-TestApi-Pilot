import { describe, it, expect } from "vitest";
import { redactHeaders, redactBody } from "./redact.js";

describe("redactHeaders", () => {
  it("redacts sensitive header names case-insensitively", () => {
    const result = redactHeaders({
      Authorization: "Bearer abc",
      "X-Api-Key": "secret",
      "content-type": "application/json",
    });
    expect(result.Authorization).toBe("[REDACTED]");
    expect(result["X-Api-Key"]).toBe("[REDACTED]");
    expect(result["content-type"]).toBe("application/json");
  });

  it("leaves non-sensitive headers untouched", () => {
    const result = redactHeaders({ "x-request-id": "abc-123" });
    expect(result["x-request-id"]).toBe("abc-123");
  });
});

describe("redactBody", () => {
  it("redacts keys matching sensitive patterns at any depth", () => {
    const result = redactBody({
      user: {
        password: "hunter2",
        token: "abc",
        profile: { apiKey: "xyz", name: "Jane" },
      },
    });
    expect(result).toEqual({
      user: {
        password: "[REDACTED]",
        token: "[REDACTED]",
        profile: { apiKey: "[REDACTED]", name: "Jane" },
      },
    });
  });

  it("redacts values inside arrays", () => {
    const result = redactBody([{ secret: "a" }, { name: "ok" }]);
    expect(result).toEqual([{ secret: "[REDACTED]" }, { name: "ok" }]);
  });

  it("passes through primitives and null unchanged", () => {
    expect(redactBody("hello")).toBe("hello");
    expect(redactBody(42)).toBe(42);
    expect(redactBody(null)).toBe(null);
  });

  it("does not redact keys that merely contain a similar-looking substring safely", () => {
    const result = redactBody({ id: 1, name: "ok" }) as Record<string, unknown>;
    expect(result).toEqual({ id: 1, name: "ok" });
  });
});
