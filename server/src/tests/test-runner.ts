import pLimit from "p-limit";
import { Prisma, type GeneratedTest } from "@prisma/client";
import { prisma } from "../db.js";
import { assertSafeUrl } from "../utils/ssrf.js";
import { redactBody, redactHeaders } from "../utils/redact.js";
import { AppError } from "../utils/errors.js";

const CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

interface RequestSpec {
  headers?: Record<string, unknown>;
  pathParams?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  body?: unknown;
}

interface ExpectedSpec {
  statusCodes: number[];
  notes?: string;
}

interface ExecutedTestResult {
  statusCode: number | null;
  durationMs: number | null;
  passed: boolean;
  responseBodyRedacted: unknown;
  responseHeadersRedacted: unknown;
  errorMessage: string | null;
}

export interface RunTestsResult {
  testRunId: string;
  total: number;
  passed: number;
  failed: number;
}

export function buildUrl(
  baseUrl: string,
  path: string,
  pathParams: Record<string, unknown>,
  queryParams: Record<string, unknown>
): URL {
  let resolvedPath = path;
  for (const [key, value] of Object.entries(pathParams)) {
    resolvedPath = resolvedPath.split(`{${key}}`).join(encodeURIComponent(String(value)));
  }
  if (!resolvedPath.startsWith("/")) resolvedPath = `/${resolvedPath}`;

  const trimmedBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${trimmedBase}${resolvedPath}`);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  return url;
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

async function readBodyCapped(res: Response): Promise<{ text: string; contentType: string }> {
  const contentType = res.headers.get("content-type") ?? "";
  const reader = res.body?.getReader();
  if (!reader) return { text: await res.text(), contentType };

  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return { text: Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8"), contentType };
}

/**
 * Executes a single generated test as a real HTTP request against the
 * project's base URL. Never throws — transport/SSRF/timeout failures are
 * captured as a failed result so one bad test never aborts the run.
 */
export async function executeTest(baseUrl: string, test: GeneratedTest): Promise<ExecutedTestResult> {
  const start = Date.now();
  try {
    const spec = (test.requestSpec ?? {}) as RequestSpec;
    const expected = test.expected as unknown as ExpectedSpec;

    const url = buildUrl(baseUrl, test.path, spec.pathParams ?? {}, spec.queryParams ?? {});
    await assertSafeUrl(url.toString());

    const method = test.method.toUpperCase();
    const headers: Record<string, string> = { Accept: "application/json" };
    for (const [key, value] of Object.entries(spec.headers ?? {})) headers[key] = String(value);

    const hasBody = spec.body !== null && spec.body !== undefined && method !== "GET" && method !== "HEAD";
    if (hasBody && !("Content-Type" in headers) && !("content-type" in headers)) {
      headers["Content-Type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: hasBody ? JSON.stringify(spec.body) : undefined,
        redirect: "manual",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - start;
    const { text, contentType } = await readBodyCapped(res);

    let parsedBody: unknown = text;
    if (contentType.includes("json") && text) {
      try {
        parsedBody = JSON.parse(text);
      } catch {
        parsedBody = text;
      }
    }

    const headersObj: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    return {
      statusCode: res.status,
      durationMs,
      passed: expected.statusCodes.includes(res.status),
      responseBodyRedacted: redactBody(parsedBody),
      responseHeadersRedacted: redactHeaders(headersObj),
      errorMessage: null,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "Request timed out"
        : err instanceof Error
          ? err.message
          : String(err);
    return {
      statusCode: null,
      durationMs,
      passed: false,
      responseBodyRedacted: null,
      responseHeadersRedacted: null,
      errorMessage: message,
    };
  }
}

export async function runTestsForProject(
  projectId: string,
  testIds: string[] | undefined,
  onProgress: (processed: number, total: number) => Promise<void>
): Promise<RunTestsResult> {
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  if (!project.baseUrl) {
    throw new AppError("This project has no base URL to run tests against yet.", 422, "NO_BASE_URL");
  }
  const baseUrl = project.baseUrl;

  const tests = await prisma.generatedTest.findMany({
    where: { projectId, ...(testIds && testIds.length ? { id: { in: testIds } } : {}) },
  });

  const testRun = await prisma.testRun.create({
    data: { projectId, status: "running", total: tests.length },
  });

  if (tests.length === 0) {
    await prisma.testRun.update({
      where: { id: testRun.id },
      data: { status: "passed", finishedAt: new Date() },
    });
    return { testRunId: testRun.id, total: 0, passed: 0, failed: 0 };
  }

  const limit = pLimit(CONCURRENCY);
  let processed = 0;
  let passedCount = 0;
  let failedCount = 0;

  await Promise.all(
    tests.map((test) =>
      limit(async () => {
        const result = await executeTest(baseUrl, test);
        await prisma.testResult.create({
          data: {
            testRunId: testRun.id,
            generatedTestId: test.id,
            statusCode: result.statusCode,
            durationMs: result.durationMs,
            passed: result.passed,
            responseBodyRedacted: toJsonInput(result.responseBodyRedacted),
            responseHeadersRedacted: toJsonInput(result.responseHeadersRedacted),
            errorMessage: result.errorMessage,
          },
        });
        if (result.passed) passedCount += 1;
        else failedCount += 1;
        processed += 1;
        await onProgress(processed, tests.length);
      })
    )
  );

  await prisma.testRun.update({
    where: { id: testRun.id },
    data: {
      status: failedCount > 0 ? "failed" : "passed",
      passed: passedCount,
      failed: failedCount,
      finishedAt: new Date(),
    },
  });

  return { testRunId: testRun.id, total: tests.length, passed: passedCount, failed: failedCount };
}
