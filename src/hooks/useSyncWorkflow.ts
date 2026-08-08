import { useEffect } from "react";
import { getReport, getTestRun, listEndpoints, listTests } from "@/services/api/projects";
import { toWorkflowTestCase, useWorkflowStore, type RunResult } from "@/store/useWorkflowStore";
import type { RunStatus } from "@/types";

/**
 * Reconciles a project's local pipeline-progress state with what's actually
 * persisted server-side (endpoints, generated tests, the latest run/report),
 * so returning to a project you finished in an earlier session still shows
 * its real state instead of resetting to "not started".
 */
export function useSyncWorkflow(projectId: string | undefined) {
  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);
  const setTests = useWorkflowStore((s) => s.setTests);
  const applyRunResults = useWorkflowStore((s) => s.applyRunResults);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    (async () => {
      const endpoints = await listEndpoints(projectId).catch(() => []);
      if (cancelled) return;
      if (endpoints.length > 0) setWorkflow(projectId, { uploaded: true });

      const apiTests = await listTests(projectId).catch(() => []);
      if (cancelled || apiTests.length === 0) return;

      let reportData: Awaited<ReturnType<typeof getReport>> | null;
      try {
        reportData = await getReport(projectId);
      } catch {
        reportData = null;
      }
      if (cancelled) return;

      if (!reportData) {
        setTests(projectId, apiTests.map((t) => toWorkflowTestCase(t)));
        return;
      }

      const testRun = await getTestRun(projectId, reportData.report.testRunId).catch(() => null);
      if (cancelled) return;

      const resultsByTestId = new Map((testRun?.results ?? []).map((r) => [r.generatedTestId, r]));
      const tests = apiTests.map((t) => toWorkflowTestCase(t, resultsByTestId.get(t.id)));

      if (!testRun) {
        setTests(projectId, tests);
        return;
      }

      const durationMs = testRun.finishedAt
        ? new Date(testRun.finishedAt).getTime() - new Date(testRun.startedAt).getTime()
        : 0;
      const runResult: RunResult = {
        status: testRun.status as RunStatus,
        total: testRun.total,
        passed: testRun.passed,
        failed: testRun.failed,
        skipped: testRun.skipped,
        durationMs,
        finishedAt: testRun.finishedAt ?? new Date().toISOString(),
      };
      applyRunResults(projectId, tests, runResult);
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, setWorkflow, setTests, applyRunResults]);
}
