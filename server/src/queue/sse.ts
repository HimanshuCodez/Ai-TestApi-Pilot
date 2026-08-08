import type { Response } from "express";

export interface JobSseEvent {
  type: "progress" | "completed" | "failed";
  stage?: string;
  progress?: number;
  error?: string;
  resultRef?: string;
}

/**
 * In-memory SSE fan-out, keyed by jobId. V1 runs the API and BullMQ workers
 * in a single process, so this is sufficient — no cross-process pubsub
 * needed. If the API is ever split from the worker, this becomes a Redis
 * pubsub subscriber instead.
 */
const subscribers = new Map<string, Set<Response>>();

function write(res: Response, event: JobSseEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export const sseHub = {
  subscribe(jobId: string, res: Response) {
    let set = subscribers.get(jobId);
    if (!set) {
      set = new Set();
      subscribers.set(jobId, set);
    }
    set.add(res);
  },

  unsubscribe(jobId: string, res: Response) {
    const set = subscribers.get(jobId);
    if (!set) return;
    set.delete(res);
    if (set.size === 0) subscribers.delete(jobId);
  },

  publish(jobId: string, event: JobSseEvent) {
    const set = subscribers.get(jobId);
    if (!set) return;
    for (const res of set) write(res, event);
  },

  /** Sends a final event to all subscribers and closes their connections. */
  closeWith(jobId: string, event: JobSseEvent) {
    const set = subscribers.get(jobId);
    if (!set) return;
    for (const res of set) {
      write(res, event);
      res.end();
    }
    subscribers.delete(jobId);
  },
};
