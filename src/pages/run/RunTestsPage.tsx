import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, CheckCircle2, Play, RotateCcw, Sparkles, TerminalSquare, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { RunStatusPill } from "@/components/shared/StatusPill";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useWorkflowStore, toWorkflowTestCase, type RunResult } from "@/store/useWorkflowStore";
import { useJobProgress } from "@/hooks/useJobProgress";
import { getTestRun, runTests } from "@/services/api/projects";
import { ApiError } from "@/lib/api";
import type { RunStatus } from "@/types";
import { cn } from "@/lib/utils";

type Phase = "idle" | "running" | "done";

interface LogLine {
  id: string;
  text: string;
  kind: "command" | "info" | "success" | "live";
}

function buildPreamble(total: number, baseUrl: string): LogLine[] {
  return [
    { id: "cmd", text: `$ testpilot run --project ${baseUrl}`, kind: "command" },
    { id: "init-1", text: `Initializing test runner...`, kind: "info" },
    { id: "init-2", text: `Loaded ${total} test cases across the mapped endpoint surface`, kind: "info" },
    { id: "init-3", text: `Connecting to ${baseUrl} ...`, kind: "info" },
    { id: "init-4", text: `Connection established. Starting run.`, kind: "success" },
  ];
}

const LINE_STYLE: Record<LogLine["kind"], string> = {
  command: "text-foreground font-medium",
  info: "text-muted-foreground",
  success: "text-success",
  live: "text-primary",
};

