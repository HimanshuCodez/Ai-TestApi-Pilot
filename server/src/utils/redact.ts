const REDACTED = "[REDACTED]";

const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "api-key",
  "x-auth-token",
  "proxy-authorization",
]);

const SENSITIVE_KEY_PATTERN = /(password|token|secret|apikey|api_key|authorization|credential|private_key|access_key)/i;

export function redactHeaders(headers: Record<string, string | string[] | undefined>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    out[key] = SENSITIVE_HEADER_NAMES.has(key.toLowerCase()) ? REDACTED : value;
  }
  return out;
}

export function redactBody(value: unknown, depth = 0): unknown {
  if (depth > 8) return REDACTED;
  if (Array.isArray(value)) return value.map((v) => redactBody(v, depth + 1));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactBody(v, depth + 1);
    }
    return out;
  }
  return value;
}
