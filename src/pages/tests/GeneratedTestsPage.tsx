import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Braces,
  ChevronDown,
  Copy,
  FlaskConical,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Sparkles,
  TerminalSquare,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { MethodBadge } from "@/components/shared/MethodBadge";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useWorkflowStore, toWorkflowTestCase } from "@/store/useWorkflowStore";
import { useJobProgress } from "@/hooks/useJobProgress";
import { generateTests, listTests } from "@/services/api/projects";
import { ApiError } from "@/lib/api";
import type { Severity, TestCase, TestKind } from "@/types";
import { cn } from "@/lib/utils";

const PHASES = [
  { label: "AI Thinking...", detail: "Analyzing endpoint contracts and auth flows" },
  { label: "Generating Positive Tests...", detail: "Happy-path coverage for every endpoint" },
  { label: "Generating Security Tests...", detail: "Injection, auth-bypass and fuzzing scenarios" },
  { label: "Generating Boundary Tests...", detail: "Min, max, empty and unicode edge inputs" },
  { label: "Generating Edge Cases...", detail: "Malformed payloads and rare failure paths" },
];

const FILTERS: { key: "all" | TestKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "positive", label: "Positive" },
  { key: "security", label: "Security" },
  { key: "boundary", label: "Boundary" },
  { key: "negative", label: "Edge Case" },
];

const CATEGORY_LABEL: Record<TestKind, string> = {
  positive: "Positive",
  negative: "Edge Case",
  boundary: "Boundary",
  security: "Security",
};

const CATEGORY_BADGE: Record<TestKind, "success" | "critical" | "warning" | "info"> = {
  positive: "success",
  negative: "warning",
  boundary: "info",
  security: "critical",
};

const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const KIND_WEIGHT: Record<TestKind, number> = { positive: 1, boundary: 2, negative: 2, security: 3 };

function deriveMeta(test: TestCase) {
  const sevWeight = test.severity ? SEVERITY_WEIGHT[test.severity] : 2;
  const risk = Math.min(97, 10 + KIND_WEIGHT[test.kind] * 15 + sevWeight * 12);
  const priority = risk >= 75 ? "Critical" : risk >= 55 ? "High" : risk >= 35 ? "Medium" : "Low";
  const difficulty = test.kind === "security" ? "Hard" : test.kind === "boundary" || test.kind === "negative" ? "Medium" : "Easy";
  return { risk, priority, difficulty };
}

const PRIORITY_DOT: Record<string, string> = {
  Critical: "bg-critical",
  High: "bg-warning",
  Medium: "bg-info",
  Low: "bg-success",
};

