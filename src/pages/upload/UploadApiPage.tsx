import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  FileCode2,
  FileJson,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { endpoints } from "@/services/mockData";
import { cn } from "@/lib/utils";

const acceptedFormats = [
  { label: "Swagger JSON", icon: FileJson },
  { label: "OpenAPI YAML", icon: FileCode2 },
  { label: "Postman Collection", icon: FileJson },
];

const stages = [
  { label: "Reading file", detail: "Loading and validating the raw spec" },
  { label: "Parsing endpoints", detail: "Extracting paths, methods and schemas" },
  { label: "Understanding authentication", detail: "Detecting Bearer, OAuth and API key schemes" },
  { label: "Building API graph", detail: "Mapping relationships between resources" },
  { label: "Done", detail: "Your API is ready to explore" },
];

const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  left: 6 + ((i * 9) % 88),
  delay: (i % 5) * 0.3,
  duration: 2.4 + (i % 4) * 0.4,
}));

type Status = "idle" | "processing" | "done";

export default function UploadApiPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const workflow = useWorkflowStore((s) => s.getWorkflow(projectId));
  const setUploaded = useWorkflowStore((s) => s.setUploaded);

  const [status, setStatus] = useState<Status>("idle");
  const [stageIndex, setStageIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileMeta, setFileMeta] = useState("");
  const [urlMode, setUrlMode] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [showReplace, setShowReplace] = useState(!workflow.uploaded);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status !== "processing") return;
    if (stageIndex >= stages.length - 1) {
      const t = setTimeout(() => {
        setStatus("done");
        setUploaded(projectId, fileName, fileMeta);
      }, 750);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStageIndex((i) => i + 1), stageIndex === -1 ? 350 : 850);
    return () => clearTimeout(t);
  }, [status, stageIndex, projectId, fileName, fileMeta, setUploaded]);

  if (!project) return <Navigate to="/app/projects" replace />;

  function beginProcessing(name: string, meta: string) {
    setFileName(name);
    setFileMeta(meta);
    setStageIndex(-1);
    setStatus("processing");
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const kb = (file.size / 1024).toFixed(0);
    beginProcessing(file.name, `${kb} KB · detected ${file.name.endsWith(".yaml") || file.name.endsWith(".yml") ? "OpenAPI YAML" : "OpenAPI JSON"}`);
  }

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlValue.trim()) return;
    let host = "spec";
    try {
      host = new URL(urlValue).hostname;
    } catch {
      /* ignore invalid URL, still simulate */
    }
    beginProcessing(urlValue.trim(), `Fetched from ${host}`);
  }

  const showDropzone = status === "idle" && showReplace;
  const showSummary = status === "done" || (status === "idle" && !showReplace);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={project.name}
        title="Upload your API spec"
        description="Drop in a Swagger, OpenAPI or Postman file — TestPilot AI reads it in seconds."
      />

      <AnimatePresence mode="wait">
        {showDropzone && (
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
                handleFiles(e.dataTransfer.files);
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
                onChange={(e) => handleFiles(e.target.files)}
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
                <h3 className="text-lg font-semibold text-foreground">Spec uploaded successfully</h3>
                <p className="mt-1.5 truncate text-sm text-muted-foreground">{workflow.fileName || fileName}</p>
                <p className="text-xs text-muted-foreground">{workflow.fileMeta || fileMeta}</p>
              </div>
              <div className="mx-auto flex max-w-xs items-center justify-center gap-6 rounded-xl border border-white/[0.06] bg-white/[0.02] py-3">
                <div>
                  <p className="text-xl font-bold text-foreground">{endpoints.length}</p>
                  <p className="text-xs text-muted-foreground">Endpoints found</p>
                </div>
                <div className="h-8 w-px bg-white/[0.08]" />
                <div>
                  <p className="text-xl font-bold text-foreground">2</p>
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
