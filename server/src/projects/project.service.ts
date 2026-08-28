import { prisma } from "../db.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

export async function createProject(userId: string, name: string, description: string) {
  return prisma.project.create({ data: { userId, name, description } });
}

export async function listProjects(userId: string) {
  return prisma.project.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function getOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError("Project not found.");
  if (project.userId !== userId) throw new ForbiddenError();
  return project;
}

export async function listEndpoints(projectId: string) {
  return prisma.endpoint.findMany({ where: { projectId }, orderBy: [{ tag: "asc" }, { path: "asc" }] });
}

export async function updateBaseUrl(projectId: string, baseUrl: string) {
  return prisma.project.update({ where: { id: projectId }, data: { baseUrl } });
}
