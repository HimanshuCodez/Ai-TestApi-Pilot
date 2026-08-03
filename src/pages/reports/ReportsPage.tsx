import { useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  Bug,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  TerminalSquare,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { CircularScore } from "@/components/shared/CircularScore";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltip } from "@/components/shared/ChartTooltip";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { chartData, securityIssues } from "@/services/mockData";
import type { Severity, SecurityIssue } from "@/types";
import { cn } from "@/lib/utils";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low"];
const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#FF5470",
  high: "#FFB454",
  medium: "#6D5EF8",
  low: "#4F9CFF",
};

const STATUS_STYLE: Record<SecurityIssue["status"], string> = {
  open: "text-critical bg-critical/10 border-critical/25",
  acknowledged: "text-warning bg-warning/10 border-warning/25",
  resolved: "text-success bg-success/10 border-success/25",
};

export default function ReportsPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const workflow = useWorkflowStore((s) => s.getWorkflow(projectId));
  const [selectedIssue, setSelectedIssue] = useState<SecurityIssue | null>(null);

  const severityCounts = useMemo(() => {
    return SEVERITY_ORDER.map((sev) => ({
      name: sev.charAt(0).toUpperCase() + sev.slice(1),
      severity: sev,
      value: securityIssues.filter((i) => i.severity === sev).length,
    }));
  }, []);

  const avgP50 = Math.round(chartData.responseTime.reduce((a, d) => a + d.p50, 0) / chartData.responseTime.length);
  const avgP95 = Math.round(chartData.responseTime.reduce((a, d) => a + d.p95, 0) / chartData.responseTime.length);
  const performanceScore = Math.max(0, Math.min(100, Math.round(100 - avgP95 / 6)));
  const coveragePct = chartData.coverage[0].value;

  if (!project) return <Navigate to="/app/projects" replace />;

  if (!workflow.testsRun) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow={project.name} title="AI Report" description="Health, security and coverage in one view." />
        <EmptyState
          icon={Sparkles}
          title="Run your tests first"
          description="TestPilot AI compiles the full report once a test run has completed."
          actionLabel="Go to Run Tests"
          onAction={() => navigate(`/app/projects/${projectId}/run`)}
        />
      </div>
    );
  }

  const run = workflow.runResult;
  const testResultsData = [
    { name: "Passed", value: run?.passed ?? 0 },
    { name: "Failed", value: run?.failed ?? 0 },
    { name: "Skipped", value: run?.skipped ?? 0 },
  ].filter((d) => d.value > 0);
  const TEST_RESULT_COLORS: Record<string, string> = { Passed: "#2EE6A6", Failed: "#FF5470", Skipped: "#8b8b9e" };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={project.name}
        title="AI Report"
        description={run ? `Compiled from your last run — ${run.total} tests in ${(run.durationMs / 1000).toFixed(1)}s.` : "Health, security and coverage in one view."}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-1 py-8 lg:col-span-1">
          <CircularScore value={project.healthScore} size={176} strokeWidth={13} label="API Health Score" />
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <ReportStat icon={ShieldCheck} label="Security Score" value={project.securityScore} suffix="%" accent="text-primary" />
          <ReportStat icon={Target} label="Test Coverage" value={coveragePct} suffix="%" accent="text-success" />
          <ReportStat icon={Gauge} label="Performance Score" value={performanceScore} suffix="%" accent="text-accent" />
          <ReportStat icon={Timer} label="Avg. Response Time" value={avgP50} suffix="ms" accent="text-warning" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Issues by Severity" description={`${securityIssues.length} findings from AI analysis`} delay={0.05} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={severityCounts} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fill: "#8b8b9e", fontSize: 12 }} axisLine={false} tickLine={false} />
              <RTooltip content={ChartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="value" name="Issues" radius={[0, 6, 6, 0]} barSize={16}>
                {severityCounts.map((d) => (
                  <Cell key={d.severity} fill={SEVERITY_COLOR[d.severity]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Test Results" description="From your latest run" delay={0.1}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <RTooltip content={ChartTooltip} />
              <Pie data={testResultsData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3} strokeWidth={0}>
                {testResultsData.map((entry) => (
                  <Cell key={entry.name} fill={TEST_RESULT_COLORS[entry.name]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Response Time" description="p50 / p95 latency across mapped endpoints (ms)" delay={0.1}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData.responseTime} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="day" tick={{ fill: "#8b8b9e", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8b8b9e", fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
            <RTooltip content={ChartTooltip} cursor={{ stroke: "rgba(255,255,255,0.12)" }} />
            <Legend verticalAlign="top" height={28} iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
            <Line type="monotone" dataKey="p50" name="p50" stroke="#00E5FF" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="p95" name="p95" stroke="#6D5EF8" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Issues Found</h2>
          <span className="text-xs text-muted-foreground">{securityIssues.length} total · click an issue for AI guidance</span>
        </div>

        {SEVERITY_ORDER.map((sev) => {
          const issues = securityIssues.filter((i) => i.severity === sev);
          if (issues.length === 0) return null;
          return (
            <div key={sev} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <SeverityBadge severity={sev} />
                <span className="text-xs text-muted-foreground">{issues.length} issue{issues.length > 1 ? "s" : ""}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {issues.map((issue, i) => (
                  <motion.button
                    key={issue.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -2 }}
                    onClick={() => setSelectedIssue(issue)}
                    className="group flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-colors hover:border-primary/30 hover:bg-white/[0.04]"
                  >
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-critical/10 text-critical">
                      <Bug className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{issue.title}</p>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", STATUS_STYLE[issue.status])}>{issue.status}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{issue.description}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <code className="font-mono">
                          {issue.method} {issue.endpoint}
                        </code>
                        <span>{issue.category}</span>
                        <span>{formatDistanceToNowStrict(new Date(issue.discoveredAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                  </motion.button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button size="lg" variant="outline" onClick={() => navigate(`/app/projects/${projectId}/run`)}>
          <TerminalSquare className="size-4" /> Run Again
        </Button>
      </div>

      <IssueSidePanel issue={selectedIssue} projectId={projectId} onClose={() => setSelectedIssue(null)} />
    </div>
  );
}

function ReportStat({
  icon: Icon,
  label,
  value,
  suffix = "",
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  accent?: string;
}) {
  return (
    <Card className="justify-center gap-1.5 py-5">
      <div className="px-5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Icon className="size-3.5" /> {label}
        </p>
        <p className={cn("mt-1.5 text-2xl font-bold tabular-nums text-foreground", accent)}>
          <AnimatedCounter value={value} suffix={suffix} />
        </p>
      </div>
    </Card>
  );
}

function IssueSidePanel({ issue, projectId, onClose }: { issue: SecurityIssue | null; projectId: string; onClose: () => void }) {
  const navigate = useNavigate();

  const handleCopyFix = async () => {
    if (!issue) return;
    await navigator.clipboard.writeText(issue.fix);
    toast.success("Suggested fix copied to clipboard");
  };

  return (
    <DialogPrimitive.Root open={!!issue} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {issue && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="glass-strong fixed top-0 right-0 z-50 flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-white/10 shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] p-6">
                  <div>
                    <DialogPrimitive.Title asChild>
                      <p className="text-lg font-semibold text-foreground">{issue.title}</p>
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description asChild>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={issue.severity} />
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", STATUS_STYLE[issue.status])}>{issue.status}</span>
                        <code className="font-mono text-xs text-muted-foreground">
                          {issue.method} {issue.endpoint}
                        </code>
                      </div>
                    </DialogPrimitive.Description>
                  </div>
                  <DialogPrimitive.Close className="rounded-lg p-1.5 text-muted-foreground opacity-70 transition-opacity hover:bg-white/10 hover:opacity-100">
                    <X className="size-4" />
                  </DialogPrimitive.Close>
                </div>

                <div className="scrollbar-none flex-1 space-y-6 overflow-y-auto p-6">
                  <section className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                      <Sparkles className="size-3.5" /> AI Explanation
                    </h3>
                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                    <p className="rounded-xl border border-critical/20 bg-critical/[0.06] p-3 text-sm text-muted-foreground">{issue.risk}</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-success uppercase">
                      <Check className="size-3.5" /> Suggested Fix
                    </h3>
                    <p className="text-sm text-muted-foreground">{issue.fix}</p>
                  </section>

                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Example Code</h3>
                    <CodeBlock code={issue.codeSnippet} language={issue.codeLang} />
                  </section>
                </div>

                <div className="flex items-center gap-2 border-t border-white/[0.06] p-4">
                  <Button className="flex-1" onClick={handleCopyFix}>
                    <Copy className="size-4" /> Copy Fix
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onClose();
                      navigate(`/app/projects/${projectId}/bugs/${issue.id}`);
                    }}
                  >
                    <ExternalLink className="size-4" /> Full Report
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
