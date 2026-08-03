import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Search, Bell, Sun, Moon, LogOut, Settings, User as UserIcon, Menu, CircleAlert, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUIStore } from "@/store/useUIStore";
import { useAuthStore } from "@/store/useAuthStore";
import { activity } from "@/services/mockData";
import { cn } from "@/lib/utils";

const notifIcon = {
  bug: CircleAlert,
  scan: Sparkles,
  test: CheckCircle2,
  deploy: Sparkles,
  chat: Sparkles,
} as const;

export function Navbar() {
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#050509]/70 px-4 backdrop-blur-xl sm:px-6">
      <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={toggleSidebar}>
        <Menu className="size-4.5" />
      </Button>

      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="group flex h-9 w-full max-w-sm items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-muted-foreground transition-colors hover:border-white/15 hover:bg-white/[0.06]"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden truncate sm:inline">Search projects, endpoints, actions...</span>
        <span className="ml-auto hidden shrink-0 items-center gap-0.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:flex">
          Ctrl K
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="relative">
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-critical shadow-[0_0_6px_rgba(255,84,112,0.8)]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 space-y-0.5 overflow-y-auto scrollbar-none">
              {activity.map((a) => {
                const Icon = notifIcon[a.type] ?? Sparkles;
                return (
                  <DropdownMenuItem key={a.id} className="flex-col items-start gap-0.5 py-2">
                    <div className="flex w-full items-center gap-2">
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          a.type === "bug" ? "text-critical" : a.type === "scan" ? "text-primary" : "text-success"
                        )}
                      />
                      <span className="truncate text-xs font-medium text-foreground">{a.title}</span>
                    </div>
                    <p className="line-clamp-2 pl-5.5 text-[11px] text-muted-foreground">{a.description}</p>
                  </DropdownMenuItem>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 flex items-center gap-2 rounded-full transition-opacity hover:opacity-80">
              <Avatar className="size-8">
                <AvatarFallback>{user?.avatarInitials ?? "TP"}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-foreground">{user?.name ?? "Guest"}</span>
              <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <UserIcon /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
