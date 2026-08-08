import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../auth/jwt.js";
import { UnauthorizedError } from "../utils/errors.js";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  if (typeof req.query.token === "string") return req.query.token;
  return undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(new UnauthorizedError("Sign in to continue."));

  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    next(new UnauthorizedError("Your session has expired. Please sign in again."));
  }
}
