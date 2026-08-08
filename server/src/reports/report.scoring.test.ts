import { describe, it, expect } from "vitest";
import { computeScores, deriveProjectStatus, percentile, type ScoringSeverity } from "./report.scoring.js";

describe("computeScores", () => {
  it("scores a fully-passing run with full coverage and no findings as perfect", () => {
    const result = computeScores({
      total: 10,
      passed: 10,
      failed: 0,
      skipped: 0,
      durationsMs: [100, 100, 100],
      totalEndpoints: 5,
      coveredEndpointCount: 5,
      findingSeverities: [],
    });
    expect(result.healthScore).toBe(100);
    expect(result.coverageScore).toBe(100);
    expect(result.securityScore).toBe(100);
  });

  it("computes healthScore as the pass rate", () => {
    const result = computeScores({
      total: 4,
      passed: 3,
      failed: 1,
      skipped: 0,
      durationsMs: [],
      totalEndpoints: 0,
      coveredEndpointCount: 0,
      findingSeverities: [],
    });
    expect(result.healthScore).toBe(75);
  });

  it("deducts security score by finding severity, clamped at 0", () => {
    const severities: ScoringSeverity[] = ["critical", "critical", "critical", "critical"];
    const result = computeScores({
      total: 1,
      passed: 0,
      failed: 1,
      skipped: 0,
      durationsMs: [],
      totalEndpoints: 1,
      coveredEndpointCount: 1,
      findingSeverities: severities,
    });
    expect(result.securityScore).toBe(0);
  });

  it("gives a full health score when no tests have run yet, but zero coverage", () => {
    const result = computeScores({
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationsMs: [],
      totalEndpoints: 3,
      coveredEndpointCount: 0,
      findingSeverities: [],
    });
    expect(result.healthScore).toBe(100);
    expect(result.coverageScore).toBe(0);
  });

  it("degrades performanceScore as average latency increases", () => {
    const fast = computeScores({
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      durationsMs: [50],
      totalEndpoints: 0,
      coveredEndpointCount: 0,
      findingSeverities: [],
    });
    const slow = computeScores({
      total: 1,
      passed: 1,
      failed: 0,
      skipped: 0,
      durationsMs: [8000],
      totalEndpoints: 0,
      coveredEndpointCount: 0,
      findingSeverities: [],
    });
    expect(fast.performanceScore).toBeGreaterThan(slow.performanceScore);
    expect(slow.performanceScore).toBe(0);
  });

  it("is deterministic for identical input — never varies run to run", () => {
    const input = {
      total: 8,
      passed: 5,
      failed: 3,
      skipped: 0,
      durationsMs: [50, 900, 220, 4000],
      totalEndpoints: 6,
      coveredEndpointCount: 4,
      findingSeverities: ["high", "low"] as ScoringSeverity[],
    };
    expect(computeScores({ ...input })).toEqual(computeScores({ ...input }));
  });
});

describe("percentile", () => {
  it("returns 0 for an empty array", () => {
    expect(percentile([], 95)).toBe(0);
  });

  it("returns the max value for p100", () => {
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
  });

  it("returns the median for p50 on an odd-length array", () => {
    expect(percentile([10, 20, 30], 50)).toBe(20);
  });
});

describe("deriveProjectStatus", () => {
  it("returns scanning when no tests have run", () => {
    expect(deriveProjectStatus(0, 0)).toBe("scanning");
  });
  it("returns healthy at or above 80", () => {
    expect(deriveProjectStatus(80, 10)).toBe("healthy");
  });
  it("returns warning between 50 and 79", () => {
    expect(deriveProjectStatus(60, 10)).toBe("warning");
  });
  it("returns critical below 50", () => {
    expect(deriveProjectStatus(20, 10)).toBe("critical");
  });
});
