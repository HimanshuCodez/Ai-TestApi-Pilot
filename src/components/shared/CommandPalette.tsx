import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderKanban,
  MessagesSquare,
  UploadCloud,
  Sparkles,
  FlaskConical,
  TerminalSquare,
  BarChart3,
  Plus,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useUIStore } from "@/store/useUIStore";
import { useProjectsStore } from "@/store/useProjectsStore";

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore();
  const projects = useProjectsStore((s) => s.projects);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  const go = (path: string) => {
    navigate(path);
    setCommandPaletteOpen(false);
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Search projects, endpoints, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go("/app/dashboard")}>
            <LayoutDashboard /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go("/app/projects")}>
            <FolderKanban /> All Projects
          </CommandItem>
          <CommandItem onSelect={() => go("/app/chat")}>
            <MessagesSquare /> AI Chat
          </CommandItem>
          <CommandItem onSelect={() => go("/app/projects/new")}>
            <Plus /> Create New Project
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Projects">
          {projects.map((p) => (
            <CommandItem key={p.id} onSelect={() => go(`/app/projects/${p.id}`)}>
              <FolderKanban /> {p.name}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => go(`/app/projects/${projects[0].id}/upload`)}>
            <UploadCloud /> Upload Swagger File
          </CommandItem>
          <CommandItem onSelect={() => go(`/app/projects/${projects[0].id}/analysis`)}>
            <Sparkles /> Run AI Analysis
          </CommandItem>
          <CommandItem onSelect={() => go(`/app/projects/${projects[0].id}/tests`)}>
            <FlaskConical /> View Generated Tests
          </CommandItem>
          <CommandItem onSelect={() => go(`/app/projects/${projects[0].id}/run`)}>
            <TerminalSquare /> Run Test Suite
          </CommandItem>
          <CommandItem onSelect={() => go(`/app/projects/${projects[0].id}/reports`)}>
            <BarChart3 /> View Reports
          </CommandItem>
          <CommandItem onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun /> : <Moon />} Toggle Theme
            <CommandShortcut>⌘J</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
