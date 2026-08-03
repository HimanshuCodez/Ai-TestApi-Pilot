import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import {
  ArrowRight,
  BarChart3,
  Check,
  Compass,
  FlaskConical,
  Layers,
  Lock,
  Sparkles,
  TerminalSquare,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { CircularScore } from "@/components/shared/CircularScore";
import { ProjectStatusPill } from "@/components/shared/StatusPill";
import { AnimatedCounter } from "@/components/shared/AnimatedCounter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { cn } from "@/lib/utils";

export default function ProjectOverviewPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const workflow = useWorkflowStore((s) => s.getWorkflow(projectId));

  if (!project) return <Navigate to="/app/projects" replace />;

  const steps = [
    {
      key: "upload",
      label: "Upload API Spec",
      description: workflow.uploaded ? workflow.fileName : "Import Swagger, OpenAPI or Postman",
      icon: UploadCloud,
      to: `/app/projects/${project.id}/upload`,
      done: workflow.uploaded,
      unlocked: true,
    },
    {
      key: "analysis",
      label: "AI Analysis",
      description: workflow.analyzed ? "Endpoints mapped & risks scored" : "Let AI understand your API",
      icon: Sparkles,
      to: `/app/projects/${project.id}/analysis`,
      done: workflow.analyzed,
      unlocked: workflow.uploaded,
    },
    {
      key: "explorer",
      label: "API Explorer",
      description: "Browse every endpoint & schema",
      icon: Compass,
      to: `/app/projects/${project.id}/explorer`,
      done: workflow.analyzed,
      unlocked: workflow.analyzed,
    },
    {
      key: "tests",
      label: "Generate AI Tests",
      description: workflow.testsGenerated ? `${workflow.tests.length} tests ready` : "Positive, boundary & security tests",
      icon: FlaskConical,
      to: `/app/projects/${project.id}/tests`,
      done: workflow.testsGenerated,
      unlocked: workflow.analyzed,
    },
    {
      key: "run",
      label: "Run Tests",
      description: workflow.testsRun ? "Latest run complete" : "Execute the suite in real time",
      icon: TerminalSquare,
      to: `/app/projects/${project.id}/run`,
      done: workflow.testsRun,
      unlocked: workflow.testsGenerated,
    },
    {
      key: "report",
      label: "AI Report",
      description: "Health, security & fixes",
      icon: BarChart3,
      to: `/app/projects/${project.id}/reports`,
      done: workflow.testsRun,
      unlocked: workflow.testsRun,
    },
  ];

  const nextStep = steps.find((s) => s.unlocked && !s.done) ?? steps[0];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={project.tags.join(" · ")}
        title={project.name}
        description={project.description}
        actions={
          <Button size="lg" onClick={() => navigate(nextStep.to)}>
            {workflow.testsRun ? "View Report" : "Continue Setup"} <ArrowRight className="size-4" />
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <ProjectStatusPill status={project.status} />
        <span className="font-mono text-xs text-muted-foreground">{project.baseUrl}</span>
        <span className="text-xs text-muted-foreground">
          Last scanned {formatDistanceToNowStrict(new Date(project.lastScanAt), { addSuffix: true })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="flex flex-col items-center justify-center gap-1 py-8 lg:col-span-1">
          <CircularScore value={project.healthScore} size={168} strokeWidth={12} label="API Health" />
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <MiniMetric label="Security Score" value={project.securityScore} suffix="%" />
          <MiniMetric label="Endpoints Mapped" value={project.endpointCount} />
          <MiniMetric label="Tests Generated" value={project.testsGenerated} />
          <MiniMetric label="Pass Rate" value={project.passRate} suffix="%" decimals={1} />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Pipeline</h2>
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step, i) => (
            <motion.button
              key={step.key}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={step.unlocked ? { y: -3 } : undefined}
              onClick={() => step.unlocked && navigate(step.to)}
              disabled={!step.unlocked}
              className={cn(
                "group relative flex flex-col items-start gap-3 rounded-2xl border p-5 text-left transition-all",
                step.unlocked
                  ? "glass cursor-pointer border-white/[0.08] hover:border-primary/30 hover:shadow-[0_20px_48px_-24px_rgba(109,94,248,0.4)]"
                  : "cursor-not-allowed border-white/[0.04] bg-white/[0.01] opacity-50"
              )}
            >
              <div className="flex w-full items-start justify-between">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl",
                    step.done
                      ? "bg-success/15 text-success"
                      : step.unlocked
                        ? "bg-gradient-to-br from-primary/25 to-accent/10 text-primary"
                        : "bg-white/5 text-muted-foreground"
                  )}
                >
                  {step.done ? <Check className="size-5" /> : step.unlocked ? <step.icon className="size-5" /> : <Lock className="size-4" />}
                </span>
                <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              </div>
              {step.unlocked && (
                <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, suffix = "", decimals = 0 }: { label: string; value: number; suffix?: string; decimals?: number }) {
  return (
    <Card className="justify-center gap-1.5 py-5">
      <div className="px-5">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Layers className="size-3.5" /> {label}
        </p>
        <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">
          <AnimatedCounter value={value} suffix={suffix} decimals={decimals} />
        </p>
      </div>
    </Card>
  );
}
