import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict, format } from "date-fns";
import { ArrowLeft, Check, Copy, Layers, Sparkles, Tag } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/useProjectsStore";
import { securityIssues } from "@/services/mockData";
import type { SecurityIssue } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<SecurityIssue["status"], string> = {
  open: "text-critical bg-critical/10 border-critical/25",
  acknowledged: "text-warning bg-warning/10 border-warning/25",
  resolved: "text-success bg-success/10 border-success/25",
};

export default function BugDetailsPage() {
  const { projectId = "", bugId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const issue = securityIssues.find((i) => i.id === bugId);

  if (!project) return <Navigate to="/app/projects" replace />;
  if (!issue) return <Navigate to={`/app/projects/${projectId}/reports`} replace />;

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

      <PageHeader
        eyebrow={project.name}
        title={issue.title}
        description={`Discovered ${formatDistanceToNowStrict(new Date(issue.discoveredAt), { addSuffix: true })} during AI analysis.`}
        actions={
          <div className="flex items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium capitalize", STATUS_STYLE[issue.status])}>{issue.status}</span>
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
              <p className="text-sm text-muted-foreground">{issue.description}</p>
              <div className="rounded-xl border border-critical/20 bg-critical/[0.06] p-4">
                <p className="mb-1 text-xs font-semibold text-critical">Why it matters</p>
                <p className="text-sm text-muted-foreground">{issue.risk}</p>
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <Card className="gap-3 p-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-success uppercase">
                  <Check className="size-3.5" /> Suggested Fix
                </h3>
                <Button size="sm" variant="ghost" onClick={() => handleCopy(issue.fix, "Suggested fix")}>
                  <Copy className="size-3.5" /> Copy
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">{issue.fix}</p>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <Card className="gap-3 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Example Code</h3>
                <Button size="sm" variant="ghost" onClick={() => handleCopy(issue.codeSnippet, "Code")}>
                  <Copy className="size-3.5" /> Copy
                </Button>
              </div>
              <CodeBlock code={issue.codeSnippet} language={issue.codeLang} />
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
                  {issue.method} {issue.endpoint}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Tag className="size-3.5" /> Category
                </dt>
                <dd className="text-foreground">{issue.category}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Discovered</dt>
                <dd className="text-foreground">{format(new Date(issue.discoveredAt), "MMM d, yyyy")}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_STYLE[issue.status])}>{issue.status}</dd>
              </div>
            </dl>
          </Card>

          <Button className="w-full" onClick={() => handleCopy(issue.fix, "Suggested fix")}>
            <Copy className="size-4" /> Copy Fix
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
