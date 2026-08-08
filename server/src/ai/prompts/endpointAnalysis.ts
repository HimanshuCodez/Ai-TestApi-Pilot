import type { NormalizedEndpointInput } from "../provider.js";

export function buildEndpointAnalysisPrompt(endpoint: NormalizedEndpointInput): string {
  return `You are an API security and quality reviewer. Review the following single REST endpoint definition (derived from an OpenAPI spec, not from runtime testing) and flag genuine, well-founded concerns only — do not speculate about things this definition cannot reveal.

Endpoint:
${JSON.stringify(endpoint, null, 2)}

Respond with STRICT JSON only, no prose, no markdown fences:
{
  "riskFlags": ["short phrase per concern, e.g. 'No rate-limit indication in spec'"],
  "qualityNotes": ["short phrase per documentation/schema quality issue"],
  "summary": "one sentence overall assessment",
  "riskLevel": "low" | "medium" | "high"
}

Use language like "potential" or "no evidence of" rather than definitive claims — this is a static review of a spec, not a penetration test. If nothing stands out, return empty arrays and riskLevel "low".`;
}