export default function GeneratedTestsPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);
  const workflow = useWorkflowStore((s) => s.getWorkflow(projectId));
  const setTests = useWorkflowStore((s) => s.setTests);

  const [jobId, setJobId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | TestKind>("all");

  useEffect(() => {
    setJobId(null);
    setActiveFilter("all");
  }, [projectId]);

  const jobProgress = useJobProgress(jobId, async (finalState) => {
    if (finalState.status === "completed") {
      try {
        const apiTests = await listTests(projectId);
        const mapped = apiTests.map((t) => toWorkflowTestCase(t));
        setTests(projectId, mapped);
        updateProject(projectId, { testsGenerated: mapped.length });
        toast.success(`AI generated ${mapped.length} test cases`);
      } catch {
        toast.error("Generated tests, but couldn't load them. Try refreshing.");
      }
      setJobId(null);
    } else if (finalState.status === "failed") {
      toast.error("Test generation failed", { description: finalState.error ?? "Please try again." });
      setJobId(null);
    }
  });

  async function startGenerating() {
    try {
      const { jobId: newJobId } = await generateTests(projectId);
      setJobId(newJobId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't start test generation. Please try again.";
      toast.error("Test generation failed to start", { description: message });
    }
  }

  async function refreshTests() {
    try {
      const apiTests = await listTests(projectId);
      const mapped = apiTests.map((t) => toWorkflowTestCase(t));
      setTests(projectId, mapped);
      updateProject(projectId, { testsGenerated: mapped.length });
    } catch {
      // best-effort refresh — leave existing local state alone on failure
    }
  }

  if (!project) return <Navigate to="/app/projects" replace />;

  if (!workflow.uploaded) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow={project.name} title="Generate AI Tests" description="Turn your API map into a real test suite." />
        <EmptyState
          icon={Sparkles}
          title="Connect your API first"
          description="TestPilot AI needs to map your endpoints before it can write tests for them."
          actionLabel="Go to Upload"
          onAction={() => navigate(`/app/projects/${projectId}/upload`)}
        />
      </div>
    );
  }

  const isGenerating = jobId !== null;
  const phaseIndex = Math.min(PHASES.length - 1, Math.floor((jobProgress.progress / 100) * PHASES.length));

  const tests = workflow.tests;
  const filtered = activeFilter === "all" ? tests : tests.filter((t) => t.kind === activeFilter);
  const securityCount = tests.filter((t) => t.kind === "security").length;
  const avgRisk = tests.length ? Math.round(tests.reduce((sum, t) => sum + deriveMeta(t).risk, 0) / tests.length) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={project.name}
        title="Generate AI Tests"
        description="AI-authored positive, security, boundary and edge-case tests for every endpoint."
        actions={
          workflow.testsGenerated && !isGenerating ? (
            <Button variant="outline" onClick={startGenerating}>
              <RefreshCw className="size-4" /> Regenerate All
            </Button>
          ) : undefined
        }
      />

      <AnimatePresence mode="wait">
        {isGenerating ? (
          <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GeneratingPanel phaseIndex={phaseIndex} />
          </motion.div>
        ) : !workflow.testsGenerated ? (
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
                <FlaskConical className="relative size-7 text-primary" />
              </motion.div>
              <h3 className="relative text-lg font-semibold text-foreground">Ready to generate your test suite</h3>
              <p className="relative mt-1.5 max-w-md text-sm text-muted-foreground">
                TestPilot AI will write positive, security, boundary and edge-case tests across every mapped endpoint.
              </p>
              <Button size="lg" className="relative mt-6" onClick={startGenerating}>
                <Sparkles className="size-4" /> Generate AI Tests
              </Button>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="ready" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SummaryStat label="Total Tests" value={tests.length} />
              <SummaryStat label="Security Tests" value={securityCount} accent="text-critical" />
              <SummaryStat label="Endpoints Covered" value={project.endpointCount} />
              <SummaryStat label="Avg. Estimated Risk" value={`${avgRisk}%`} accent="text-warning" />
            </div>

            <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-1">
              {FILTERS.map((f) => {
                const count = f.key === "all" ? tests.length : tests.filter((t) => t.kind === f.key).length;
                return (
                  <button
                    key={f.key}
                    onClick={() => setActiveFilter(f.key)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                      activeFilter === f.key
                        ? "border-primary/40 bg-primary/15 text-foreground"
                        : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-foreground"
                    )}
                  >
                    {f.label}
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filtered.map((test, i) => (
                <TestCard key={test.id} test={test} projectId={projectId} index={i} onRegenerated={refreshTests} />
              ))}
            </div>

            <div className="flex justify-end">
              <Button size="lg" onClick={() => navigate(`/app/projects/${projectId}/run`)}>
                <TerminalSquare className="size-4" /> Run Tests
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function GeneratingPanel({ phaseIndex }: { phaseIndex: number }) {
  const phase = PHASES[phaseIndex];
  return (
    <Card className="glow-border relative items-center overflow-hidden py-16 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-30" />
      <div className="relative flex size-20 items-center justify-center">
        <div className="absolute inset-0 animate-glow-pulse rounded-full bg-primary/25 blur-2xl" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-t-primary border-r-primary/40 border-b-transparent border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
        />
        <Sparkles className="relative size-7 text-primary" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={phase.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="relative mt-6"
        >
          <p className="text-base font-semibold text-foreground">{phase.label}</p>
          <p className="mt-1.5 text-sm text-muted-foreground">{phase.detail}</p>
        </motion.div>
      </AnimatePresence>

      <div className="relative mt-7 flex items-center gap-1.5">
        {PHASES.map((p, i) => (
          <span
            key={p.label}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === phaseIndex ? "w-6 bg-primary" : i < phaseIndex ? "w-1.5 bg-primary/50" : "w-1.5 bg-white/10"
            )}
          />
        ))}
      </div>
    </Card>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <Card className="gap-1 py-5">
      <div className="px-5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={cn("mt-1.5 text-2xl font-bold tabular-nums text-foreground", accent)}>{value}</p>
      </div>
    </Card>
  );
}

function TestCard({
  test,
  projectId,
  index,
  onRegenerated,
}: {
  test: TestCase;
  projectId: string;
  index: number;
  onRegenerated: () => void;
}) {
  const updateTest = useWorkflowStore((s) => s.updateTest);
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(test.description);
  const [regenJobId, setRegenJobId] = useState<string | null>(null);
  const meta = deriveMeta(test);

  const regenProgress = useJobProgress(regenJobId, (finalState) => {
    if (finalState.status === "completed") {
      onRegenerated();
      toast.success("Test regenerated");
    } else if (finalState.status === "failed") {
      toast.error("Couldn't regenerate this test", { description: finalState.error ?? "Please try again." });
    }
    setRegenJobId(null);
  });
  const isRegenerating = regenJobId !== null && regenProgress.status !== "completed" && regenProgress.status !== "failed";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${test.request}\n\nExpected:\n${test.expected}`);
    toast.success("Test copied to clipboard");
  };

  const handleSave = () => {
    updateTest(projectId, test.id, { description: draft });
    setIsEditing(false);
    toast.success("Test updated");
  };

  const handleRegenerate = async () => {
    try {
      const { jobId } = await generateTests(projectId, [test.endpointId]);
      setRegenJobId(jobId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't regenerate this test. Please try again.";
      toast.error("Regeneration failed", { description: message });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 1.2), ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className="gap-0 overflow-hidden py-0 transition-colors hover:border-white/15">
        <div className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <MethodBadge method={test.method} />
              <code className="font-mono text-xs font-medium text-foreground">{test.path}</code>
            </div>
            <Badge variant={CATEGORY_BADGE[test.kind]}>{CATEGORY_LABEL[test.kind]}</Badge>
          </div>

          <p className="mt-3 text-sm font-semibold text-foreground">{test.title}</p>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} className="text-sm" rows={3} />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSave}>
                  <Save className="size-3.5" /> Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft(test.description);
                    setIsEditing(false);
                  }}
                >
                  <X className="size-3.5" /> Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">{test.description}</p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Difficulty <span className="font-medium text-foreground">{meta.difficulty}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", PRIORITY_DOT[meta.priority])} />
              Priority <span className="font-medium text-foreground">{meta.priority}</span>
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Est. Risk <span className="font-medium text-foreground">{meta.risk}%</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-white/[0.06] py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.03] hover:text-foreground"
        >
          <Braces className="size-3.5" />
          {expanded ? "Hide" : "View"} request & expected result
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-t border-white/[0.06]"
            >
              <div className="space-y-3 p-5">
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Request</p>
                  <CodeBlock code={test.request} language="text" />
                </div>
                <div>
                  <p className="mb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Expected Result</p>
                  <CodeBlock code={test.expected} language="text" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1 border-t border-white/[0.06] p-2">
          <Button size="sm" variant="ghost" onClick={handleCopy}>
            <Copy className="size-3.5" /> Copy
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIsEditing((v) => !v)}>
            <Pencil className="size-3.5" /> Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={handleRegenerate} disabled={isRegenerating} className="ml-auto">
            {isRegenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
