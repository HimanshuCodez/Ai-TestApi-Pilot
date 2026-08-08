export type Severity = "critical" | "high" | "medium" | "low";
export type TestKind = "positive" | "negative" | "boundary" | "security";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type RunStatus = "passed" | "failed" | "running" | "skipped" | "queued";
export type ProjectStatus = "healthy" | "warning" | "critical" | "scanning";

export interface User {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  role: string;
  plan: "Free" | "Pro" | "Team";
}

export interface Project {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  status: ProjectStatus;
  healthScore: number;
  securityScore: number;
  endpointCount: number;
  testsGenerated: number;
  lastScanAt: string;
  createdAt: string;
  tags: string[];
  runsToday: number;
  passRate: number;
}

export interface EndpointParam {
  name: string;
  type: string;
  required: boolean;
  in: "query" | "path" | "header" | "body";
  description: string;
  example?: string;
}

export interface EndpointResponse {
  status: number;
  description: string;
  example: string;
}

export interface ApiEndpoint {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  tag: string;
  authRequired: boolean;
  params: EndpointParam[];
  headers: EndpointParam[];
  requestBody?: string;
  responses: EndpointResponse[];
  healthScore: number;
  issueCount: number;
}

export interface TestCase {
  id: string;
  endpointId: string;
  method: HttpMethod;
  path: string;
  kind: TestKind;
  title: string;
  description: string;
  request: string;
  expected: string;
  status?: RunStatus;
  durationMs?: number;
  severity?: Severity;
}

export interface SecurityIssue {
  id: string;
  severity: Severity;
  title: string;
  endpoint: string;
  method: HttpMethod;
  category: string;
  description: string;
  risk: string;
  fix: string;
  codeSnippet: string;
  codeLang: string;
  discoveredAt: string;
  status: "open" | "resolved" | "acknowledged";
}

export interface RunLogLine {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error" | "command";
  message: string;
}

export interface TestRun {
  id: string;
  projectId: string;
  status: RunStatus;
  startedAt: string;
  durationMs: number;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ActivityItem {
  id: string;
  type: "scan" | "test" | "bug" | "deploy" | "chat";
  title: string;
  description: string;
  timestamp: string;
  icon?: string;
}

export interface AnalysisStep {
  id: string;
  label: string;
  detail: string;
  durationMs: number;
}
