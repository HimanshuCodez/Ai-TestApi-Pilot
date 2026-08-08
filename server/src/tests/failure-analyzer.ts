import pLimit from "p-limit";
import { prisma } from "../db.js";
import { aiProvider } from "../ai/index.js";
import { callAndValidate } from "../ai/validate.js";
import { failureAnalysisOutputSchema } from "../ai/schemas.js";
import { logger } from "../utils/logger.js";

const CONCURRENCY = 3;

export interface AnalyzeFailuresResult {
  analyzed: number;
}

/**
 * For every failed TestResult in a run, asks the AI to explain the failure
 * and turns the validated output into a persisted Finding. A single
 * endpoint's AI call failing never aborts the batch.
 */
export async function analyzeFailuresForRun(
  projectId: string,
  testRunId: string,
  onProgress: (processed: number, total: number) => Promise<void>
): Promise<AnalyzeFailuresResult> {
  const failedResults = await prisma.testResult.findMany({
    where: { testRunId, passed: false },
    include: { generatedTest: true },
  });

  if (failedResults.length === 0) return { analyzed: 0 };

  const limit = pLimit(CONCURRENCY);
  let processed = 0;
  let analyzed = 0;

  await Promise.all(
    failedResults.map((result) =>
      limit(async () => {
        const test = result.generatedTest;
        try {
          const output = await callAndValidate(
            () =>
              aiProvider.analyzeFailure({
                endpoint: { method: test.method, path: test.path },
                request: test.requestSpec,
                statusCode: result.statusCode,
                expected: test.expected,
                responseBody: result.responseBodyRedacted,
                errorMessage: result.errorMessage,
              }),
            failureAnalysisOutputSchema,
            `failure analysis (${test.method} ${test.path})`
          );

          await prisma.aIAnalysis.create({
            data: {
              projectId,
              endpointId: test.endpointId,
              kind: "failure",
              input: { testResultId: result.id, generatedTestId: test.id },
              output,
            },
          });

          await prisma.finding.create({
            data: {
              projectId,
              testResultId: result.id,
              severity: output.severity,
              title: test.title,
              category: test.category,
              endpoint: test.path,
              method: test.method,
              description: output.problem,
              recommendation: output.recommendation,
              confidence: output.confidence,
            },
          });

          analyzed += 1;
        } catch (err) {
          logger.warn("Skipping failure analysis after repeated failure", {
            testResultId: result.id,
            message: err instanceof Error ? err.message : String(err),
          });
        } finally {
          processed += 1;
          await onProgress(processed, failedResults.length);
        }
      })
    )
  );

  return { analyzed };
}
