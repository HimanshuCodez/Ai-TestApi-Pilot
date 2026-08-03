import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BarChart3,
  Bug,
  FlaskConical,
  FolderKanban,
  Layers,
  MessagesSquare,
  Plus,
  Rocket,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  UploadCloud,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { ChartTooltip } from "@/components/shared/ChartTooltip";
import { ProjectCard } from "@/components/shared/ProjectCard";
import { ParallaxGlow } from "@/components/shared/ParallaxGlow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip as RTooltip } from "recharts";
import { useProjectsStore } from "@/store/useProjectsStore";
import { useAuthStore } from "@/store/useAuthStore";
import { activity, chartData } from "@/services/mockData";
import type { ActivityItem } from "@/types";

const activityConfig: Record<ActivityItem["type"], { icon: React.ElementType; className: string }> = {
  scan: { icon: Sparkles, className: "text-primary bg-primary/10" },
  test: { icon: FlaskConical, className: "text-success bg-success/10" },
  bug: { icon: Bug, className: "text-critical bg-critical/10" },
  deploy: { icon: Rocket, className: "text-accent bg-accent/10" },
  chat: { icon: MessagesSquare, className: "text-info bg-info/10" },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Burning the midnight oil";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const BUG_COLORS = ["#6D5EF8", "#00E5FF", "#2EE6A6", "#FFB454", "#FF5470"];

export default function DashboardPage() {
  const navigate = useNavigate();
  const projects = useProjectsStore((s) => s.projects);
  const user = useAuthStore((s) => s.user);

  const stats = useMemo(() => {
    const totalEndpoints = projects.reduce((a, p) => a + p.endpointCount, 0);
    const totalTests = projects.reduce((a, p) => a + p.testsGenerated, 0);
    const scored = projects.filter((p) => p.securityScore > 0);
    const avgSecurity = scored.length
      ? Math.round(scored.reduce((a, p) => a + p.securityScore, 0) / scored.length)
      : 0;
    const apisTested = projects.filter((p) => p.status !== "scanning").length;
    return { totalEndpoints, totalTests, avgSecurity, apisTested };
  }, [projects]);

  const primaryProject = projects[0];

  const quickActions = [
    {
      label: "Upload a new API",
      description: "Import a Swagger, OpenAPI or Postman spec",
      icon: UploadCloud,
      to: primaryProject ? `/app/projects/${primaryProject.id}/upload` : "/app/projects/new",
    },
    {
      label: "Run a test suite",
      description: "Execute AI-generated tests in real time",
      icon: TerminalSquare,
      to: primaryProject ? `/app/projects/${primaryProject.id}/run` : "/app/projects",
    },
    {
      label: "View the latest report",
      description: "Health, security and coverage breakdown",
      icon: BarChart3,
      to: primaryProject ? `/app/projects/${primaryProject.id}/reports` : "/app/projects",
    },
    {
      label: "Ask TestPilot AI",
      description: "Chat about failures, risks and fixes",
      icon: MessagesSquare,
      to: "/app/chat",
    },
  ];

  return (
    <div className="relative space-y-8 pb-24">
      <ParallaxGlow />

      <PageHeader
        eyebrow="Dashboard"
        title={`${greeting()}, ${user?.name?.split(" ")[0] ?? "there"}`}
        description="Here's what TestPilot AI has been watching over while you were away."
        actions={
          <Button size="lg" onClick={() => navigate("/app/projects/new")} className="shadow-lg">
            <Plus className="size-4.5" /> New Project
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Projects" value={projects.length} icon={FolderKanban} trend={8} accent="primary" delay={0} />
        <StatCard label="APIs Tested" value={stats.apisTested} icon={FlaskConical} trend={12} accent="accent" delay={0.05} />
        <StatCard label="Total Endpoints" value={stats.totalEndpoints} icon={Layers} trend={5} accent="success" delay={0.1} />
        <StatCard label="Security Score" value={stats.avgSecurity} suffix="%" icon={ShieldCheck} trend={-3} accent="warning" delay={0.15} />
        <StatCard label="AI Generated Tests" value={stats.totalTests} icon={Sparkles} trend={24} accent="primary" delay={0.2} className="col-span-2 sm:col-span-1" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Pass Rate Trend" description="Across all projects, last 7 days" delay={0.05} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData.passRateTrend} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="passRateFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6D5EF8" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#6D5EF8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: "#8b8b9e", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis domain={[70, 100]} tick={{ fill: "#8b8b9e", fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
              <RTooltip content={ChartTooltip} cursor={{ stroke: "rgba(255,255,255,0.12)" }} />
              <Area
                type="monotone"
                dataKey="passRate"
                name="Pass rate"
                stroke="#6D5EF8"
                strokeWidth={2}
                fill="url(#passRateFill)"
                dot={{ r: 3, fill: "#6D5EF8", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Bug Distribution" description="Open issues by category" delay={0.1}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <RTooltip content={ChartTooltip} />
              <Pie
                data={chartData.bugDistribution}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                strokeWidth={0}
              >
                {chartData.bugDistribution.map((entry, i) => (
                  <Cell key={entry.name} fill={BUG_COLORS[i % BUG_COLORS.length]} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Response Time" description="p50 / p95 latency across endpoints (ms)" delay={0.1} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData.responseTime} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="day" tick={{ fill: "#8b8b9e", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8b8b9e", fontSize: 12 }} axisLine={false} tickLine={false} width={34} />
              <RTooltip content={ChartTooltip} cursor={{ stroke: "rgba(255,255,255,0.12)" }} />
              <Legend
                verticalAlign="top"
                height={28}
                iconType="circle"
                iconSize={8}
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
              <Line type="monotone" dataKey="p50" name="p50" stroke="#00E5FF" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="p95" name="p95" stroke="#6D5EF8" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Endpoints" description="By request volume" delay={0.15}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.requestsByEndpoint} layout="vertical" margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: "#8b8b9e", fontSize: 11, fontFamily: "var(--font-mono)" }}
                axisLine={false}
                tickLine={false}
              />
              <RTooltip content={ChartTooltip} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="requests" name="Requests" fill="#00E5FF" radius={[0, 6, 6, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-2"
        >
          <Card className="gap-4 py-6">
            <div className="flex items-center justify-between px-6">
              <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
              <span className="text-xs text-muted-foreground">Live feed</span>
            </div>
            <div className="px-6">
              <ol className="space-y-0">
                {activity.map((item, i) => {
                  const { icon: Icon, className } = activityConfig[item.type];
                  const isLast = i === activity.length - 1;
                  return (
                    <motion.li
                      key={item.id}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.06 }}
                      className="relative flex gap-3.5 pb-6 last:pb-0"
                    >
                      {!isLast && <span className="absolute top-8 left-[15px] h-[calc(100%-1rem)] w-px bg-white/[0.08]" />}
                      <span className={`relative flex size-8 shrink-0 items-center justify-center rounded-full ${className}`}>
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <span className="shrink-0 pt-1 text-[11px] whitespace-nowrap text-muted-foreground">
                        {formatDistanceToNowStrict(new Date(item.timestamp), { addSuffix: true })}
                      </span>
                    </motion.li>
                  );
                })}
              </ol>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card className="gap-4 py-6">
            <h3 className="px-6 text-sm font-semibold text-foreground">Quick Actions</h3>
            <div className="flex flex-col gap-1.5 px-3">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.to)}
                  className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-primary transition-transform group-hover:scale-105">
                    <action.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{action.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Projects</h2>
          <Link to="/app/projects" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            View all <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.slice(0, 3).map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>

      <motion.button
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => navigate("/app/projects/new")}
        className="fixed right-8 bottom-8 z-40 hidden items-center gap-2.5 rounded-full bg-gradient-to-r from-[#6D5EF8] to-[#8B7CFA] px-6 py-4 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(109,94,248,0.4),0_20px_50px_-12px_rgba(109,94,248,0.7)] sm:flex"
      >
        <span className="absolute inset-0 -z-10 animate-glow-pulse rounded-full bg-primary/50 blur-xl" />
        <Plus className="size-5" />
        New Project
      </motion.button>
    </div>
  );
}
