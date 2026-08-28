// Wire shapes returned by the TestPilot API — these mirror the Prisma
// models in server/prisma/schema.prisma, not the local UI-only mock types
// in src/types/index.ts.

export type ApiProjectStatus = "scanning" | "healthy" | "warning" | "critical";

export interface ApiProject {
  id: string;
  userId: string;
  name: string;
  description: string;
  baseUrl: string | null;
  status: ApiProjectStatus;
  healthScore: number;
  securityScore: number;
  endpointCount: number;
  testsGenerated: number;
  tags: string[];
  runsToday: number;
  passRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiParameter {
  name: string;
  type: string;
  required: boolean;
  in: "query" | "path" | "header" | "body";
  description: string;
  example?: string;
}

export interface ApiEndpointResponse {
  status: number;
  description: string;
  example: string;
}

export interface ApiEndpoint {
  id: string;
  projectId: string;
  method: string;
  path: string;
  summary: string;
  tag: string;
  authRequired: boolean;
  parameters: ApiParameter[];
  requestBodySchema: unknown | null;
  responses: ApiEndpointResponse[];
  source: "openapi" | "github";
  createdAt: string;
}

export type ApiTestCategory = "positive" | "negative" | "boundary" | "security" | "auth";
export type ApiSeverity = "critical" | "high" | "medium" | "low";

export interface ApiRequestSpec {
  headers?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  body?: unknown;
}

export interface ApiGeneratedTest {
  id: string;
  projectId: string;
  endpointId: string;
  title: string;
  description: string;
  category: ApiTestCategory;
  method: string;
  path: string;
  requestSpec: ApiRequestSpec;
  expected: { statusCodes: number[]; notes?: string };
  severity: ApiSeverity;
  createdAt: string;
}

export type ApiTestRunStatus = "queued" | "running" | "passed" | "failed";

export interface ApiTestResult {
  id: string;
  testRunId: string;
  generatedTestId: string;
  statusCode: number | null;
  durationMs: number | null;
  passed: boolean;
  responseBodyRedacted: unknown;
  responseHeadersRedacted: unknown;
  errorMessage: string | null;
  createdAt: string;
  generatedTest?: ApiGeneratedTest;
}

export interface ApiTestRun {
  id: string;
  projectId: string;
  status: ApiTestRunStatus;
  startedAt: string;
  finishedAt: string | null;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  results?: ApiTestResult[];
}

export interface ApiFinding {
  id: string;
  projectId: string;
  testResultId: string | null;
  severity: ApiSeverity;
  title: string;
  category: string;
  endpoint: string;
  method: string;
  description: string;
  recommendation: string;
  confidence: number | null;
  status: "open" | "acknowledged" | "resolved";
  createdAt: string;
}

export interface ApiReportMetrics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  endpointsCovered: number;
  totalEndpoints: number;
  findingsBySeverity: Record<string, number>;
}

export interface ApiReportInsights {
  summary: string;
  topRecommendations: string[];
  highlight: string;
}

export interface ApiReport {
  id: string;
  projectId: string;
  testRunId: string;
  healthScore: number;
  securityScore: number;
  coverageScore: number;
  performanceScore: number;
  metrics: ApiReportMetrics;
  aiInsights: ApiReportInsights | null;
  createdAt: string;
}

export interface JobRef {
  jobId: string;
}

export type JobStatus = "queued" | "processing" | "completed" | "failed";

export interface ApiJob {
  id: string;
  type: "analyze_url" | "analyze_endpoints" | "generate_tests" | "run_tests";
  status: JobStatus;
  stage: string;
  progress: number;
  error: string | null;
  resultRef: string | null;
}
