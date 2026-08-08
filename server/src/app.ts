import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.routes.js";
import { projectsRouter } from "./routes/projects.routes.js";
import { jobsRouter } from "./routes/jobs.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/jobs", jobsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
