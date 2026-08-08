export type ScoringSeverity = "critical" | "high" | "medium" | "low";

export const SEVERITY_WEIGHT: Record<ScoringSeverity, number> = {
  critical: 30,
  high: 18,
  medium: 10,
  low: 4,
};

export interface ScoringInput {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationsMs: number[];
  totalEndpoints: number;
  coveredEndpointCount: number;
  findingSeverities: ScoringSeverity[];
}

export interface ScoringResult {
  healthScore: number;
  securityScore: number;
  coverageScore: number;
  performanceScore: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = clamp(Math.ceil((p / 100) * sorted.length) - 1, 0, sorted.length - 1);
  return sorted[index];
}

export function deriveProjectStatus(
  healthScore: number,
  total: number
): "scanning" | "healthy" | "warning" | "critical" {
  if (total === 0) return "scanning";
  if (healthScore >= 80) return "healthy";
  if (healthScore >= 50) return "warning";
  return "critical";
}

/**
 * Pure, deterministic score calculation from real test-run data — no AI
 * input ever reaches these numbers. Kept separate from report.service.ts
 * so it's testable without a database.
 */
export function computeScores(input: ScoringInput): ScoringResult {
  const sortedDurations = [...input.durationsMs].sort((a, b) => a - b);
  const avgDurationMs = sortedDurations.length
    ? Math.round(sortedDurations.reduce((sum, d) => sum + d, 0) / sortedDurations.length)
    : 0;

  const healthScore = input.total > 0 ? Math.round((input.passed / input.total) * 100) : 100;
  const coverageScore =
    input.totalEndpoints > 0 ? Math.round((input.coveredEndpointCount / input.totalEndpoints) * 100) : 0;
  const performanceScore = clamp(Math.round(100 - avgDurationMs / 50));
  const securityDeduction = input.findingSeverities.reduce((sum, s) => sum + SEVERITY_WEIGHT[s], 0);
  const securityScore = clamp(100 - securityDeduction);

  return {
    healthScore,
    securityScore,
    coverageScore,
    performanceScore,
    avgDurationMs,
    p50DurationMs: percentile(sortedDurations, 50),
    p95DurationMs: percentile(sortedDurations, 95),
  };
}
