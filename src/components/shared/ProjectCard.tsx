import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, FlaskConical, Layers, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProjectStatusPill } from "@/components/shared/StatusPill";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";

export function ProjectCard({ project, index = 0 }: { project: Project; index?: number }) {
  const isScanning = project.status === "scanning";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -3 }}
    >
      <Link to={`/app/projects/${project.id}`}>
        <Card className="group relative gap-4 overflow-hidden p-5 py-0 transition-shadow hover:shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_24px_48px_-20px_rgba(109,94,248,0.35)]">
          <div className="flex items-start justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/15 text-xs font-bold text-white">
                {project.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{project.name}</p>
                <p className="truncate text-xs text-muted-foreground">{project.baseUrl}</p>
              </div>
            </div>
            <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>

          <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>

          <div className="flex items-center gap-2">
            <ProjectStatusPill status={project.status} />
            {project.tags.slice(0, 2).map((t) => (
              <span key={t} className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-muted-foreground">
                {t}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] py-4">
            {isScanning ? (
              <div className="flex items-center gap-2 text-xs font-medium text-primary">
                <Loader2 className="size-3.5 animate-spin" /> AI analysis in progress...
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <MiniStat label="Health" value={`${project.healthScore}`} tone={project.healthScore >= 85 ? "success" : project.healthScore >= 60 ? "warning" : "critical"} />
                <MiniStat label="Security" value={`${project.securityScore}`} tone={project.securityScore >= 85 ? "success" : project.securityScore >= 60 ? "warning" : "critical"} />
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FlaskConical className="size-3.5" /> {project.testsGenerated}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Layers className="size-3.5" /> {project.endpointCount}
                </div>
              </div>
            )}
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "success" | "warning" | "critical" }) {
  const toneClass = { success: "text-success", warning: "text-warning", critical: "text-critical" }[tone];
  return (
    <div className="text-xs">
      <span className={cn("font-semibold", toneClass)}>{value}</span>
      <span className="ml-1 text-muted-foreground">{label}</span>
    </div>
  );
}
