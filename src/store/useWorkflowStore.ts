import { create } from "zustand";
import { recentRuns, testCases } from "@/services/mockData";
import type { RunStatus, TestCase } from "@/types";

export interface RunResult {
  status: RunStatus;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  finishedAt: string;
}

export interface ProjectWorkflow {
  uploaded: boolean;
  fileName?: string;
  fileMeta?: string;
  analyzed: boolean;
  testsGenerated: boolean;
  tests: TestCase[];
  testsRun: boolean;
  runResult?: RunResult;
}

const EMPTY: ProjectWorkflow = {
  uploaded: false,
  analyzed: false,
  testsGenerated: false,
  tests: [],
  testsRun: false,
};

function seededWorkflow(projectId: string): ProjectWorkflow | null {
  const run = recentRuns.find((r) => r.projectId === projectId);
  if (projectId === "proj-payflow" || projectId === "proj-nova" || projectId === "proj-orbit") {
    return {
      uploaded: true,
      fileName: "openapi.json",
      fileMeta: "412 KB · OpenAPI 3.0",
      analyzed: true,
      testsGenerated: true,
      tests: testCases,
      testsRun: true,
      runResult: run
        ? {
            status: run.status,
            total: run.total,
            passed: run.passed,
            failed: run.failed,
            skipped: run.skipped,
            durationMs: run.durationMs,
            finishedAt: run.startedAt,
          }
        : undefined,
    };
  }
  if (projectId === "proj-atlas") {
    return {
      uploaded: true,
      fileName: "atlas-gateway.yaml",
      fileMeta: "168 KB · OpenAPI 3.1",
      analyzed: false,
      testsGenerated: false,
      tests: [],
      testsRun: false,
    };
  }
  return null;
}

interface WorkflowState {
  byProject: Record<string, ProjectWorkflow>;
  getWorkflow: (projectId: string) => ProjectWorkflow;
  setUploaded: (projectId: string, fileName: string, fileMeta: string) => void;
  setAnalyzed: (projectId: string) => void;
  setTests: (projectId: string, tests: TestCase[]) => void;
  updateTest: (projectId: string, testId: string, patch: Partial<TestCase>) => void;
  setTestsRun: (projectId: string, result: RunResult) => void;
  resetTestsRun: (projectId: string) => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  byProject: {},

  getWorkflow: (projectId) => {
    const existing = get().byProject[projectId];
    if (existing) return existing;
    return seededWorkflow(projectId) ?? EMPTY;
  },

  setUploaded: (projectId, fileName, fileMeta) =>
    set((s) => ({
      byProject: {
        ...s.byProject,
        [projectId]: { ...get().getWorkflow(projectId), uploaded: true, fileName, fileMeta },
      },
    })),

  setAnalyzed: (projectId) =>
    set((s) => ({
      byProject: {
        ...s.byProject,
        [projectId]: { ...get().getWorkflow(projectId), analyzed: true },
      },
    })),

  setTests: (projectId, tests) =>
    set((s) => ({
      byProject: {
        ...s.byProject,
        [projectId]: { ...get().getWorkflow(projectId), testsGenerated: true, tests, testsRun: false, runResult: undefined },
      },
    })),

  updateTest: (projectId, testId, patch) =>
    set((s) => {
      const wf = get().getWorkflow(projectId);
      return {
        byProject: {
          ...s.byProject,
          [projectId]: { ...wf, tests: wf.tests.map((t) => (t.id === testId ? { ...t, ...patch } : t)) },
        },
      };
    }),

  setTestsRun: (projectId, result) =>
    set((s) => ({
      byProject: {
        ...s.byProject,
        [projectId]: { ...get().getWorkflow(projectId), testsRun: true, runResult: result },
      },
    })),

  resetTestsRun: (projectId) =>
    set((s) => ({
      byProject: {
        ...s.byProject,
        [projectId]: { ...get().getWorkflow(projectId), testsRun: false, runResult: undefined },
      },
    })),
}));
