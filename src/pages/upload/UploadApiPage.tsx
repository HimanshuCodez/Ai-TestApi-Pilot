import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  FileCode2,
  FileJson,
  GitBranch,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { useJobProgress } from "@/hooks/useJobProgress";
import { connectFile, connectGithub, connectUrl } from "@/services/api/projects";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const acceptedFormats = [
  { label: "Swagger JSON", icon: FileJson },
  { label: "OpenAPI YAML", icon: FileCode2 },
];

const stages = [
  { label: "Reading spec", detail: "Loading and validating the raw document" },
  { label: "Parsing endpoints", detail: "Extracting paths, methods and schemas" },
  { label: "Mapping the API graph", detail: "Building relationships between resources" },
  { label: "Understanding authentication", detail: "Detecting Bearer, OAuth and API key schemes" },
  { label: "Done", detail: "Your API is ready to explore" },
];

const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: 6 + ((i * 9) % 88),
  delay: (i % 5) * 0.3,
  duration: 2.4 + (i % 4) * 0.4,
}));

type Status = "idle" | "processing" | "done";
type ConnectTab = "spec" | "github";

interface DiscoverySummary {
  endpointCount: number;
  authSchemeCount: number;
}

export default function UploadApiPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const updateProject = useProjectsStore((s) => s.updateProject);
  const workflow = useWorkflowStore((s) => s.getWorkflow(projectId));
  const setUploaded = useWorkflowStore((s) => s.setUploaded);

  const [tab, setTab] = useState<ConnectTab>("spec");
  const [status, setStatus] = useState<Status>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState("");
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [githubUrlValue, setGithubUrlValue] = useState("");
  const [showReplace, setShowReplace] = useState(!workflow.uploaded);
  const [summary, setSummary] = useState<DiscoverySummary | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const jobProgress = useJobProgress(jobId, (finalState) => {
    if (finalState.status === "completed") {
      let result: DiscoverySummary & { baseUrl?: string | null } = { endpointCount: 0, authSchemeCount: 0 };
      try {
        result = finalState.resultRef ? JSON.parse(finalState.resultRef) : result;
      } catch {
        // resultRef wasn't parseable JSON — fall back to zeroed summary
      }
      setSummary({ endpointCount: result.endpointCount, authSchemeCount: result.authSchemeCount });
      setUploaded(projectId, fileName, fileMeta);
      updateProject(projectId, {
        endpointCount: result.endpointCount,
        baseUrl: result.baseUrl ?? project?.baseUrl,
        status: "healthy",
      });
      setStatus("done");
    } else if (finalState.status === "failed") {
      toast.error("Couldn't connect your API", { description: finalState.error ?? "Please try again." });
      setStatus("idle");
      setJobId(null);
    }
  });

  useEffect(() => {
    setStatus("idle");
    setJobId(null);
    setSummary(null);
    setShowReplace(!workflow.uploaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (!project) return <Navigate to="/app/projects" replace />;

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const kb = (file.size / 1024).toFixed(0);
    const kind = file.name.endsWith(".yaml") || file.name.endsWith(".yml") ? "OpenAPI YAML" : "OpenAPI JSON";
    setFileName(file.name);
    setFileMeta(`${kb} KB · detected ${kind}`);
    setStatus("processing");

    try {
      const content = await file.text();
      const { jobId: newJobId } = await connectFile(projectId, file.name, content);
      setJobId(newJobId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't read that file. Please try again.";
      toast.error("Upload failed", { description: message });
      setStatus("idle");
    }
  }

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlValue.trim()) return;
    let host = "spec";
    try {
      host = new URL(urlValue).hostname;
    } catch {
      /* ignore — backend will validate and return a friendly error */
    }
    setFileName(urlValue.trim());
    setFileMeta(`Fetched from ${host}`);
    setStatus("processing");

    try {
      const { jobId: newJobId } = await connectUrl(projectId, urlValue.trim());
      setJobId(newJobId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't reach that URL. Please try again.";
      toast.error("Connection failed", { description: message });
      setStatus("idle");
    }
  }

  async function handleGithubSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!githubUrlValue.trim()) return;
    let repoName = "repository";
    try {
      const parts = new URL(githubUrlValue).pathname.split("/").filter(Boolean);
      if (parts.length >= 2) repoName = `${parts[0]}/${parts[1]}`;
    } catch {
      /* ignore — backend will validate and return a friendly error */
    }
    setFileName(repoName);
    setFileMeta("Scanned from GitHub");
    setStatus("processing");

    try {
      const { jobId: newJobId } = await connectGithub(projectId, githubUrlValue.trim());
      setJobId(newJobId);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Couldn't scan that repository. Please try again.";
      toast.error("Connection failed", { description: message });
      setStatus("idle");
    }
  }

  const stageIndex = Math.min(stages.length - 1, Math.floor((jobProgress.progress / 100) * stages.length));

  const showDropzone = status === "idle" && showReplace;
  const showSummary = status === "done" || (status === "idle" && !showReplace);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={project.name}
        title="Connect your API"
        description="Point TestPilot AI at a Swagger/OpenAPI spec — it reads it in seconds."
      />

      {showDropzone && (
        <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] p-1 w-fit">
          <button
            onClick={() => setTab("spec")}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === "spec" ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            API URL / File
          </button>
          <button
            onClick={() => setTab("github")}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === "github" ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <GitBranch className="size-3.5" /> GitHub Repository
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {showDropzone && tab === "github" && (
          <motion.div
            key="github"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <Card className="mx-auto max-w-xl items-center gap-5 px-8 py-14 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-white/[0.04] text-muted-foreground">
                <GitBranch className="size-7" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Connect a GitHub repository</h3>
                <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                  TestPilot looks for a checked-in OpenAPI/Swagger spec first. If it can&apos;t find one, it scans the
                  repo's source for Express, Fastify, NestJS, Flask, FastAPI, and Django routes instead.
                </p>
              </div>
              <form onSubmit={handleGithubSubmit} className="flex w-full max-w-md items-center gap-2">
                <Input
                  value={githubUrlValue}
                  onChange={(e) => setGithubUrlValue(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                  className="flex-1"
                />
                <Button type="submit" disabled={!githubUrlValue.trim()}>
                  Scan
                </Button>
              </form>
              <Badge variant="outline">Public repositories only</Badge>
            </Card>
          </motion.div>
        )}

        {showDropzone && tab === "spec" && (
          <motion.div key="dropzone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                void handleFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "group relative flex min-h-[360px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300",
                isDragging
                  ? "border-primary/60 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(109,94,248,0.3),0_40px_80px_-30px_rgba(109,94,248,0.5)]"
                  : "border-white/[0.12] bg-white/[0.015] hover:border-white/25 hover:bg-white/[0.03]"
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".json,.yaml,.yml"
                className="hidden"
                onChange={(e) => void handleFiles(e.target.files)}
              />

              <div className="pointer-events-none absolute inset-0 -z-10">
                <div
                  className={cn(
                    "absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(109,94,248,0.15),transparent)] bg-[length:200%_100%] transition-opacity duration-500",
                    isDragging ? "animate-gradient-x opacity-100" : "opacity-0"
                  )}
                />
                <AnimatePresence>
                  {isDragging &&
                    PARTICLES.map((p) => (
                      <motion.span
                        key={p.id}
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: [0, 1, 0], y: -80 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
                        className="absolute bottom-0 size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(109,94,248,0.9)]"
                        style={{ left: `${p.left}%` }}
                      />
                    ))}
                </AnimatePresence>
              </div>

              <motion.div
                animate={isDragging ? { y: [-6, 6, -6] } : { y: [0, -8, 0] }}
                transition={{ duration: isDragging ? 1.4 : 4, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-5 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent/10"
              >
                <div className={cn("absolute inset-0 rounded-2xl bg-primary/30 blur-2xl transition-opacity", isDragging ? "animate-glow-pulse opacity-100" : "opacity-40")} />
                <UploadCloud className="relative size-9 text-primary" />
              </motion.div>

              <h3 className="text-lg font-semibold text-foreground">
                {isDragging ? "Drop it right here" : "Drag & drop your API spec"}
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                or <span className="font-medium text-primary">click to browse</span> from your computer
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {acceptedFormats.map((f) => (
                  <span
                    key={f.label}
                    className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    <f.icon className="size-3.5" /> {f.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-white/[0.08]" />
              or
              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            {!urlMode ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUrlMode(true);
                }}
                className="mx-auto flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                <Link2 className="size-4" /> Paste a Swagger URL instead
              </button>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleUrlSubmit}
                className="mx-auto flex w-full max-w-md items-center gap-2"
              >
                <Input
                  autoFocus
                  value={urlValue}
                  onChange={(e) => setUrlValue(e.target.value)}
                  placeholder="https://api.example.com/openapi.json"
                  className="flex-1"
                />
                <Button type="submit" disabled={!urlValue.trim()}>
                  Fetch
                </Button>
              </motion.form>
            )}
          </motion.div>
        )}

        {status === "processing" && (
          <motion.div key="processing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="mx-auto max-w-xl gap-6 px-8 py-10 text-center">
              <div className="relative mx-auto flex size-16 items-center justify-center">
                <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" style={{ animationDuration: "1.4s" }} />
                <Sparkles className="size-6 text-primary" />
              </div>
              <div>
                <p className="truncate text-sm font-semibold text-foreground">{fileName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{fileMeta}</p>
              </div>

              <div className="space-y-3 text-left">
                {stages.map((stage, i) => {
                  const active = i === stageIndex;
                  const complete = i < stageIndex || (i === stageIndex && stage.label === "Done");
                  const pending = i > stageIndex;
                  return (
                    <div key={stage.label} className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors", active && "bg-white/[0.04]")}>
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px]",
                          complete
                            ? "border-success/40 bg-success/15 text-success"
                            : active
                              ? "border-primary/50 bg-primary/15 text-primary"
                              : "border-white/10 bg-white/[0.02] text-muted-foreground"
                        )}
                      >
                        {complete ? <Check className="size-3.5" /> : active ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium", pending ? "text-muted-foreground" : "text-foreground")}>{stage.label}...</p>
                        {(active || complete) && <p className="text-xs text-muted-foreground">{stage.detail}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {showSummary && (
          <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="mx-auto max-w-xl gap-5 px-8 py-10 text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 14 }}
                className="relative mx-auto flex size-16 items-center justify-center rounded-2xl bg-success/15"
              >
                <div className="absolute inset-0 animate-glow-pulse rounded-2xl bg-success/20 blur-xl" />
                <Check className="relative size-8 text-success" />
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">API connected successfully</h3>
                <p className="mt-1.5 truncate text-sm text-muted-foreground">{workflow.fileName || fileName}</p>
                <p className="text-xs text-muted-foreground">{workflow.fileMeta || fileMeta}</p>
              </div>
              <div className="mx-auto flex max-w-xs items-center justify-center gap-6 rounded-xl border border-white/[0.06] bg-white/[0.02] py-3">
                <div>
                  <p className="text-xl font-bold text-foreground">{summary?.endpointCount ?? project.endpointCount}</p>
                  <p className="text-xs text-muted-foreground">Endpoints found</p>
                </div>
                <div className="h-8 w-px bg-white/[0.08]" />
                <div>
                  <p className="text-xl font-bold text-foreground">{summary?.authSchemeCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Auth schemes</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStatus("idle");
                    setShowReplace(true);
                  }}
                >
                  <RefreshCw className="size-4" /> Replace File
                </Button>
                <Button className="flex-1" onClick={() => navigate(`/app/projects/${projectId}/analysis`)}>
                  Run AI Analysis <ArrowRight className="size-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
