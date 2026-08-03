import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bug,
  Check,
  KeyRound,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { MethodBadge } from "@/components/shared/MethodBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { endpoints, securityIssues } from "@/services/mockData";
import { cn } from "@/lib/utils";
import type { HttpMethod } from "@/types";

type LogLine = { text: string; method?: HttpMethod };

const preamble: LogLine[] = [
  { text: "$ testpilot analyze --spec openapi.json" },
  { text: "→ Reading swagger.json (412 KB)" },
  { text: "→ Parsing schema & resolving $ref definitions" },
];

const postamble: LogLine[] = [
  { text: "→ Detected Bearer JWT + API key schemes" },
  { text: "→ Mapping relationships across resource tags" },
  { text: "→ Fuzzing query & path parameters for injection" },
  { text: "→ Validating JWT expiration & signature checks" },
  { text: "→ Probing endpoints for missing rate-limit policies" },
  { text: "→ Synthesizing positive, negative & boundary tests" },
  { text: "→ Calculating security, performance & docs scores" },
  { text: "✓ Analysis complete" },
];

const phrases = [
  "Analyzing endpoint relationships...",
  "Generating security tests...",
  "Finding vulnerabilities...",
  "Understanding schemas...",
];

const TICK_MS = 300;

export default function AiAnalysisPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);
  const workflow = useWorkflowStore((s) => s.getWorkflow(projectId));
  const setAnalyzed = useWorkflowStore((s) => s.setAnalyzed);

  const lines = useMemo<LogLine[]>(
    () => [...preamble, ...endpoints.map((e) => ({ text: `→ ${e.method} ${e.path}`, method: e.method })), ...postamble],
    []
  );

  const [status, setStatus] = useState<"running" | "complete">(workflow.analyzed ? "complete" : "running");
  const [tick, setTick] = useState(workflow.analyzed ? lines.length : 0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (status !== "running") return;
    if (tick >= lines.length) {
      const t = setTimeout(() => {
        setStatus("complete");
        if (!startedRef.current) return;
        setAnalyzed(projectId);
        const critical = securityIssues.filter((i) => i.severity === "critical").length;
        const high = securityIssues.filter((i) => i.severity === "high").length;
        const medium = securityIssues.filter((i) => i.severity === "medium").length;
        const low = securityIssues.filter((i) => i.severity === "low").length;
        const securityScore = Math.max(35, 100 - critical * 14 - high * 7 - medium * 3 - low);
        const healthScore = Math.min(96, Math.round((securityScore + 82) / 2) + 6);
        updateProject(projectId, {
          status: securityScore < 60 ? "critical" : securityScore < 85 ? "warning" : "healthy",
          healthScore,
          securityScore,
          endpointCount: endpoints.length,
          lastScanAt: new Date().toISOString(),
        });
      }, 900);
      return () => clearTimeout(t);
    }
    startedRef.current = true;
    const t = setTimeout(() => setTick((v) => v + 1), TICK_MS);
    return () => clearTimeout(t);
  }, [status, tick, lines.length, projectId, setAnalyzed, updateProject]);

  useEffect(() => {
    if (status !== "running") return;
    const phrase = phrases[phraseIdx % phrases.length];
    if (charCount < phrase.length) {
      const t = setTimeout(() => setCharCount((c) => c + 1), 26);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setPhraseIdx((i) => i + 1);
      setCharCount(0);
    }, 1100);
    return () => clearTimeout(t);
  }, [status, phraseIdx, charCount]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [tick]);

  if (!project) return <Navigate to="/app/projects" replace />;

  const visibleLines = lines.slice(0, tick);

  const findings = [
    { key: "auth", text: "Authentication Found", tone: "success" as const, icon: ShieldCheck, revealAt: 5 },
    { key: "count", text: `${endpoints.length} Endpoints Mapped`, tone: "info" as const, icon: Layers, revealAt: preamble.length + endpoints.length + 1 },
    { key: "jwt", text: "JWT Detected", tone: "success" as const, icon: KeyRound, revealAt: preamble.length + endpoints.length + 2 },
    { key: "rate", text: "Rate Limiting Missing", tone: "warning" as const, icon: TriangleAlert, revealAt: preamble.length + endpoints.length + 6 },
    { key: "risks", text: `${securityIssues.length} Security Risks Found`, tone: "critical" as const, icon: Bug, revealAt: lines.length - 1 },
  ];

  const toneClass = {
    success: "border-success/25 bg-success/10 text-success",
    info: "border-info/25 bg-info/10 text-info",
    warning: "border-warning/25 bg-warning/10 text-warning",
    critical: "border-critical/25 bg-critical/10 text-critical",
  };

  const phrase = phrases[phraseIdx % phrases.length];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={project.name}
        title={status === "complete" ? "Analysis complete" : "AI is analyzing your API"}
        description={
          status === "complete"
            ? "Every endpoint has been mapped, scored and prepared for testing."
            : "Sit tight — TestPilot AI is reading your spec and hunting for risk."
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px_1fr] lg:items-stretch">
        <Card className="order-2 gap-0 overflow-hidden py-0 lg:order-1">
          <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-3">
            <span className="size-2.5 rounded-full bg-critical/70" />
            <span className="size-2.5 rounded-full bg-warning/70" />
            <span className="size-2.5 rounded-full bg-success/70" />
            <span className="ml-2 font-mono text-[11px] text-muted-foreground">analysis.log</span>
          </div>
          <div ref={scrollRef} className="scrollbar-none h-[420px] overflow-y-auto px-5 py-4 font-mono text-[12.5px] leading-relaxed">
            {visibleLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
                className={cn("flex items-center gap-2 py-0.5", line.text.startsWith("✓") ? "text-success" : line.text.startsWith("$") ? "text-foreground" : "text-muted-foreground")}
              >
                {line.method && <MethodBadge method={line.method} className="h-4.5 w-12 text-[9px]" />}
                <span className="truncate">{line.method ? line.text.replace(/^→ \S+ /, "") : line.text}</span>
              </motion.div>
            ))}
            {status === "running" && (
              <span className="mt-1 inline-block h-3.5 w-1.5 animate-pulse bg-primary/70 align-middle" />
            )}
          </div>
        </Card>

        <div className="order-1 flex flex-col items-center justify-center gap-6 py-6 lg:order-2">
          <AICore active={status === "running"} />
          <div className="h-10 text-center">
            {status === "running" ? (
              <p className="font-mono text-xs text-primary/90">
                {phrase.slice(0, charCount)}
                <span className="animate-pulse">▌</span>
              </p>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <Check className="size-4" /> Analysis complete
              </motion.p>
            )}
          </div>
        </div>

        <div className="order-3 flex flex-col gap-3">
          <AnimatePresence>
            {findings
              .filter((f) => tick >= f.revealAt)
              .map((f) => (
                <motion.div
                  key={f.key}
                  initial={{ opacity: 0, x: 24, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Card className={cn("flex-row items-center gap-3 border px-4 py-3.5", toneClass[f.tone])}>
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                      <f.icon className="size-4" />
                    </span>
                    <span className="text-sm font-semibold">{f.text}</span>
                  </Card>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {status === "complete" && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/[0.06] px-6 py-5 sm:flex-row"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Your API is fully mapped and ready</p>
                <p className="text-xs text-muted-foreground">Browse every endpoint or jump straight to generating tests.</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" onClick={() => navigate(`/app/projects/${projectId}/explorer`)}>
                Open Explorer
              </Button>
              <Button onClick={() => navigate(`/app/projects/${projectId}/tests`)}>
                Generate Tests <ArrowRight className="size-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AICore({ active }: { active: boolean }) {
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const angle = (i / 6) * Math.PI * 2;
    return { x: Math.cos(angle) * 108, y: Math.sin(angle) * 108, delay: i * 0.15 };
  });

  return (
    <div className="relative flex size-64 items-center justify-center">
      <div className={cn("absolute inset-8 rounded-full bg-primary/30 blur-3xl", active && "animate-glow-pulse")} />

      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border border-dashed border-white/[0.12]"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-6 rounded-full border border-primary/20"
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-14 rounded-full border border-accent/25"
      />

      {active && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full opacity-70"
          style={{
            background: "conic-gradient(from 0deg, transparent 0%, rgba(0,229,255,0.55) 8%, transparent 20%)",
            maskImage: "radial-gradient(circle, transparent 58%, black 60%, black 100%)",
            WebkitMaskImage: "radial-gradient(circle, transparent 58%, black 60%, black 100%)",
          }}
        />
      )}

      {nodes.map((n, i) => (
        <motion.span
          key={i}
          className="absolute size-2 rounded-full bg-accent shadow-[0_0_10px_rgba(0,229,255,0.9)]"
          style={{ left: `calc(50% + ${n.x}px)`, top: `calc(50% + ${n.y}px)` }}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: n.delay, ease: "easeInOut" }}
        />
      ))}

      <motion.div
        animate={active ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#8B7CFA] shadow-[0_0_60px_rgba(109,94,248,0.7)]"
      >
        <ShieldAlert className="size-10 text-white" strokeWidth={1.6} />
      </motion.div>
    </div>
  );
}
