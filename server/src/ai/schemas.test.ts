import { describe, it, expect } from "vitest";
import { testGenerationOutputSchema, failureAnalysisOutputSchema, endpointAnalysisOutputSchema } from "./schemas.js";

describe("testGenerationOutputSchema", () => {
  it("accepts a well-formed AI response", () => {
    const result = testGenerationOutputSchema.safeParse({
      tests: [
        {
          title: "Returns 200 for valid request",
          category: "positive",
          method: "GET",
          path: "/pets/1",
          request: {},
          expected: { statusCodes: [200] },
          severity: "low",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a response with no tests", () => {
    expect(testGenerationOutputSchema.safeParse({ tests: [] }).success).toBe(false);
  });

  it("rejects garbage AI output that doesn't match the shape at all", () => {
    expect(testGenerationOutputSchema.safeParse({ hello: "world" }).success).toBe(false);
  });

  it("rejects an invalid category enum value", () => {
    const result = testGenerationOutputSchema.safeParse({
      tests: [
        {
          title: "x",
          category: "not-a-real-category",
          method: "GET",
          path: "/x",
          expected: { statusCodes: [200] },
          severity: "low",
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing statusCodes array", () => {
    const result = testGenerationOutputSchema.safeParse({
      tests: [{ title: "x", category: "positive", method: "GET", path: "/x", expected: {}, severity: "low" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("failureAnalysisOutputSchema", () => {
  it("accepts a well-formed failure analysis", () => {
    const result = failureAnalysisOutputSchema.safeParse({
      severity: "high",
      problem: "Returned 500 instead of 200",
      probableCause: "Unhandled null field",
      recommendation: "Add a null check",
      confidence: 0.8,
    });
    expect(result.success).toBe(true);
  });

  it("rejects confidence outside the 0-1 range", () => {
    const result = failureAnalysisOutputSchema.safeParse({
      severity: "high",
      problem: "x",
      probableCause: "y",
      recommendation: "z",
      confidence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty problem string", () => {
    const result = failureAnalysisOutputSchema.safeParse({
      severity: "high",
      problem: "",
      probableCause: "y",
      recommendation: "z",
      confidence: 0.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("endpointAnalysisOutputSchema", () => {
  it("defaults missing optional fields instead of failing", () => {
    const result = endpointAnalysisOutputSchema.parse({});
    expect(result).toEqual({ riskFlags: [], qualityNotes: [], summary: "", riskLevel: "low" });
  });

  it("rejects an invalid riskLevel value", () => {
    expect(endpointAnalysisOutputSchema.safeParse({ riskLevel: "extreme" }).success).toBe(false);
  });
});
