import { apiRequest } from "@/lib/api";
import type {
  ApiEndpoint,
  ApiFinding,
  ApiGeneratedTest,
  ApiProject,
  ApiReport,
  ApiTestRun,
  JobRef,
} from "./types";

export async function createProject(name: string, description: string, tags: string[] = []): Promise<ApiProject> {
  return apiRequest("/projects", { method: "POST", body: { name, description, tags } });
}

export async function listProjects(): Promise<ApiProject[]> {
  return apiRequest("/projects");
}

export async function getProject(projectId: string): Promise<ApiProject> {
  return apiRequest(`/projects/${projectId}`);
}

export async function listEndpoints(projectId: string): Promise<ApiEndpoint[]> {
  return apiRequest(`/projects/${projectId}/endpoints`);
}

export async function connectUrl(projectId: string, url: string): Promise<JobRef> {
  return apiRequest(`/projects/${projectId}/connect/url`, { method: "POST", body: { url } });
}

export async function connectFile(projectId: string, fileName: string, content: string): Promise<JobRef> {
  return apiRequest(`/projects/${projectId}/connect/file`, { method: "POST", body: { fileName, content } });
}

export async function connectGithub(projectId: string, repoUrl: string): Promise<JobRef> {
  return apiRequest(`/projects/${projectId}/connect/github`, { method: "POST", body: { repoUrl } });
}

export async function updateBaseUrl(projectId: string, baseUrl: string): Promise<ApiProject> {
  return apiRequest(`/projects/${projectId}/base-url`, { method: "PATCH", body: { baseUrl } });
}

export async function analyzeEndpoints(projectId: string): Promise<JobRef> {
  return apiRequest(`/projects/${projectId}/analyze-endpoints`, { method: "POST" });
}

export async function generateTests(projectId: string, endpointIds?: string[]): Promise<JobRef> {
  return apiRequest(`/projects/${projectId}/generate-tests`, { method: "POST", body: { endpointIds } });
}

export async function listTests(projectId: string): Promise<ApiGeneratedTest[]> {
  return apiRequest(`/projects/${projectId}/tests`);
}

export async function runTests(projectId: string, testIds?: string[]): Promise<JobRef> {
  return apiRequest(`/projects/${projectId}/run-tests`, { method: "POST", body: { testIds } });
}

export async function getTestRun(projectId: string, runId: string): Promise<ApiTestRun> {
  return apiRequest(`/projects/${projectId}/runs/${runId}`);
}

export async function getReport(projectId: string): Promise<{ report: ApiReport; findings: ApiFinding[] }> {
  return apiRequest(`/projects/${projectId}/report`);
}

export async function getFinding(projectId: string, findingId: string): Promise<ApiFinding> {
  return apiRequest(`/projects/${projectId}/findings/${findingId}`);
}
