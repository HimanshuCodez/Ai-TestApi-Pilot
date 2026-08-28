import pLimit from "p-limit";
import { prisma } from "../db.js";
import { aiProvider } from "../ai/index.js";
import { callAndValidate } from "../ai/validate.js";
import { testGenerationOutputSchema } from "../ai/schemas.js";
import { logger } from "../utils/logger.js";
import { AppError } from "../utils/errors.js";

const CONCURRENCY = 3;

export interface GenerateTestsResult {
  endpointsProcessed: number;
  testsGenerated: number;
}

export async function generateTestsForProject(
  projectId: string,
  endpointIds: string[] | undefined,
  onProgress: (processed: number, total: number) => Promise<void>
): Promise<GenerateTestsResult> {
  const [project, apiSource, endpoints] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId } }),
    prisma.apiSource.findUnique({ where: { projectId } }),
    prisma.endpoint.findMany({
      where: { projectId, ...(endpointIds && endpointIds.length ? { id: { in: endpointIds } } : {}) },
    }),
  ]);

  if (endpoints.length === 0) return { endpointsProcessed: 0, testsGenerated: 0 };

  const limit = pLimit(CONCURRENCY);
  let processed = 0;
  let generated = 0;
  let failures = 0;

  await Promise.all(
    endpoints.map((endpoint) =>
      limit(async () => {
        try {
          const output = await callAndValidate(
            () =>
              aiProvider.generateTestCases({
                projectName: project.name,
                baseUrl: project.baseUrl,
                authSchemes: apiSource?.authSchemes ?? [],
                endpoint: {
                  method: endpoint.method,
                  path: endpoint.path,
                  summary: endpoint.summary,
                  tag: endpoint.tag,
                  authRequired: endpoint.authRequired,
                  parameters: endpoint.parameters,
                  requestBodySchema: endpoint.requestBodySchema,
                  responses: endpoint.responses,
                },
              }),
            testGenerationOutputSchema,
            `test generation (${endpoint.method} ${endpoint.path})`
          );

          await prisma.$transaction([
            prisma.generatedTest.deleteMany({ where: { endpointId: endpoint.id } }),
            prisma.generatedTest.createMany({
              data: output.tests.map((t) => ({
                projectId,
                endpointId: endpoint.id,
                title: t.title,
                description: t.description,
                category: t.category,
                method: t.method,
                path: t.path,
                requestSpec: t.request as unknown as object,
                expected: t.expected as unknown as object,
                severity: t.severity,
              })),
            }),
          ]);

          generated += output.tests.length;
        } catch (err) {
          failures += 1;
          logger.warn("Skipping test generation after repeated failure", {
            endpointId: endpoint.id,
            message: err instanceof Error ? err.message : String(err),
          });
        } finally {
          processed += 1;
          await onProgress(processed, endpoints.length);
        }
      })
    )
  );

  if (generated === 0 && failures > 0) {
    throw new AppError(
      "TestPilot's AI couldn't generate any tests for this project. This usually means the AI provider is unreachable or misconfigured — please try again shortly.",
      502,
      "AI_GENERATION_FAILED"
    );
  }

  return { endpointsProcessed: processed, testsGenerated: generated };
}
