import { app } from "./app.js";
import { env } from "./env.js";
import { logger } from "./utils/logger.js";
import { prisma } from "./db.js";
import { redisConnection } from "./queue/connection.js";
import { analyzeUrlWorker } from "./jobs/analyze-url.job.js";
import { analyzeEndpointsWorker } from "./jobs/analyze-endpoints.job.js";
import { generateTestsWorker } from "./jobs/generate-tests.job.js";
import { runTestsWorker } from "./jobs/run-tests.job.js";

// V1 runs the API and every BullMQ worker in a single process — importing
// them here starts them listening. Split into a separate worker
// entrypoint later without touching route code if scaling demands it.
const workers = [analyzeUrlWorker, analyzeEndpointsWorker, generateTestsWorker, runTestsWorker];

const server = app.listen(env.PORT, "0.0.0.0", () => {
  logger.info(`TestPilot API listening on port ${env.PORT}`);
});

async function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close();
  await Promise.all(workers.map((w) => w.close()));
  await prisma.$disconnect();
  redisConnection.disconnect();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
