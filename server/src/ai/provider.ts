export interface NormalizedEndpointInput {
  method: string;
  path: string;
  summary: string;
  tag: string;
  authRequired: boolean;
  parameters: unknown;
  requestBodySchema: unknown;
  responses: unknown;
}

export interface TestGenInput {
  projectName: string;
  baseUrl: string | null;
  authSchemes: unknown;
  endpoint: NormalizedEndpointInput;
}

export interface FailureAnalysisInput {
  endpoint: { method: string; path: string };
  request: unknown;
  statusCode: number | null;
  expected: unknown;
  responseBody: unknown;
  errorMessage: string | null;
}

export interface ReportInsightInput {
  projectName: string;
  totals: { total: number; passed: number; failed: number; skipped: number };
  topFindings: Array<{ severity: string; title: string; category: string }>;
  scores: { healthScore: number; securityScore: number; coverageScore: number; performanceScore: number };
}

/**
 * Provider-agnostic AI surface. Callers must validate the returned raw
 * value with Zod before persisting or trusting it — nothing here is
 * guaranteed to match a schema, it's whatever the model returned.
 */
export interface AIProvider {
  generateTestCases(input: TestGenInput): Promise<unknown>;
  analyzeEndpoint(endpoint: NormalizedEndpointInput): Promise<unknown>;
  analyzeFailure(input: FailureAnalysisInput): Promise<unknown>;
  generateReportInsights(input: ReportInsightInput): Promise<unknown>;
}
