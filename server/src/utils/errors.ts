export class AppError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request", details?: unknown) {
    super(message, 422, "VALIDATION_ERROR");
    this.details = details;
  }
  details?: unknown;
}

/**
 * Translates low-level network/parsing failures into the user-facing
 * messages required by the product spec — raw errors (ECONNREFUSED, stack
 * traces, etc.) must never reach the client.
 */
export function toFriendlyConnectError(err: unknown): AppError {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as NodeJS.ErrnoException)?.code;

  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return new AppError(
      "TestPilot couldn't reach this API. Check that the URL is publicly accessible.",
      400,
      "UNREACHABLE"
    );
  }
  if (code === "ETIMEDOUT" || message.includes("timeout")) {
    return new AppError(
      "The request to this API timed out. It may be slow, unreachable, or blocking automated requests.",
      400,
      "TIMEOUT"
    );
  }
  if (message.startsWith("SSRF_BLOCKED")) {
    return new AppError(
      "That URL points to a private or internal address, which TestPilot can't connect to for security reasons.",
      400,
      "SSRF_BLOCKED"
    );
  }
  if (message.startsWith("NOT_OPENAPI")) {
    return new AppError(
      "TestPilot couldn't find a recognizable OpenAPI/Swagger document there, and — for a GitHub repo — no detectable API routes either.",
      422,
      "NOT_OPENAPI"
    );
  }
  if (message.startsWith("UNSUPPORTED_SPEC_VERSION")) {
    return new AppError(
      "This specification's version isn't supported yet. TestPilot supports OpenAPI 2.0 (Swagger), 3.0 and 3.1.",
      422,
      "UNSUPPORTED_SPEC_VERSION"
    );
  }
  if (message.startsWith("INVALID_SPEC")) {
    return new AppError(
      "This specification couldn't be validated — it may be malformed or incomplete.",
      422,
      "INVALID_SPEC"
    );
  }
  if (message.startsWith("AUTH_REQUIRED")) {
    return new AppError(
      "This URL requires authentication to access. TestPilot only supports publicly accessible specs in V1.",
      401,
      "AUTH_REQUIRED"
    );
  }
  if (message.startsWith("TOO_LARGE")) {
    return new AppError("That file is too large for TestPilot to analyze.", 413, "TOO_LARGE");
  }
  if (message.startsWith("INVALID_URL")) {
    return new AppError("That doesn't look like a valid URL.", 400, "INVALID_URL");
  }
  if (message.startsWith("REPO_NOT_FOUND")) {
    return new AppError(
      "That GitHub repository couldn't be found. TestPilot only supports public repositories.",
      404,
      "REPO_NOT_FOUND"
    );
  }
  if (message.startsWith("RATE_LIMITED")) {
    return new AppError(
      "GitHub's API rate limit was hit while scanning this repository. Try again in a few minutes.",
      429,
      "RATE_LIMITED"
    );
  }

  return new AppError("TestPilot couldn't analyze this API. Please try again.", 502, "UPSTREAM_ERROR");
}
