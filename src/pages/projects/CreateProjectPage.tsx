import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Boxes, Loader2, Rocket, X } from "lucide-react";
import { GlowBackground } from "@/components/shared/GlowBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProjectsStore, type Environment } from "@/store/useProjectsStore";
import { cn } from "@/lib/utils";

const environments: { value: Environment; label: string; description: string; dot: string }[] = [
  { value: "Development", label: "Development", description: "Sandbox — safe to break things", dot: "bg-info" },
  { value: "Staging", label: "Staging", description: "Pre-production, mirrors real traffic", dot: "bg-warning" },
  { value: "Production", label: "Production", description: "Live — customers depend on this", dot: "bg-critical" },
];

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const addProject = useProjectsStore((s) => s.addProject);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [environment, setEnvironment] = useState<Environment>("Development");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 1 && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));
    const project = addProject({ name: name.trim(), description: description.trim(), environment });
    navigate(`/app/projects/${project.id}/upload`);
  };

  return (
    <div className="relative flex min-h-[calc(100svh-8rem)] items-center justify-center py-10">
      <GlowBackground />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="glow-border relative w-full max-w-lg rounded-3xl"
      >
        <div className="glass-strong relative overflow-hidden rounded-3xl p-8 shadow-2xl">
          <button
            onClick={() => navigate("/app/projects")}
            className="absolute top-5 right-5 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-4.5" />
          </button>

          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent/15"
          >
            <div className="animate-glow-pulse absolute inset-0 rounded-2xl bg-primary/30 blur-xl" />
            <Rocket className="animate-float relative size-7 text-primary" />
          </motion.div>

          <div className="mb-7 text-center">
            <h1 className="text-xl font-bold text-foreground">Create a new project</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Give your API a home. You'll upload its spec and let AI take it from there.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="space-y-1.5">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Checkout Payments API"
                maxLength={60}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this API do, and who depends on it?"
                rows={3}
                maxLength={220}
              />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="space-y-1.5">
              <Label>Environment</Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as Environment)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {environments.map((env) => (
                    <SelectItem key={env.value} value={env.value}>
                      <span className={cn("size-2 rounded-full", env.dot)} />
                      <span>
                        <span className="font-medium text-foreground">{env.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{env.description}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-xs text-muted-foreground"
            >
              <Boxes className="size-4 shrink-0 text-primary" />
              Next you'll upload a Swagger, OpenAPI or Postman spec and TestPilot AI will map every endpoint automatically.
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => navigate("/app/projects")}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={!canSubmit}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    Continue <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
