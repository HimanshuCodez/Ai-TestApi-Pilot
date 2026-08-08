import { useEffect, useRef, useState } from "react";
import { apiUrl, getStoredToken } from "@/lib/api";
import { getJob } from "@/services/api/jobs";

export interface JobProgressState {
  status: "idle" | "queued" | "processing" | "completed" | "failed";
  stage: string;
  progress: number;
  error: string | null;
  resultRef: string | null;
}

const IDLE_STATE: JobProgressState = { status: "idle", stage: "", progress: 0, error: null, resultRef: null };

interface SseEvent {
  type: "progress" | "completed" | "failed";
  stage?: string;
  progress?: number;
  error?: string;
  resultRef?: string;
}

/**
 * Drives a job's live progress via SSE (GET /api/jobs/:id/events), falling
 * back to polling GET /api/jobs/:id if the stream errors out (proxies,
 * ad blockers, etc). `jobId` null/undefined means no job is running yet.
 */
export function useJobProgress(jobId: string | null | undefined, onSettled?: (state: JobProgressState) => void) {
  const [state, setState] = useState<JobProgressState>(IDLE_STATE);
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  useEffect(() => {
    if (!jobId) {
      setState(IDLE_STATE);
      return;
    }

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | undefined;
    setState({ status: "queued", stage: "QUEUED", progress: 0, error: null, resultRef: null });

    const token = getStoredToken();
    const source = new EventSource(apiUrl(`/jobs/${jobId}/events${token ? `?token=${encodeURIComponent(token)}` : ""}`));

    function settle(next: JobProgressState) {
      if (cancelled) return;
      setState(next);
      onSettledRef.current?.(next);
    }

    source.onmessage = (event) => {
      let data: SseEvent;
      try {
        data = JSON.parse(event.data) as SseEvent;
      } catch {
        return;
      }

      if (data.type === "progress") {
        setState((s) => ({ ...s, status: "processing", stage: data.stage ?? s.stage, progress: data.progress ?? s.progress }));
      } else if (data.type === "completed") {
        settle({ status: "completed", stage: data.stage ?? "COMPLETED", progress: 100, error: null, resultRef: data.resultRef ?? null });
        source.close();
      } else if (data.type === "failed") {
        settle({
          status: "failed",
          stage: data.stage ?? "FAILED",
          progress: 0,
          error: data.error ?? "Something went wrong. Please try again.",
          resultRef: null,
        });
        source.close();
      }
    };

    source.onerror = () => {
      source.close();

      const poll = async () => {
        if (cancelled) return;
        try {
          const job = await getJob(jobId);
          if (job.status === "completed" || job.status === "failed") {
            settle({
              status: job.status,
              stage: job.stage,
              progress: job.progress,
              error: job.error,
              resultRef: job.resultRef,
            });
            return;
          }
          setState({
            status: job.status === "queued" ? "queued" : "processing",
            stage: job.stage,
            progress: job.progress,
            error: null,
            resultRef: null,
          });
          pollTimer = setTimeout(poll, 2000);
        } catch {
          pollTimer = setTimeout(poll, 3000);
        }
      };
      void poll();
    };

    return () => {
      cancelled = true;
      source.close();
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [jobId]);

  return state;
}
