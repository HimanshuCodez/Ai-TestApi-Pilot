import { assertSafeUrl } from "../utils/ssrf.js";

const MAX_REDIRECTS = 5;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — generous for an OpenAPI doc, still bounded
const REQUEST_TIMEOUT_MS = 10_000;

export interface FetchedDocument {
  content: string;
  contentType: string;
  finalUrl: string;
}

/**
 * Fetches a URL server-side with SSRF protection applied to every hop
 * (the initial URL and every redirect target), a response-size cap, and a
 * request timeout. Never follows redirects automatically — each one is
 * re-validated before being followed.
 */
export async function fetchUrlSafely(rawUrl: string): Promise<FetchedDocument> {
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const { url } = await assertSafeUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "application/json, application/yaml, text/yaml, text/plain, */*" },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("TIMEOUT: request took too long");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("INVALID_URL: redirect with no Location header");
      currentUrl = new URL(location, url).toString();
      continue;
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error("AUTH_REQUIRED: endpoint requires authentication");
    }

    if (!res.ok) {
      throw new Error(`UPSTREAM_ERROR: received HTTP ${res.status}`);
    }

    const contentLengthHeader = res.headers.get("content-length");
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_BYTES) {
      throw new Error("TOO_LARGE: response exceeds the size limit");
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const content = await res.text();
      if (content.length > MAX_BYTES) throw new Error("TOO_LARGE: response exceeds the size limit");
      return { content, contentType: res.headers.get("content-type") ?? "", finalUrl: url.toString() };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error("TOO_LARGE: response exceeds the size limit");
      }
      chunks.push(value);
    }
    const content = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
    return { content, contentType: res.headers.get("content-type") ?? "", finalUrl: url.toString() };
  }

  throw new Error("UPSTREAM_ERROR: too many redirects");
}
