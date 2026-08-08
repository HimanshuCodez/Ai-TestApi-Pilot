import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowLeft, Check, Copy, Gauge, Layers, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/useProjectsStore";
import { getFinding } from "@/services/api/projects";
import type { ApiFinding } from "@/services/api/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ApiFinding["status"], string> = {
  open: "text-critical bg-critical/10 border-critical/25",
  acknowledged: "text-warning bg-warning/10 border-warning/25",
  resolved: "text-success bg-success/10 border-success/25",
};

export default function BugDetailsPage() {
  const { projectId = "", bugId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const [finding, setFinding] = useState<ApiFinding | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setFinding(undefined);
    getFinding(projectId, bugId)
      .then((f) => !cancelled && setFinding(f))
      .catch(() => !cancelled && setFinding(null));
    return () => {
      cancelled = true;
    };
  }, [projectId, bugId]);

  if (!project) return <Navigate to="/app/projects" replace />;
  if (finding === null) return <Navigate to={`/app/projects/${projectId}/reports`} replace />;

  const handleCopy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="space-y-8">
      <button
        onClick={() => navigate(`/app/projects/${projectId}/reports`)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Report
      </button>

      {!finding ? (
        <Card className="items-center gap-2 py-16 text-center text-sm text-muted-foreground">Loading finding...</Card>
      ) : (
        <>
          <PageHeader
            eyebrow={project.name}
            title={finding.title}
            description={`Discovered ${format(new Date(finding.createdAt), "MMM d, yyyy")} during test analysis.`}
            actions={
              <div className="flex items-center gap-2">
                <SeverityBadge severity={finding.severity} />
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLE[finding.status])}>{finding.status}</span>
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
            <div className="space-y-5">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                <Card className="gap-3 p-6">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                    <Sparkles className="size-3.5" /> AI Explanation
                  </h3>
                  <p className="text-sm text-muted-foreground">{finding.description}</p>
                  {finding.confidence != null && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Gauge className="size-3.5" /> AI confidence: {Math.round(finding.confidence * 100)}%
                    </p>
                  )}
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
                <Card className="gap-3 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-success uppercase">
                      <Check className="size-3.5" /> Suggested Fix
                    </h3>
                    <Button size="sm" variant="ghost" onClick={() => handleCopy(finding.recommendation, "Suggested fix")}>
                      <Copy className="size-3.5" /> Copy
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{finding.recommendation}</p>
                </Card>
              </motion.div>
            </div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }} className="space-y-4">
              <Card className="gap-4 p-5">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Details</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Layers className="size-3.5" /> Endpoint
                    </dt>
                    <dd className="truncate font-mono text-xs text-foreground">
                      {finding.method} {finding.endpoint}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      <Tag className="size-3.5" /> Category
                    </dt>
                    <dd className="text-foreground capitalize">{finding.category}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Discovered</dt>
                    <dd className="text-foreground">{format(new Date(finding.createdAt), "MMM d, yyyy")}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_STYLE[finding.status])}>{finding.status}</dd>
                  </div>
                </dl>
              </Card>

              <Button className="w-full" onClick={() => handleCopy(finding.recommendation, "Suggested fix")}>
                <Copy className="size-4" /> Copy Fix
              </Button>
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
