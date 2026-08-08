import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getJob, streamJobEvents } from "../controllers/jobs.controller.js";

export const jobsRouter = Router();

jobsRouter.get("/:id/events", requireAuth, streamJobEvents);
jobsRouter.get("/:id", requireAuth, getJob);
