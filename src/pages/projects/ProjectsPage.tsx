import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectCard } from "@/components/shared/ProjectCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/useProjectsStore";
import type { ProjectStatus } from "@/types";
import { cn } from "@/lib/utils";

const filters: { label: string; value: ProjectStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Healthy", value: "healthy" },
  { label: "Needs Attention", value: "warning" },
  { label: "Critical", value: "critical" },
  { label: "Scanning", value: "scanning" },
];

export default function ProjectsPage() {
  const navigate = useNavigate();
  const projects = useProjectsStore((s) => s.projects);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.baseUrl.toLowerCase().includes(query.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()));
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Projects"
        title="All Projects"
        description="Every API you've connected to TestPilot AI, in one place."
        actions={
          <Button size="lg" onClick={() => navigate("/app/projects/new")}>
            <Plus className="size-4.5" /> New Project
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, URL or tag..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                statusFilter === f.value
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Try a different search term or filter, or create a brand new project to get started."
          actionLabel="New Project"
          onAction={() => navigate("/app/projects/new")}
        />
      ) : (
        <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
