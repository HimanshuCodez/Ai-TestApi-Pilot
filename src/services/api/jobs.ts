import { apiRequest } from "@/lib/api";
import type { ApiJob } from "./types";

export async function getJob(jobId: string): Promise<ApiJob> {
  return apiRequest(`/jobs/${jobId}`);
}
