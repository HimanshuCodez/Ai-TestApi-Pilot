import { Worker } from "bullmq";
import { redisConnection } from "../queue/connection.js";
import { QUEUE_NAMES } from "../queue/queues.js";
import { completeJob, failJob, updateJobProgress } from "../queue/job.service.js";
import { runTestsForProject } from "../tests/test-runner.js";
import { analyzeFailuresForRun } from "../tests/failure-analyzer.js";
import { generateReportForProject } from "../reports/report.service.js";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

interface RunTestsJobData {
  jobId: string;
  projectId: string;
  testIds?: string[];
}

export const runTestsWorker = new Worker<RunTestsJobData>(
  QUEUE_NAMES.runTests,
  async (job) => {
    const { jobId, projectId, testIds } = job.data;

    try {
      await updateJobProgress(jobId, "RUNNING_TESTS", 0);
      const runResult = await runTestsForProject(projectId, testIds, async (processed, total) => {
        await updateJobProgress(jobId, "RUNNING_TESTS", Math.round((processed / total) * 90));
      });

      await updateJobProgress(jobId, "ANALYZING_FAILURES", 90);
      await analyzeFailuresForRun(projectId, runResult.testRunId, async (processed, total) => {
        const stageProgress = total > 0 ? Math.round((processed / total) * 5) : 5;
        await updateJobProgress(jobId, "ANALYZING_FAILURES", 90 + stageProgress);
      });

      await updateJobProgress(jobId, "GENERATING_REPORT", 95);
      const report = await generateReportForProject(projectId, runResult.testRunId);

      await completeJob(jobId, JSON.stringify({ ...runResult, reportId: report.id }));
    } catch (err) {
      const friendly =
        err instanceof AppError
          ? err.message
          : "TestPilot couldn't finish running tests for this project. Please try again.";
      logger.error("run-tests job failed", {
        jobId,
        projectId,
        message: err instanceof Error ? err.message : String(err),
      });
      await failJob(jobId, friendly);
    }
  },
  { connection: redisConnection, concurrency: 2 }
);

runTestsWorker.on("error", (err) => logger.error("run-tests worker error", { message: err.message }));
