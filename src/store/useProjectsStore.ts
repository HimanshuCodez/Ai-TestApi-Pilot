import { create } from "zustand";
import { projects as seedProjects } from "@/services/mockData";
import type { Project, ProjectStatus } from "@/types";

export type Environment = "Development" | "Staging" | "Production";

interface CreateProjectInput {
  name: string;
  description: string;
  environment: Environment;
}

interface ProjectsState {
  projects: Project[];
  addProject: (input: CreateProjectInput) => Project;
  getProject: (id: string) => Project | undefined;
  updateProject: (id: string, patch: Partial<Project>) => void;
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "project";
}

const envTag: Record<Environment, string> = {
  Development: "dev",
  Staging: "staging",
  Production: "production",
};

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: seedProjects,

  addProject: ({ name, description, environment }) => {
    const slug = slugify(name);
    const id = `proj-${slug}-${Date.now().toString(36)}`;
    const status: ProjectStatus = "scanning";
    const project: Project = {
      id,
      name,
      description: description.trim() || "No description provided yet.",
      baseUrl: `https://api.${slug}.${environment === "Production" ? "com" : environment.toLowerCase() + ".dev"}`,
      status,
      healthScore: 0,
      securityScore: 0,
      endpointCount: 0,
      testsGenerated: 0,
      lastScanAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      tags: [envTag[environment]],
      runsToday: 0,
      passRate: 0,
    };
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  getProject: (id) => get().projects.find((p) => p.id === id),

  updateProject: (id, patch) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),
}));