export default function RunTestsPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const workflow = useWorkflowStore((s) => s.getWorkflow(projectId));
  const applyRunResults = useWorkflowStore((s) => s.applyRunResults);

  const [phase, setPhase] = useState<Phase>(workflow.testsRun ? "done" : "idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPhase(workflow.testsRun ? "done" : "idle");
    setJobId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const tests = workflow.tests;
  const preamble = useMemo(() => buildPreamble(tests.length, project?.baseUrl ?? "api"), [tests.length, project?.baseUrl]);

  const jobProgress = useJobProgress(jobId, async (finalState) => {
    if (finalState.status === "completed") {
      try {
        let ref: { testRunId?: string } = {};
        try {
          ref = finalState.resultRef ? JSON.parse(finalState.resultRef) : {};
        } catch {
          // ignore — testRunId stays undefined and we fall through to a friendly error
        }
        if (!ref.testRunId) throw new Error("Missing test run reference");

        const testRun = await getTestRun(projectId, ref.testRunId);
        const mergedTests = (testRun.results ?? [])
          .filter((r) => r.generatedTest)
          .map((r) => toWorkflowTestCase(r.generatedTest!, r));

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
        applyRunResults(projectId, mergedTests, runResult);
        setPhase("done");
      } catch {
        toast.error("Run finished, but results couldn't be loaded. Try refreshing.");
        setPhase("idle");
      }
      setJobId(null);
    } else if (finalState.status === "failed") {
      toast.error("Test run failed", { description: finalState.error ?? "Please try again." });
      setPhase("idle");
      setJobId(null);
    }
  });

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [jobProgress.progress]);

  if (!project) return <Navigate to="/app/projects" replace />;

  if (!workflow.testsGenerated) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow={project.name} title="Run Tests" description="Execute your AI-generated suite in real time." />
        <EmptyState
          icon={Sparkles}
          title="Generate tests first"
          description="TestPilot AI needs a test suite before it can run one."
          actionLabel="Go to Generate Tests"
          onAction={() => navigate(`/app/projects/${projectId}/tests`)}
        />
      </div>
    );
  }

  async function startRun() {
    setPhase("running");
    try {
      const { jobId: newJobId } = await runTests(projectId);
      setJobId(newJobId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't start the test run. Please try again.";
      toast.error("Run failed to start", { description: message });
      setPhase("idle");
    }
  }

  const completedCount = Math.min(tests.length, Math.round((jobProgress.progress / 100) * tests.length));
  const progressPct = jobProgress.progress;

  const liveLines: LogLine[] = [
    ...preamble,
    { id: "live", text: `RUNNING  ${completedCount}/${tests.length} tests executed...`, kind: "live" },
  ];

  const finalPassed = workflow.runResult?.passed ?? 0;
  const finalFailed = workflow.runResult?.failed ?? 0;
  const finalTotal = workflow.runResult?.total ?? tests.length;
  const finalPassRate = finalTotal ? Math.round((finalPassed / finalTotal) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={project.name}
        title="Run Tests"
        description="Watch TestPilot AI execute every generated test against your live API surface."
        actions={
          phase === "done" ? (
            <Button variant="outline" onClick={startRun}>
              <RotateCcw className="size-4" /> Run Again
            </Button>
          ) : undefined
        }
      />

      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="glow-border relative items-center overflow-hidden py-16 text-center">
              <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative mb-5 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent/10"
              >
                <div className="absolute inset-0 animate-glow-pulse rounded-2xl bg-primary/25 blur-xl" />
                <TerminalSquare className="relative size-7 text-primary" />
              </motion.div>
              <h3 className="relative text-lg font-semibold text-foreground">Ready to run {tests.length} tests</h3>
              <p className="relative mt-1.5 max-w-md text-sm text-muted-foreground">
                TestPilot AI will stream live progress as each request hits {project.baseUrl}.
              </p>
              <Button size="lg" className="relative mt-6" onClick={startRun}>
                <Play className="size-4" /> Run Test Suite
              </Button>
            </Card>
          </motion.div>
        )}

        {phase === "running" && (
          <motion.div key="running" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <LiveStat label="Total" value={tests.length} />
              <LiveStat label="Completed" value={completedCount} accent="text-primary" />
              <LiveStat label="Progress" value={`${progressPct}%`} />
              <LiveStat label="Stage" value={jobProgress.stage || "QUEUED"} />
            </div>

            <Card className="gap-2 py-4">
              <div className="flex items-center justify-between px-5 text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="tabular-nums">{progressPct}%</span>
              </div>
              <div className="px-5">
                <Progress value={progressPct} />
              </div>
            </Card>

            <Card className="gap-0 overflow-hidden py-0">
              <div className="flex items-center gap-2 border-b border-white/[0.06] px-5 py-3">
                <span className="size-2.5 rounded-full bg-critical/70" />
                <span className="size-2.5 rounded-full bg-warning/70" />
                <span className="size-2.5 rounded-full bg-success/70" />
                <span className="ml-2 font-mono text-xs text-muted-foreground">testpilot — live run</span>
              </div>
              <div ref={logRef} className="scrollbar-none max-h-[420px] space-y-1 overflow-y-auto p-5 font-mono text-[12.5px] leading-relaxed">
                {liveLines.map((line) => (
                  <motion.div
                    key={line.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    className={LINE_STYLE[line.kind]}
                  >
                    {line.text}
                  </motion.div>
                ))}
                <motion.span
                  className="inline-block h-3.5 w-1.5 bg-primary/70"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
                />
              </div>
            </Card>

            <div className="flex flex-wrap gap-1.5">
              {tests.map((t, i) => (
                <span
                  key={t.id}
                  className={cn(
                    "size-2.5 rounded-[3px] transition-colors duration-200",
                    i < completedCount ? "bg-primary" : "bg-white/10"
                  )}
                  title={`${t.method} ${t.path}`}
                />
              ))}
            </div>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="items-center overflow-hidden py-10 text-center">
              <div
                className={cn(
                  "flex size-16 items-center justify-center rounded-2xl",
                  finalFailed > 0 ? "bg-critical/15 text-critical" : "bg-success/15 text-success"
                )}
              >
                {finalFailed > 0 ? <XCircle className="size-8" /> : <CheckCircle2 className="size-8" />}
              </div>
              <h3 className="mt-4 text-xl font-bold text-foreground">Run complete — {finalPassRate}% passed</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {finalPassed} of {finalTotal} tests passed
                {workflow.runResult ? ` in ${(workflow.runResult.durationMs / 1000).toFixed(1)}s` : ""}.
              </p>
              <div className="mt-3">
                <RunStatusPill status={finalFailed > 0 ? "failed" : "passed"} />
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <LiveStat label="Total" value={finalTotal} />
              <LiveStat label="Passed" value={finalPassed} accent="text-success" />
              <LiveStat label="Failed" value={finalFailed} accent="text-critical" />
              <LiveStat label="Pass Rate" value={`${finalPassRate}%`} accent={finalFailed > 0 ? "text-warning" : "text-success"} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {tests.map((t) => (
                <span
                  key={t.id}
                  className={cn("size-2.5 rounded-[3px]", t.status === "failed" ? "bg-critical" : "bg-success")}
                  title={`${t.method} ${t.path}`}
                />
              ))}
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={() => navigate(`/app/projects/${projectId}/reports`)}>
                <BarChart3 className="size-4" /> View AI Report
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveStat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <Card className="gap-1 py-5">
      <div className="px-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn("mt-1.5 text-2xl font-bold tabular-nums text-foreground", accent)}>{value}</p>
      </div>
    </Card>
  );
}
