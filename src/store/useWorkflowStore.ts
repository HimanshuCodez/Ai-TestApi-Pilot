import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RunStatus, TestCase, TestKind } from "@/types";
import type { ApiGeneratedTest, ApiTestResult } from "@/services/api/types";

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

interface WorkflowState {
  byProject: Record<string, ProjectWorkflow>;
  getWorkflow: (projectId: string) => ProjectWorkflow;
  setWorkflow: (projectId: string, patch: Partial<ProjectWorkflow>) => void;
  setUploaded: (projectId: string, fileName: string, fileMeta: string) => void;
  setAnalyzed: (projectId: string) => void;
  setTests: (projectId: string, tests: TestCase[]) => void;
  updateTest: (projectId: string, testId: string, patch: Partial<TestCase>) => void;
  applyRunResults: (projectId: string, tests: TestCase[], result: RunResult) => void;
  resetTestsRun: (projectId: string) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      byProject: {},

      getWorkflow: (projectId) => get().byProject[projectId] ?? EMPTY,

      setWorkflow: (projectId, patch) =>
        set((s) => ({
          byProject: { ...s.byProject, [projectId]: { ...get().getWorkflow(projectId), ...patch } },
        })),

      setUploaded: (projectId, fileName, fileMeta) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: { ...get().getWorkflow(projectId), uploaded: true, fileName, fileMeta },
          },
        })),

      setAnalyzed: (projectId) =>
        set((s) => ({
          byProject: { ...s.byProject, [projectId]: { ...get().getWorkflow(projectId), analyzed: true } },
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

      applyRunResults: (projectId, tests, result) =>
        set((s) => {
          const wf = get().getWorkflow(projectId);
          return {
            byProject: {
              ...s.byProject,
              [projectId]: {
                ...wf,
                tests,
                testsGenerated: wf.testsGenerated || tests.length > 0,
                testsRun: true,
                runResult: result,
              },
            },
          };
        }),

      resetTestsRun: (projectId) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: { ...get().getWorkflow(projectId), testsRun: false, runResult: undefined },
          },
        })),
    }),
    { name: "testpilot-workflow" }
  )
);

/** Maps a backend GeneratedTest (+ its TestResult, once a run has happened) into the UI's local TestCase shape. */
export function toWorkflowTestCase(apiTest: ApiGeneratedTest, result?: ApiTestResult): TestCase {
  const kind: TestKind = apiTest.category === "auth" ? "security" : (apiTest.category as TestKind);

  const requestLines = [`${apiTest.method} ${apiTest.path}`];
  const headers = apiTest.requestSpec?.headers;
  if (headers && Object.keys(headers).length > 0) {
    requestLines.push(...Object.entries(headers).map(([key, value]) => `${key}: ${String(value)}`));
  }
  const body = apiTest.requestSpec?.body;
  if (body !== undefined && body !== null) {
    requestLines.push(JSON.stringify(body, null, 2));
  }

  const expected = `Status ${apiTest.expected.statusCodes.join(" or ")}${
    apiTest.expected.notes ? ` — ${apiTest.expected.notes}` : ""
  }`;

  return {
    id: apiTest.id,
    endpointId: apiTest.endpointId,
    method: apiTest.method as TestCase["method"],
    path: apiTest.path,
    kind,
    title: apiTest.title,
    description: apiTest.description,
    request: requestLines.join("\n"),
    expected,
    status: result ? (result.passed ? "passed" : "failed") : undefined,
    durationMs: result?.durationMs ?? undefined,
    severity: apiTest.severity,
  };
}
