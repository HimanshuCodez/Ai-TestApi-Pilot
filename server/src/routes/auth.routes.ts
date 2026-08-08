import { Router } from "express";
import { login, me, register } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { authLimiter } from "../middleware/rateLimit.middleware.js";
import { loginSchema, registerSchema } from "../auth/auth.schemas.js";

export const authRouter = Router();

authRouter.post("/register", authLimiter, validateBody(registerSchema), register);
authRouter.post("/login", authLimiter, validateBody(loginSchema), login);
authRouter.get("/me", requireAuth, me);
