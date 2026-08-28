import { prisma } from "../db.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

const projectCounts = { _count: { select: { endpoints: true, generatedTests: true } } } as const;

function attachCounts<T extends { _count: { endpoints: number; generatedTests: number } }>(project: T) {
  const { _count, ...rest } = project;
  return { ...rest, endpointCount: _count.endpoints, testsGenerated: _count.generatedTests };
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function runStatsFor(projectId: string) {
  const [runsToday, latestRun] = await Promise.all([
    prisma.testRun.count({ where: { projectId, startedAt: { gte: startOfToday() } } }),
    prisma.testRun.findFirst({
      where: { projectId, total: { gt: 0 } },
      orderBy: { startedAt: "desc" },
      select: { total: true, passed: true },
    }),
  ]);
  const passRate = latestRun ? Math.round((latestRun.passed / latestRun.total) * 1000) / 10 : 0;
  return { runsToday, passRate };
}

async function runStatsForMany(projectIds: string[]) {
  if (projectIds.length === 0) return new Map<string, { runsToday: number; passRate: number }>();

  const [todayCounts, latestRuns] = await Promise.all([
    prisma.testRun.groupBy({
      by: ["projectId"],
      where: { projectId: { in: projectIds }, startedAt: { gte: startOfToday() } },
      _count: { _all: true },
    }),
    prisma.testRun.findMany({
      where: { projectId: { in: projectIds }, total: { gt: 0 } },
      orderBy: [{ projectId: "asc" }, { startedAt: "desc" }],
      distinct: ["projectId"],
      select: { projectId: true, total: true, passed: true },
    }),
  ]);

  const runsTodayByProject = new Map(todayCounts.map((c) => [c.projectId, c._count._all]));
  const latestRunByProject = new Map(latestRuns.map((r) => [r.projectId, r]));

  return new Map(
    projectIds.map((id) => {
      const latest = latestRunByProject.get(id);
      const passRate = latest ? Math.round((latest.passed / latest.total) * 1000) / 10 : 0;
      return [id, { runsToday: runsTodayByProject.get(id) ?? 0, passRate }];
    })
  );
}

export async function createProject(userId: string, name: string, description: string, tags: string[] = []) {
  const project = await prisma.project.create({ data: { userId, name, description, tags } });
  return { ...project, endpointCount: 0, testsGenerated: 0, runsToday: 0, passRate: 0 };
}

export async function listProjects(userId: string) {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: projectCounts,
  });
  const statsByProject = await runStatsForMany(projects.map((p) => p.id));
  return projects.map((project) => ({ ...attachCounts(project), ...statsByProject.get(project.id)! }));
}

export async function getOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: projectCounts });
  if (!project) throw new NotFoundError("Project not found.");
  if (project.userId !== userId) throw new ForbiddenError();
  const stats = await runStatsFor(projectId);
  return { ...attachCounts(project), ...stats };
}

export async function listEndpoints(projectId: string) {
  return prisma.endpoint.findMany({ where: { projectId }, orderBy: [{ tag: "asc" }, { path: "asc" }] });
}

export async function updateBaseUrl(projectId: string, baseUrl: string) {
  const project = await prisma.project.update({ where: { id: projectId }, data: { baseUrl }, include: projectCounts });
  const stats = await runStatsFor(projectId);
  return { ...attachCounts(project), ...stats };
}
