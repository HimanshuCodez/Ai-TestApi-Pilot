import { Worker } from "bullmq";
import { redisConnection } from "../queue/connection.js";
import { QUEUE_NAMES } from "../queue/queues.js";
import { completeJob, failJob, updateJobProgress } from "../queue/job.service.js";
import { discoverFromFile, discoverFromUrl } from "../api/api-discovery.js";
import { toFriendlyConnectError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

interface AnalyzeUrlJobData {
  jobId: string;
  projectId: string;
  source: { kind: "URL"; url: string } | { kind: "FILE"; fileName: string; content: string };
}

export const analyzeUrlWorker = new Worker<AnalyzeUrlJobData>(
  QUEUE_NAMES.analyzeUrl,
  async (job) => {
    const { jobId, projectId, source } = job.data;

    try {
      const result =
        source.kind === "URL"
          ? await (async () => {
              await updateJobProgress(jobId, "CONNECTING", 10);
              await updateJobProgress(jobId, "FETCHING_SPEC", 30);
              const r = await discoverFromUrl(projectId, source.url);
              await updateJobProgress(jobId, "PARSING_API", 65);
              return r;
            })()
          : await (async () => {
              await updateJobProgress(jobId, "PARSING_API", 40);
              return discoverFromFile(projectId, source.fileName, source.content);
            })();

      await updateJobProgress(jobId, "DISCOVERING_ENDPOINTS", 85);
      await updateJobProgress(jobId, "ANALYZING_AUTH", 95);
      await completeJob(jobId, JSON.stringify(result));
    } catch (err) {
      const friendly = toFriendlyConnectError(err);
      logger.warn("analyze-url job failed", { jobId, projectId, error: friendly.message });
      await failJob(jobId, friendly.message);
    }
  },
  { connection: redisConnection, concurrency: 5 }
);

analyzeUrlWorker.on("error", (err) => logger.error("analyze-url worker error", { message: err.message }));
