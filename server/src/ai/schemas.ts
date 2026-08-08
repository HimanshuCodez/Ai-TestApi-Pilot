import { z } from "zod";

const category = z.enum(["positive", "negative", "boundary", "auth", "security"]);
const severity = z.enum(["critical", "high", "medium", "low"]);

export const generatedTestSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  category,
  method: z.string().min(1),
  path: z.string().min(1),
  request: z
    .object({
      headers: z.record(z.string(), z.unknown()).optional().default({}),
      pathParams: z.record(z.string(), z.unknown()).optional().default({}),
      queryParams: z.record(z.string(), z.unknown()).optional().default({}),
      body: z.unknown().nullable().optional().default(null),
    })
    .default({}),
  expected: z
    .object({
      statusCodes: z.array(z.number().int()).min(1),
      notes: z.string().optional().default(""),
    }),
  severity,
});

export const testGenerationOutputSchema = z.object({
  tests: z.array(generatedTestSchema).min(1),
});

export const endpointAnalysisOutputSchema = z.object({
  riskFlags: z.array(z.string()).default([]),
  qualityNotes: z.array(z.string()).default([]),
  summary: z.string().default(""),
  riskLevel: z.enum(["low", "medium", "high"]).default("low"),
});

export const failureAnalysisOutputSchema = z.object({
  severity,
  problem: z.string().min(1),
  probableCause: z.string().min(1),
  recommendation: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const reportInsightsOutputSchema = z.object({
  summary: z.string().min(1),
  topRecommendations: z.array(z.string()).default([]),
  highlight: z.string().default(""),
});

export type GeneratedTestOutput = z.infer<typeof generatedTestSchema>;
export type TestGenerationOutput = z.infer<typeof testGenerationOutputSchema>;
export type EndpointAnalysisOutput = z.infer<typeof endpointAnalysisOutputSchema>;
export type FailureAnalysisOutput = z.infer<typeof failureAnalysisOutputSchema>;
export type ReportInsightsOutput = z.infer<typeof reportInsightsOutputSchema>;
