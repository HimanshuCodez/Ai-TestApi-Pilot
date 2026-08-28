import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required.").max(160),
  description: z.string().trim().max(2000).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional().default([]),
});

export const connectUrlSchema = z.object({
  url: z.string().trim().min(1, "A URL is required.").url("Enter a valid URL."),
});

export const connectFileSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  content: z.string().min(1, "The uploaded file is empty."),
});

export const connectGithubSchema = z.object({
  repoUrl: z
    .string()
    .trim()
    .min(1, "A repository URL is required.")
    .url("Enter a valid URL.")
    .refine((url) => new URL(url).hostname.toLowerCase() === "github.com", {
      message: "Enter a github.com repository URL.",
    }),
});

export const updateBaseUrlSchema = z.object({
  baseUrl: z.string().trim().min(1, "A base URL is required.").url("Enter a valid URL."),
});

export const generateTestsSchema = z.object({
  endpointIds: z.array(z.string()).optional(),
});

export const runTestsSchema = z.object({
  testIds: z.array(z.string()).optional(),
});
