import type { TestGenInput } from "../provider.js";

export function buildTestGenerationPrompt(input: TestGenInput): string {
  const { endpoint } = input;
  return `You are a senior API QA engineer. Generate a thorough set of automated test cases for a single REST endpoint.

Project: ${input.projectName}
Base URL: ${input.baseUrl ?? "(unknown — tests will be run relative to the connected API)"}
Known authentication schemes: ${JSON.stringify(input.authSchemes)}

Endpoint under test:
${JSON.stringify(endpoint, null, 2)}

Generate test cases covering ALL of these categories, as applicable to this endpoint:
- positive: valid, well-formed requests that should succeed
- negative: missing required fields, wrong types, malformed JSON, empty body
- boundary: min/max length, extreme numbers, empty strings, unicode, very long input
- auth: missing/invalid/expired credentials if the endpoint requires auth
- security: injection payloads, auth-bypass attempts, mass-assignment, IDOR-style parameter tampering — only where genuinely applicable to this endpoint's inputs

Respond with STRICT JSON only, matching exactly this shape, no prose, no markdown fences:
{
  "tests": [
    {
      "title": "string, concise and specific",
      "description": "string, one sentence on what this verifies",
      "category": "positive" | "negative" | "boundary" | "auth" | "security",
      "method": "${endpoint.method}",
      "path": "${endpoint.path}",
      "request": { "headers": {}, "pathParams": {}, "queryParams": {}, "body": null },
      "expected": { "statusCodes": [200], "notes": "string" },
      "severity": "critical" | "high" | "medium" | "low"
    }
  ]
}

Generate between 4 and 10 tests depending on how much surface area this endpoint has. Do not invent fields that were not present in the endpoint definition. Do not include any explanation outside the JSON object.`;
}
