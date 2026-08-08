import type { JobType } from "@prisma/client";
import { prisma } from "../db.js";
import { sseHub } from "./sse.js";

/**
 * The Postgres `Job` row is the source of truth for both SSE and the
 * `GET /jobs/:id` polling fallback — BullMQ is only the execution engine.
 */
export async function createJob(projectId: string, type: JobType) {
  return prisma.job.create({
    data: { projectId, type, status: "queued", stage: "QUEUED", progress: 0 },
  });
}

export async function updateJobProgress(jobId: string, stage: string, progress: number) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "processing", stage, progress },
  });
  sseHub.publish(jobId, { type: "progress", stage, progress });
  return job;
}

export async function completeJob(jobId: string, resultRef?: string) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "completed", stage: "COMPLETED", progress: 100, resultRef },
  });
  sseHub.closeWith(jobId, { type: "completed", stage: "COMPLETED", progress: 100, resultRef });
  return job;
}

export async function failJob(jobId: string, friendlyError: string) {
  const job = await prisma.job.update({
    where: { id: jobId },
    data: { status: "failed", error: friendlyError },
  });
  sseHub.closeWith(jobId, { type: "failed", stage: job.stage, error: friendlyError });
  return job;
}
