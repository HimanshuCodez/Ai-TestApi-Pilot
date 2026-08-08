import type { FailureAnalysisInput } from "../provider.js";

export function buildFailureAnalysisPrompt(input: FailureAnalysisInput): string {
  return `You are debugging a failed automated API test. Analyze why it failed and explain it clearly for an engineer.

Endpoint: ${input.endpoint.method} ${input.endpoint.path}
Request sent (secrets redacted): ${JSON.stringify(input.request, null, 2)}
Expected: ${JSON.stringify(input.expected, null, 2)}
Actual status code: ${input.statusCode ?? "none (request error)"}
Actual response body (secrets redacted): ${JSON.stringify(input.responseBody, null, 2)}
Transport error, if any: ${input.errorMessage ?? "none"}

Respond with STRICT JSON only, no prose, no markdown fences:
{
  "severity": "critical" | "high" | "medium" | "low",
  "problem": "one or two sentences describing what actually went wrong",
  "probableCause": "one or two sentences on the likely root cause",
  "recommendation": "one or two sentences on how to fix or investigate further",
  "confidence": 0.0
}

Only describe this as a security vulnerability if the evidence clearly supports it — otherwise use cautious language like "potential" or "worth investigating." "confidence" must be a number between 0 and 1 reflecting how certain you are given the evidence available.`;
}
