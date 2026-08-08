import type { ZodTypeAny, z } from "zod";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * Calls an AI-producing function and validates its raw output against a Zod
 * schema, retrying once with a fresh call if validation fails. AI output is
 * never trusted or persisted without passing this gate.
 */
export async function callAndValidate<S extends ZodTypeAny>(
  fn: () => Promise<unknown>,
  schema: S,
  label: string,
  attempts = 2
): Promise<z.infer<S>> {
  let lastIssue = "";
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const raw = await fn();
    const result = schema.safeParse(raw);
    if (result.success) return result.data;
    lastIssue = result.error.message;
    logger.warn(`AI output failed validation for ${label}, attempt ${attempt}/${attempts}`, {
      issue: lastIssue,
    });
  }
  throw new AppError(
    "The AI returned data that didn't match the expected format. Please try again.",
    502,
    "AI_INVALID_OUTPUT"
  );
}
