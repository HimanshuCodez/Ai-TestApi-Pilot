import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

/**
 * Returns true if the given IP address is private, loopback, link-local,
 * or a cloud metadata address — anything that must never be reachable
 * from a server-side "fetch this URL for the user" feature.
 */
export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata (169.254.169.254)
    if (a === 0) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return true; // loopback
    if (normalized.startsWith("fe80:")) return true; // link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
    if (normalized.startsWith("::ffff:")) {
      const v4 = normalized.split(":").pop();
      if (v4 && net.isIPv4(v4)) return isBlockedIp(v4);
    }
    return false;
  }
  return true; // not a valid IP — treat as unsafe
}

export interface SafeUrlCheckResult {
  url: URL;
  resolvedIps: string[];
}

/**
 * Validates that a user-supplied URL is well-formed, uses http(s), and does
 * not resolve to a private/internal/metadata address. Throws SSRF_BLOCKED /
 * INVALID_URL prefixed errors that utils/errors.ts translates into
 * user-friendly messages.
 */
export async function assertSafeUrl(rawUrl: string): Promise<SafeUrlCheckResult> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("INVALID_URL: malformed URL");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INVALID_URL: only http/https are supported");
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error("SSRF_BLOCKED: blocked hostname");
  }

  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("SSRF_BLOCKED: blocked IP literal");
    }
    return { url, resolvedIps: [hostname] };
  }

  let records: string[];
  try {
    const results = await dns.lookup(hostname, { all: true });
    records = results.map((r) => r.address);
  } catch {
    throw new Error("INVALID_URL: DNS resolution failed");
  }

  if (records.length === 0) {
    throw new Error("INVALID_URL: DNS resolution returned no records");
  }

  for (const ip of records) {
    if (isBlockedIp(ip)) {
      throw new Error("SSRF_BLOCKED: hostname resolves to a private/internal address");
    }
  }

  return { url, resolvedIps: records };
}
