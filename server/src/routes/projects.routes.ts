import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { connectLimiter } from "../middleware/rateLimit.middleware.js";
import {
  connectFileSchema,
  connectGithubSchema,
  connectUrlSchema,
  createProjectSchema,
  generateTestsSchema,
  runTestsSchema,
} from "../projects/project.schemas.js";
import {
  analyzeEndpoints,
  connectFile,
  connectGithub,
  connectUrl,
  createProject,
  generateTests,
  getFinding,
  getProject,
  getReport,
  getTestRun,
  listEndpoints,
  listProjects,
  listTests,
  runTests,
} from "../controllers/projects.controller.js";

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.post("/", validateBody(createProjectSchema), createProject);
projectsRouter.get("/", listProjects);
projectsRouter.get("/:id", getProject);
projectsRouter.get("/:id/endpoints", listEndpoints);
projectsRouter.post("/:id/connect/url", connectLimiter, validateBody(connectUrlSchema), connectUrl);
projectsRouter.post("/:id/connect/file", connectLimiter, validateBody(connectFileSchema), connectFile);
projectsRouter.post("/:id/connect/github", connectLimiter, validateBody(connectGithubSchema), connectGithub);
projectsRouter.post("/:id/analyze-endpoints", connectLimiter, analyzeEndpoints);
projectsRouter.post("/:id/generate-tests", connectLimiter, validateBody(generateTestsSchema), generateTests);
projectsRouter.get("/:id/tests", listTests);
projectsRouter.post("/:id/run-tests", connectLimiter, validateBody(runTestsSchema), runTests);
projectsRouter.get("/:id/runs/:runId", getTestRun);
projectsRouter.get("/:id/report", getReport);
projectsRouter.get("/:id/findings/:findingId", getFinding);
