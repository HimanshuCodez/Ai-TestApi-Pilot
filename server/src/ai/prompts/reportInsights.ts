import type { ReportInsightInput } from "../provider.js";

export function buildReportInsightsPrompt(input: ReportInsightInput): string {
  return `You are summarizing an API test run for an engineering team. All numeric scores below were computed deterministically from real test results — do not recompute or contradict them, only comment qualitatively.

Project: ${input.projectName}
Test totals: ${JSON.stringify(input.totals)}
Scores (already calculated, do not restate as if uncertain): ${JSON.stringify(input.scores)}
Top findings: ${JSON.stringify(input.topFindings, null, 2)}

Respond with STRICT JSON only, no prose, no markdown fences:
{
  "summary": "two to three sentences summarizing overall API health for a busy engineer",
  "topRecommendations": ["short, actionable recommendation", "..."],
  "highlight": "one sentence noting the single most important thing to fix first, or a positive note if there is nothing critical"
}

Keep recommendations concrete and grounded only in the findings provided — do not invent issues not present in the data.`;
}
