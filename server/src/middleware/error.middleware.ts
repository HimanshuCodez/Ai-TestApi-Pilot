import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: "Not found.", code: "NOT_FOUND" } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: { message: "That request doesn't look right.", code: "VALIDATION_ERROR", details: err.flatten() },
    });
    return;
  }

  if (err instanceof AppError) {
    if (err.status >= 500) logger.error(err.message, { code: err.code, path: req.path });
    res.status(err.status).json({ error: { message: err.message, code: err.code } });
    return;
  }

  logger.error("Unhandled error", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    path: req.path,
  });
  res.status(500).json({ error: { message: "Something went wrong on our end. Please try again.", code: "INTERNAL_ERROR" } });
}
