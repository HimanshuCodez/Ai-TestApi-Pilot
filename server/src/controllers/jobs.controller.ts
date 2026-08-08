import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";
import { sseHub } from "../queue/sse.js";

const HEARTBEAT_MS = 15_000;

async function loadOwnedJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { project: true } });
  if (!job) throw new NotFoundError("Job not found");
  if (job.project.userId !== userId) throw new ForbiddenError();
  return job;
}

export async function getJob(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await loadOwnedJob(req.params.id, req.userId!);
    res.json({
      id: job.id,
      type: job.type,
      status: job.status,
      stage: job.stage,
      progress: job.progress,
      error: job.error,
      resultRef: job.resultRef,
    });
  } catch (err) {
    next(err);
  }
}

export async function streamJobEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await loadOwnedJob(req.params.id, req.userId!);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.write(
      `data: ${JSON.stringify({ type: "progress", stage: job.stage, progress: job.progress })}\n\n`
    );

    if (job.status === "completed" || job.status === "failed") {
      res.write(
        `data: ${JSON.stringify({
          type: job.status,
          stage: job.stage,
          progress: job.progress,
          error: job.error ?? undefined,
          resultRef: job.resultRef ?? undefined,
        })}\n\n`
      );
      res.end();
      return;
    }

    sseHub.subscribe(job.id, res);
    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), HEARTBEAT_MS);

    req.on("close", () => {
      clearInterval(heartbeat);
      sseHub.unsubscribe(job.id, res);
    });
  } catch (err) {
    next(err);
  }
}
