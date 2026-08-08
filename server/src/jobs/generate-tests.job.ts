import { Worker } from "bullmq";
import { redisConnection } from "../queue/connection.js";
import { QUEUE_NAMES } from "../queue/queues.js";
import { completeJob, failJob, updateJobProgress } from "../queue/job.service.js";
import { generateTestsForProject } from "../tests/test-generator.js";
import { logger } from "../utils/logger.js";

interface GenerateTestsJobData {
  jobId: string;
  projectId: string;
  endpointIds?: string[];
}

export const generateTestsWorker = new Worker<GenerateTestsJobData>(
  QUEUE_NAMES.generateTests,
  async (job) => {
    const { jobId, projectId, endpointIds } = job.data;

    try {
      await updateJobProgress(jobId, "GENERATING_TESTS", 0);

      const result = await generateTestsForProject(projectId, endpointIds, async (processed, total) => {
        await updateJobProgress(jobId, "GENERATING_TESTS", Math.round((processed / total) * 100));
      });

      await completeJob(jobId, JSON.stringify(result));
    } catch (err) {
      logger.error("generate-tests job failed", {
        jobId,
        projectId,
        message: err instanceof Error ? err.message : String(err),
      });
      await failJob(jobId, "TestPilot couldn't generate tests for this project. Please try again.");
    }
  },
  { connection: redisConnection, concurrency: 2 }
);

generateTestsWorker.on("error", (err) => logger.error("generate-tests worker error", { message: err.message }));
