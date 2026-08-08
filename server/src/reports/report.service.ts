import { prisma } from "../db.js";
import { aiProvider } from "../ai/index.js";
import { callAndValidate } from "../ai/validate.js";
import { reportInsightsOutputSchema } from "../ai/schemas.js";
import { logger } from "../utils/logger.js";
import { computeScores, deriveProjectStatus, SEVERITY_WEIGHT, type ScoringSeverity } from "./report.scoring.js";

/**
 * All scores here are computed deterministically from real TestResult /
 * Finding rows — the AI only ever contributes qualitative `aiInsights`
 * commentary alongside them, never the numbers themselves.
 */
export async function generateReportForProject(projectId: string, testRunId: string) {
  const [project, testRun, testResults, findings] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    prisma.testRun.findUniqueOrThrow({ where: { id: testRunId } }),
    prisma.testResult.findMany({ where: { testRunId }, include: { generatedTest: true } }),
    prisma.finding.findMany({ where: { testResult: { testRunId } } }),
  ]);

  const totalEndpoints = await prisma.endpoint.count({ where: { projectId } });
  const coveredEndpointIds = new Set(testResults.map((r) => r.generatedTest.endpointId));
  const durationsMs = testResults.map((r) => r.durationMs).filter((d): d is number => typeof d === "number");

  const scores = computeScores({
    total: testRun.total,
    passed: testRun.passed,
    failed: testRun.failed,
    skipped: testRun.skipped,
    durationsMs,
    totalEndpoints,
    coveredEndpointCount: coveredEndpointIds.size,
    findingSeverities: findings.map((f) => f.severity as ScoringSeverity),
  });

  const findingsBySeverity = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1;
    return acc;
  }, {});

  const metrics = {
    total: testRun.total,
    passed: testRun.passed,
    failed: testRun.failed,
    skipped: testRun.skipped,
    avgDurationMs: scores.avgDurationMs,
    p50DurationMs: scores.p50DurationMs,
    p95DurationMs: scores.p95DurationMs,
    endpointsCovered: coveredEndpointIds.size,
    totalEndpoints,
    findingsBySeverity,
  };

  let aiInsights: unknown = null;
  try {
    const topFindings = [...findings]
      .sort((a, b) => SEVERITY_WEIGHT[b.severity as ScoringSeverity] - SEVERITY_WEIGHT[a.severity as ScoringSeverity])
      .slice(0, 5)
      .map((f) => ({ severity: f.severity, title: f.title, category: f.category }));

    aiInsights = await callAndValidate(
      () =>
        aiProvider.generateReportInsights({
          projectName: project.name,
          totals: { total: testRun.total, passed: testRun.passed, failed: testRun.failed, skipped: testRun.skipped },
          topFindings,
          scores,
        }),
      reportInsightsOutputSchema,
      "report insights"
    );
  } catch (err) {
    logger.warn("Skipping AI report insights after repeated failure", {
      projectId,
      message: err instanceof Error ? err.message : String(err),
    });
  }

  const report = await prisma.report.create({
    data: {
      projectId,
      testRunId,
      healthScore: scores.healthScore,
      securityScore: scores.securityScore,
      coverageScore: scores.coverageScore,
      performanceScore: scores.performanceScore,
      metrics,
      aiInsights: aiInsights ?? undefined,
    },
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      healthScore: scores.healthScore,
      securityScore: scores.securityScore,
      status: deriveProjectStatus(scores.healthScore, testRun.total),
    },
  });

  return report;
}
