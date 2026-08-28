import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  FolderKanban,
  MessagesSquare,
  UploadCloud,
  Compass,
  Sparkles,
  FlaskConical,
  TerminalSquare,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/useUIStore";
import { useProjectsStore } from "@/store/useProjectsStore";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const globalNav = [
  { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
  { label: "Projects", to: "/app/projects", icon: FolderKanban },
  { label: "AI Chat", to: "/app/chat", icon: MessagesSquare },
];

function projectNav(id: string) {
  return [
    { label: "Overview", to: `/app/projects/${id}`, icon: Compass, end: true },
    { label: "Upload API", to: `/app/projects/${id}/upload`, icon: UploadCloud },
    { label: "API Explorer", to: `/app/projects/${id}/explorer`, icon: Compass },
    { label: "AI Analysis", to: `/app/projects/${id}/analysis`, icon: Sparkles },
    { label: "Generated Tests", to: `/app/projects/${id}/tests`, icon: FlaskConical },
    { label: "Run Tests", to: `/app/projects/${id}/run`, icon: TerminalSquare },
    { label: "Reports", to: `/app/projects/${id}/reports`, icon: BarChart3 },
  ];
}

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, closeMobileSidebar } = useUIStore();
  const projects = useProjectsStore((s) => s.projects);
  const match = location.pathname.match(/^\/app\/projects\/([^/]+)/);
  const projectId = match?.[1];
  const project = projects.find((p) => p.id === projectId);

  const isActive = (to: string, end?: boolean) =>
    end ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <>
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeMobileSidebar}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>
      <motion.aside
        animate={{ width: sidebarCollapsed ? 76 : 260 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-svh w-[260px] shrink-0 flex-col border-r border-white/[0.06] bg-[#08080f] backdrop-blur-xl transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-30 lg:w-auto lg:translate-x-0 lg:bg-[#08080f]/80",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
      <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.06] px-4">
        <Link to="/" onClick={closeMobileSidebar} className="flex shrink-0 items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D5EF8] to-[#00E5FF] shadow-[0_0_20px_rgba(109,94,248,0.5)]">
            <svg viewBox="0 0 24 24" className="size-4.5 text-white" fill="none">
              <path d="M6 12.5L10 16.5L18 7.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden text-sm font-bold whitespace-nowrap text-foreground"
              >
                TestPilot AI
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      <nav className="scrollbar-none flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {project && (
          <div className="mb-4">
            {!sidebarCollapsed && (
              <Link
                to="/app/dashboard"
                onClick={closeMobileSidebar}
                className="mb-3 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" /> All projects
              </Link>
            )}
            {!sidebarCollapsed && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-primary/40 to-accent/20 text-[10px] font-bold text-white">
                  {project.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{project.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{project.baseUrl}</p>
                </div>
              </div>
            )}
            {projectNav(project.id).map((item) => (
              <NavItem key={item.to} {...item} active={isActive(item.to, item.end)} collapsed={sidebarCollapsed} />
            ))}
            <div className="my-3 h-px bg-white/[0.06]" />
          </div>
        )}

        {globalNav.map((item) => (
          <NavItem key={item.to} {...item} active={isActive(item.to)} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      <div className="hidden border-t border-white/[0.06] p-3 lg:block">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
        >
          {sidebarCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          {!sidebarCollapsed && "Collapse"}
        </button>
      </div>
      </motion.aside>
    </>
  );
}

function NavItem({
  label,
  to,
  icon: Icon,
  active,
  collapsed,
}: {
  label: string;
  to: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
}) {
  const closeMobileSidebar = useUIStore((s) => s.closeMobileSidebar);

  const content = (
    <Link
      to={to}
      onClick={closeMobileSidebar}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all",
        collapsed && "justify-center",
        active ? "bg-white/[0.08] text-foreground" : "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-y-0 left-0 w-0.5 rounded-full bg-gradient-to-b from-primary to-accent"
          transition={{ duration: 0.25 }}
        />
      )}
      <Icon className={cn("size-4 shrink-0", active && "text-primary")} />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return content;
}
