import { create } from "zustand";
import * as projectsApi from "@/services/api/projects";
import type { ApiProject } from "@/services/api/types";
import type { Project, ProjectStatus } from "@/types";

export type Environment = "Development" | "Staging" | "Production";

interface CreateProjectInput {
  name: string;
  description: string;
  environment: Environment;
}

interface ProjectsState {
  projects: Project[];
  hasLoaded: boolean;
  isLoading: boolean;
  fetchProjects: () => Promise<void>;
  addProject: (input: CreateProjectInput) => Promise<Project>;
  getProject: (id: string) => Project | undefined;
  updateProject: (id: string, patch: Partial<Project>) => void;
  upsertProject: (apiProject: ApiProject) => void;
}

function toFrontendProject(p: ApiProject, existing?: Project): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    baseUrl: p.baseUrl ?? "",
    status: p.status as ProjectStatus,
    healthScore: p.healthScore,
    securityScore: p.securityScore,
    endpointCount: existing?.endpointCount ?? 0,
    testsGenerated: existing?.testsGenerated ?? 0,
    lastScanAt: p.updatedAt,
    createdAt: p.createdAt,
    tags: existing?.tags ?? [],
    runsToday: existing?.runsToday ?? 0,
    passRate: existing?.passRate ?? 0,
  };
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  hasLoaded: false,
  isLoading: false,

  fetchProjects: async () => {
    set({ isLoading: true });
    try {
      const apiProjects = await projectsApi.listProjects();
      set((s) => ({
        projects: apiProjects.map((p) => toFrontendProject(p, s.projects.find((existing) => existing.id === p.id))),
        hasLoaded: true,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false, hasLoaded: true });
    }
  },

  addProject: async ({ name, description }) => {
    const apiProject = await projectsApi.createProject(name, description);
    const project = toFrontendProject(apiProject);
    set((s) => ({ projects: [project, ...s.projects] }));
    return project;
  },

  getProject: (id) => get().projects.find((p) => p.id === id),

  updateProject: (id, patch) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  upsertProject: (apiProject) =>
    set((s) => {
      const existing = s.projects.find((p) => p.id === apiProject.id);
      const project = toFrontendProject(apiProject, existing);
      return {
        projects: existing ? s.projects.map((p) => (p.id === project.id ? project : p)) : [project, ...s.projects],
      };
    }),
}));
