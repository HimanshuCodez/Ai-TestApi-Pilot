import type { NextFunction, Request, Response } from "express";
import * as projectService from "../projects/project.service.js";
import { createJob } from "../queue/job.service.js";
import { prisma } from "../db.js";
import { analyzeEndpointsQueue, analyzeUrlQueue, generateTestsQueue, runTestsQueue } from "../queue/queues.js";
import { NotFoundError, toFriendlyConnectError } from "../utils/errors.js";
import { assertSafeUrl } from "../utils/ssrf.js";

export async function createProject(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description, tags } = req.body;
    const project = await projectService.createProject(req.userId!, name, description, tags);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

export async function listProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await projectService.listProjects(req.userId!);
    res.json(projects);
  } catch (err) {
    next(err);
  }
}

export async function getProject(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getOwnedProject(req.userId!, req.params.id);
    res.json(project);
  } catch (err) {
    next(err);
  }
}

export async function updateBaseUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getOwnedProject(req.userId!, req.params.id);
    const { baseUrl } = req.body;

    try {
      await assertSafeUrl(baseUrl);
    } catch (err) {
      throw toFriendlyConnectError(err);
    }

    const updated = await projectService.updateBaseUrl(project.id, baseUrl);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function listEndpoints(req: Request, res: Response, next: NextFunction) {
  try {
    await projectService.getOwnedProject(req.userId!, req.params.id);
    const endpoints = await projectService.listEndpoints(req.params.id);
    res.json(endpoints);
  } catch (err) {
    next(err);
  }
}

export async function connectUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getOwnedProject(req.userId!, req.params.id);
    const { url } = req.body;

    const job = await createJob(project.id, "analyze_url");
    await analyzeUrlQueue.add(
      "analyze-url",
      { jobId: job.id, projectId: project.id, source: { kind: "URL", url } },
      { jobId: job.id }
    );

    res.status(202).json({ jobId: job.id });
  } catch (err) {
    next(err);
  }
}

export async function analyzeEndpoints(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getOwnedProject(req.userId!, req.params.id);

    const job = await createJob(project.id, "analyze_endpoints");
    await analyzeEndpointsQueue.add(
      "analyze-endpoints",
      { jobId: job.id, projectId: project.id },
      { jobId: job.id }
    );

    res.status(202).json({ jobId: job.id });
  } catch (err) {
    next(err);
  }
}

export async function generateTests(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getOwnedProject(req.userId!, req.params.id);
    const { endpointIds } = req.body;

    const job = await createJob(project.id, "generate_tests");
    await generateTestsQueue.add(
      "generate-tests",
      { jobId: job.id, projectId: project.id, endpointIds },
      { jobId: job.id }
    );

    res.status(202).json({ jobId: job.id });
  } catch (err) {
    next(err);
  }
}

export async function listTests(req: Request, res: Response, next: NextFunction) {
  try {
    await projectService.getOwnedProject(req.userId!, req.params.id);
    const tests = await prisma.generatedTest.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(tests);
  } catch (err) {
    next(err);
  }
}

export async function runTests(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getOwnedProject(req.userId!, req.params.id);
    const { testIds } = req.body;

    const job = await createJob(project.id, "run_tests");
    await runTestsQueue.add(
      "run-tests",
      { jobId: job.id, projectId: project.id, testIds },
      { jobId: job.id }
    );

    res.status(202).json({ jobId: job.id });
  } catch (err) {
    next(err);
  }
}

export async function getTestRun(req: Request, res: Response, next: NextFunction) {
  try {
    await projectService.getOwnedProject(req.userId!, req.params.id);
    const testRun = await prisma.testRun.findUnique({
      where: { id: req.params.runId },
      include: { results: { include: { generatedTest: true } } },
    });
    if (!testRun || testRun.projectId !== req.params.id) {
      throw new NotFoundError("Test run not found.");
    }
    res.json(testRun);
  } catch (err) {
    next(err);
  }
}

export async function getReport(req: Request, res: Response, next: NextFunction) {
  try {
    await projectService.getOwnedProject(req.userId!, req.params.id);
    const report = await prisma.report.findFirst({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    if (!report) {
      throw new NotFoundError("No report has been generated for this project yet.");
    }
    const findings = await prisma.finding.findMany({
      where: { projectId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ report, findings });
  } catch (err) {
    next(err);
  }
}

export async function getFinding(req: Request, res: Response, next: NextFunction) {
  try {
    await projectService.getOwnedProject(req.userId!, req.params.id);
    const finding = await prisma.finding.findUnique({ where: { id: req.params.findingId } });
    if (!finding || finding.projectId !== req.params.id) {
      throw new NotFoundError("Finding not found.");
    }
    res.json(finding);
  } catch (err) {
    next(err);
  }
}

export async function connectFile(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getOwnedProject(req.userId!, req.params.id);
    const { fileName, content } = req.body;

    const job = await createJob(project.id, "analyze_url");
    await analyzeUrlQueue.add(
      "analyze-url",
      { jobId: job.id, projectId: project.id, source: { kind: "FILE", fileName, content } },
      { jobId: job.id }
    );

    res.status(202).json({ jobId: job.id });
  } catch (err) {
    next(err);
  }
}

export async function connectGithub(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getOwnedProject(req.userId!, req.params.id);
    const { repoUrl } = req.body;

    const job = await createJob(project.id, "analyze_url");
    await analyzeUrlQueue.add(
      "analyze-url",
      { jobId: job.id, projectId: project.id, source: { kind: "GITHUB", repoUrl } },
      { jobId: job.id }
    );

    res.status(202).json({ jobId: job.id });
  } catch (err) {
    next(err);
  }
}
