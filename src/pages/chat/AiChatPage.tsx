import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Bug, Gauge, Send, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/useAuthStore";
import { useProjectsStore } from "@/store/useProjectsStore";
import { securityIssues } from "@/services/mockData";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const SUGGESTIONS = [
  { icon: ShieldAlert, label: "What are my biggest security risks?" },
  { icon: TrendingUp, label: "How is my API health trending?" },
  { icon: Bug, label: "How do I fix the SQL injection issue?" },
  { icon: Gauge, label: "Summarize my last test run" },
];

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export default function AiChatPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const projects = useProjectsStore((s) => s.projects);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: nextId("m"),
      role: "assistant",
      content:
        "Hey! I'm TestPilot AI. Ask me about security risks, API health, test coverage, or how to fix a specific vulnerability — I'm watching all of your projects.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [streaming, setStreaming] = useState<{ id: string; words: string[]; count: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isThinking, streaming]);

  useEffect(() => {
    if (!streaming) return;
    if (streaming.count >= streaming.words.length) {
      setStreaming(null);
      return;
    }
    const t = setTimeout(() => {
      setStreaming((s) => (s ? { ...s, count: s.count + 1 } : s));
      setMessages((prev) =>
        prev.map((m) => (m.id === streaming.id ? { ...m, content: streaming.words.slice(0, streaming.count + 1).join(" ") } : m))
      );
    }, 38);
    return () => clearTimeout(t);
  }, [streaming]);

  function generateReply(text: string): string {
    const q = text.toLowerCase();
    const matchedProject = projects.find((p) => q.includes(p.name.toLowerCase()));

    if (q.includes("sql")) {
      const issue = securityIssues.find((i) => i.title.toLowerCase().includes("sql"));
      if (issue) return `${issue.fix} This closes the ${issue.title.toLowerCase()} found on ${issue.method} ${issue.endpoint} — ${issue.risk}`;
    }
    if (q.includes("jwt") || q.includes("token") || q.includes("auth")) {
      const issue = securityIssues.find((i) => i.category === "Authentication");
      if (issue) return `On ${issue.method} ${issue.endpoint}: ${issue.description} Fix: ${issue.fix}`;
    }
    if (q.includes("rate limit")) {
      const issue = securityIssues.find((i) => i.title.toLowerCase().includes("rate limit"));
      if (issue) return `${issue.description} ${issue.fix}`;
    }
    if (q.includes("risk") || q.includes("security") || q.includes("vulnerab")) {
      const critical = securityIssues.filter((i) => i.severity === "critical");
      const high = securityIssues.filter((i) => i.severity === "high");
      const top = critical[0] ?? high[0];
      return `Across your projects I'm tracking ${critical.length} critical and ${high.length} high-severity issues. The most urgent is "${top?.title}" on ${top?.method} ${top?.endpoint} — ${top?.risk} My suggested fix: ${top?.fix}`;
    }
    if (q.includes("coverage") || q.includes("test run") || q.includes("last run") || q.includes("summarize")) {
      const withTests = projects.filter((p) => p.testsGenerated > 0);
      const avgPass = withTests.length ? (withTests.reduce((a, p) => a + p.passRate, 0) / withTests.length).toFixed(1) : "0";
      const totalTests = projects.reduce((a, p) => a + p.testsGenerated, 0);
      return `You have ${totalTests} AI-generated tests across ${projects.length} projects, averaging a ${avgPass}% pass rate. ${
        withTests.length ? `${withTests[0].name} last ran at ${withTests[0].passRate}% passing.` : "Generate a suite to get started."
      }`;
    }
    if (q.includes("health") || q.includes("trend") || q.includes("score")) {
      const avgHealth = projects.length ? Math.round(projects.reduce((a, p) => a + p.healthScore, 0) / projects.length) : 0;
      const avgSecurity = projects.length ? Math.round(projects.reduce((a, p) => a + p.securityScore, 0) / projects.length) : 0;
      return `Your average API health score is ${avgHealth}% with an average security score of ${avgSecurity}%. ${
        projects.some((p) => p.status === "critical") ? "One or more projects need urgent attention — check the Reports tab for details." : "Nothing urgent right now, but I'd keep an eye on any project below 80%."
      }`;
    }
    if (matchedProject) {
      return `${matchedProject.name} is at a ${matchedProject.healthScore}% health score and ${matchedProject.securityScore}% security score, with ${matchedProject.endpointCount} mapped endpoints and a ${matchedProject.passRate}% pass rate across ${matchedProject.testsGenerated} tests.`;
    }
    return "I can help you understand security risks, API health trends, test coverage, or walk through a fix for a specific vulnerability. Try asking about a project by name, or one of the suggestions below.";
  }

  function handleSend(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || isThinking || streaming) return;

    const userMsg: Message = { id: nextId("m"), role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    setTimeout(() => {
      const reply = generateReply(text);
      const words = reply.split(" ");
      const replyId = nextId("m");
      setIsThinking(false);
      setMessages((prev) => [...prev, { id: replyId, role: "assistant", content: "", timestamp: new Date().toISOString() }]);
      setStreaming({ id: replyId, words, count: 0 });
    }, 700);
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-6">
      <PageHeader eyebrow="AI Chat" title="Ask TestPilot AI" description="Real-time answers about your APIs, risks, and fixes." />

      <Card className="flex flex-1 flex-col gap-0 overflow-hidden py-0">
        <div ref={scrollRef} className="scrollbar-none flex-1 space-y-5 overflow-y-auto p-6">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn("flex items-start gap-3", m.role === "user" && "flex-row-reverse")}
            >
              <Avatar className="mt-0.5">
                {m.role === "assistant" ? (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                    <Sparkles className="size-4" />
                  </AvatarFallback>
                ) : (
                  <AvatarFallback>{user?.avatarInitials ?? "U"}</AvatarFallback>
                )}
              </Avatar>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  m.role === "assistant" ? "glass border border-white/[0.08] text-foreground" : "bg-gradient-to-r from-[#6D5EF8] to-[#8B7CFA] text-white"
                )}
              >
                {m.content}
                {streaming?.id === m.id && (
                  <motion.span
                    className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-primary/70"
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, repeatType: "reverse" }}
                  />
                )}
              </div>
            </motion.div>
          ))}

          <AnimatePresence>
            {isThinking && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-start gap-3">
                <Avatar className="mt-0.5">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent">
                    <Sparkles className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="glass flex items-center gap-1.5 rounded-2xl border border-white/[0.08] px-4 py-3.5">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="size-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 border-t border-white/[0.06] px-6 py-4">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => handleSend(s.label)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <s.icon className="size-3.5" /> {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 border-t border-white/[0.06] p-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about a vulnerability, a project, or your test coverage..."
            rows={1}
            className="max-h-32 min-h-11 resize-none"
          />
          <Button size="icon" onClick={() => handleSend()} disabled={!input.trim() || isThinking || !!streaming}>
            <Send className="size-4" />
          </Button>
        </div>
      </Card>

      {projects[0] && (
        <button
          onClick={() => navigate(`/app/projects/${projects[0].id}/reports`)}
          className="flex items-center gap-1.5 self-end text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View full report for {projects[0].name} <ArrowRight className="size-3.5" />
        </button>
      )}
    </div>
  );
}
