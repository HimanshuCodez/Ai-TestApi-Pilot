import { Queue } from "bullmq";
import { redisConnection } from "./connection.js";

export const QUEUE_NAMES = {
  analyzeUrl: "analyze-url",
  analyzeEndpoints: "analyze-endpoints",
  generateTests: "generate-tests",
  runTests: "run-tests",
} as const;

const defaultJobOptions = {
  attempts: 1,
  removeOnComplete: { age: 60 * 60 * 24, count: 500 },
  removeOnFail: { age: 60 * 60 * 24 * 7 },
};

export const analyzeUrlQueue = new Queue(QUEUE_NAMES.analyzeUrl, {
  connection: redisConnection,
  defaultJobOptions,
});
export const analyzeEndpointsQueue = new Queue(QUEUE_NAMES.analyzeEndpoints, {
  connection: redisConnection,
  defaultJobOptions,
});
export const generateTestsQueue = new Queue(QUEUE_NAMES.generateTests, {
  connection: redisConnection,
  defaultJobOptions,
});
export const runTestsQueue = new Queue(QUEUE_NAMES.runTests, {
  connection: redisConnection,
  defaultJobOptions,
});
