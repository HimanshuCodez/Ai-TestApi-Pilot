import { Worker } from "bullmq";
import pLimit from "p-limit";
import { redisConnection } from "../queue/connection.js";
import { QUEUE_NAMES } from "../queue/queues.js";
import { completeJob, failJob, updateJobProgress } from "../queue/job.service.js";
import { prisma } from "../db.js";
import { aiProvider } from "../ai/index.js";
import { callAndValidate } from "../ai/validate.js";
import { endpointAnalysisOutputSchema } from "../ai/schemas.js";
import { logger } from "../utils/logger.js";

interface AnalyzeEndpointsJobData {
  jobId: string;
  projectId: string;
}

const CONCURRENCY = 3;

export const analyzeEndpointsWorker = new Worker<AnalyzeEndpointsJobData>(
  QUEUE_NAMES.analyzeEndpoints,
  async (job) => {
    const { jobId, projectId } = job.data;

    try {
      const endpoints = await prisma.endpoint.findMany({ where: { projectId } });
      if (endpoints.length === 0) {
        await completeJob(jobId, JSON.stringify({ analyzed: 0, flagged: 0 }));
        return;
      }

      await updateJobProgress(jobId, "ANALYZING_ENDPOINTS", 0);

      let processed = 0;
      let flagged = 0;
      const limit = pLimit(CONCURRENCY);

      await Promise.all(
        endpoints.map((endpoint) =>
          limit(async () => {
            const input = {
              method: endpoint.method,
              path: endpoint.path,
              summary: endpoint.summary,
              tag: endpoint.tag,
              authRequired: endpoint.authRequired,
              parameters: endpoint.parameters,
              requestBodySchema: endpoint.requestBodySchema,
              responses: endpoint.responses,
            };

            try {
              const output = await callAndValidate(
                () => aiProvider.analyzeEndpoint(input),
                endpointAnalysisOutputSchema,
                `endpoint analysis (${endpoint.method} ${endpoint.path})`
              );

              await prisma.aIAnalysis.create({
                data: {
                  projectId,
                  endpointId: endpoint.id,
                  kind: "endpoint_quality",
                  input,
                  output,
                },
              });

              if (output.riskLevel !== "low" || output.riskFlags.length > 0) flagged += 1;
            } catch (err) {
              logger.warn("Skipping endpoint analysis after repeated failure", {
                endpointId: endpoint.id,
                message: err instanceof Error ? err.message : String(err),
              });
            } finally {
              processed += 1;
              await updateJobProgress(
                jobId,
                "ANALYZING_ENDPOINTS",
                Math.round((processed / endpoints.length) * 100)
              );
            }
          })
        )
      );

      await completeJob(jobId, JSON.stringify({ analyzed: processed, flagged }));
    } catch (err) {
      logger.error("analyze-endpoints job failed", {
        jobId,
        projectId,
        message: err instanceof Error ? err.message : String(err),
      });
      await failJob(jobId, "TestPilot couldn't complete AI analysis for this project. Please try again.");
    }
  },
  { connection: redisConnection, concurrency: 2 }
);

analyzeEndpointsWorker.on("error", (err) =>
  logger.error("analyze-endpoints worker error", { message: err.message })
);
