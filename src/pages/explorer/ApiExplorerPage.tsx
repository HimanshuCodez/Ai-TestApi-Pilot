import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Lock, LockOpen, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { MethodBadge } from "@/components/shared/MethodBadge";
import { CodeBlock } from "@/components/shared/CodeBlock";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useWorkflowStore } from "@/store/useWorkflowStore";
import { listEndpoints } from "@/services/api/projects";
import type { ApiEndpoint } from "@/services/api/types";
import type { HttpMethod } from "@/types";
import { cn } from "@/lib/utils";

export default function ApiExplorerPage() {
  const { projectId = "" } = useParams();
  const navigate = useNavigate();
  const project = useProjectsStore((s) => s.projects.find((p) => p.id === projectId));
  const workflow = useWorkflowStore((s) => s.getWorkflow(projectId));

  const [endpoints, setEndpoints] = useState<ApiEndpoint[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [collapsedTags, setCollapsedTags] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    listEndpoints(projectId)
      .then((eps) => {
        if (cancelled) return;
        setEndpoints(eps);
        setSelectedId((current) => current ?? eps[0]?.id);
      })
      .catch(() => !cancelled && setEndpoints([]));
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const grouped = useMemo(() => {
    const filtered = endpoints.filter(
      (e) =>
        !query ||
        e.path.toLowerCase().includes(query.toLowerCase()) ||
        e.summary.toLowerCase().includes(query.toLowerCase()) ||
        e.tag.toLowerCase().includes(query.toLowerCase())
    );
    const map = new Map<string, ApiEndpoint[]>();
    filtered.forEach((e) => {
      const list = map.get(e.tag) ?? [];
      list.push(e);
      map.set(e.tag, list);
    });
    return Array.from(map.entries());
  }, [endpoints, query]);

  const selected = endpoints.find((e) => e.id === selectedId) ?? endpoints[0];

  if (!project) return <Navigate to="/app/projects" replace />;

  if (!workflow.uploaded) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow={project.name} title="API Explorer" description="Browse every endpoint, schema and example." />
        <EmptyState
          icon={Sparkles}
          title="Connect your API first"
          description="TestPilot AI needs to map your endpoints before you can explore them."
          actionLabel="Go to Upload"
          onAction={() => navigate(`/app/projects/${projectId}/upload`)}
        />
      </div>
    );
  }

  function toggleTag(tag: string) {
    setCollapsedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  const params = selected?.parameters.filter((p) => p.in !== "header") ?? [];
  const headers = selected?.parameters.filter((p) => p.in === "header") ?? [];
  const requestBody = selected?.requestBodySchema ? JSON.stringify(selected.requestBodySchema, null, 2) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={project.name} title="API Explorer" description={`${endpoints.length} endpoints across ${grouped.length} resources.`} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr] lg:items-start">
        <Card className="gap-0 overflow-hidden py-4">
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search endpoints..." className="pl-9" />
            </div>
          </div>
          <div className="scrollbar-none max-h-[640px] overflow-y-auto px-2 pb-2">
            {grouped.map(([tag, items]) => {
              const isCollapsed = collapsedTags.has(tag);
              return (
                <div key={tag} className="mb-1">
                  <button
                    onClick={() => toggleTag(tag)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground"
                  >
                    <span className="flex items-center gap-1.5">
                      {tag} <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] font-medium normal-case text-muted-foreground">{items.length}</span>
                    </span>
                    <ChevronDown className={cn("size-3.5 transition-transform", isCollapsed && "-rotate-90")} />
                  </button>
                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        {items.map((ep) => (
                          <button
                            key={ep.id}
                            onClick={() => setSelectedId(ep.id)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                              selected?.id === ep.id ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
                            )}
                          >
                            <MethodBadge method={ep.method as HttpMethod} className="h-5 w-[52px] text-[10px]" />
                            <span className="truncate font-mono text-xs">{ep.path}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Card>

        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card className="gap-0 overflow-hidden py-0">
                <div className="border-b border-white/[0.06] p-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <MethodBadge method={selected.method as HttpMethod} className="h-7 w-[70px] text-xs" />
                    <code className="font-mono text-base font-semibold text-foreground">{selected.path}</code>
                    <span
                      className={cn(
                        "ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                        selected.authRequired ? "border-warning/25 bg-warning/10 text-warning" : "border-success/25 bg-success/10 text-success"
                      )}
                    >
                      {selected.authRequired ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
                      {selected.authRequired ? "Auth required" : "Public"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{selected.summary || "No summary provided."}</p>
                </div>

                <Tabs defaultValue="overview" className="gap-0">
                  <div className="sticky top-0 z-10 border-b border-white/[0.06] bg-card/95 px-6 py-3 backdrop-blur">
                    <TabsList>
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="params">Parameters ({params.length})</TabsTrigger>
                      <TabsTrigger value="headers">Headers ({headers.length})</TabsTrigger>
                      <TabsTrigger value="responses">Responses ({selected.responses.length})</TabsTrigger>
                    </TabsList>
                  </div>

                  <div className="p-6">
                    <TabsContent value="overview" className="mt-0 space-y-5">
                      {requestBody ? (
                        <div>
                          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Request Body</p>
                          <CodeBlock code={requestBody} language="json" />
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">This endpoint does not require a request body.</p>
                      )}
                      {selected.responses[0] && (
                        <div>
                          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Example Response ({selected.responses[0].status})</p>
                          <CodeBlock code={selected.responses[0].example || "{}"} language="json" />
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="params" className="mt-0">
                      {params.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No query or path parameters.</p>
                      ) : (
                        <ParamTable rows={params} />
                      )}
                    </TabsContent>

                    <TabsContent value="headers" className="mt-0">
                      {headers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No required headers.</p>
                      ) : (
                        <ParamTable rows={headers} />
                      )}
                    </TabsContent>

                    <TabsContent value="responses" className="mt-0 space-y-4">
                      {selected.responses.map((r) => (
                        <div key={r.status}>
                          <div className="mb-2 flex items-center gap-2">
                            <span
                              className={cn(
                                "rounded-md px-2 py-0.5 font-mono text-xs font-bold",
                                r.status < 300 ? "bg-success/15 text-success" : r.status < 500 ? "bg-warning/15 text-warning" : "bg-critical/15 text-critical"
                              )}
                            >
                              {r.status}
                            </span>
                            <span className="text-sm text-muted-foreground">{r.description}</span>
                          </div>
                          <CodeBlock code={r.example || "(empty body)"} language="json" />
                        </div>
                      ))}
                    </TabsContent>
                  </div>
                </Tabs>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => navigate(`/app/projects/${projectId}/tests`)}>Generate AI Tests</Button>
      </div>
    </div>
  );
}

function ParamTable({ rows }: { rows: { name: string; type: string; required: boolean; in: string; description: string; example?: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] bg-white/[0.02] text-left text-xs text-muted-foreground">
            <th className="px-4 py-2.5 font-medium">Name</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">In</th>
            <th className="px-4 py-2.5 font-medium">Required</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-white/[0.04] last:border-0">
              <td className="px-4 py-2.5 font-mono text-xs text-foreground">{row.name}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.type}</td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.in}</td>
              <td className="px-4 py-2.5">
                {row.required ? (
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">Required</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Optional</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-xs text-muted-foreground">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
