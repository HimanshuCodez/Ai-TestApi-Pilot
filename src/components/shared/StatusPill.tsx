import { cn } from "@/lib/utils";
import type { ProjectStatus, RunStatus } from "@/types";

const projectConfig: Record<ProjectStatus, { label: string; dot: string; className: string }> = {
  healthy: { label: "Healthy", dot: "bg-success", className: "text-success bg-success/10 border-success/25" },
  warning: { label: "Needs Attention", dot: "bg-warning", className: "text-warning bg-warning/10 border-warning/25" },
  critical: { label: "Critical", dot: "bg-critical", className: "text-critical bg-critical/10 border-critical/25" },
  scanning: { label: "Scanning", dot: "bg-primary animate-pulse", className: "text-primary bg-primary/10 border-primary/25" },
};

export function ProjectStatusPill({ status, className }: { status: ProjectStatus; className?: string }) {
  const c = projectConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", c.className, className)}>
      <span className={cn("size-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  );
}

const runConfig: Record<RunStatus, { label: string; className: string }> = {
  passed: { label: "Passed", className: "text-success bg-success/10 border-success/25" },
  failed: { label: "Failed", className: "text-critical bg-critical/10 border-critical/25" },
  running: { label: "Running", className: "text-primary bg-primary/10 border-primary/25" },
  skipped: { label: "Skipped", className: "text-muted-foreground bg-white/5 border-white/10" },
  queued: { label: "Queued", className: "text-info bg-info/10 border-info/25" },
};

export function RunStatusPill({ status, className }: { status: RunStatus; className?: string }) {
  const c = runConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", c.className, className)}>
      {c.label}
    </span>
  );
}
