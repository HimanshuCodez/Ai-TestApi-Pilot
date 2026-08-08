import { apiRequest, setStoredToken } from "@/lib/api";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: ApiUser;
}

export async function registerRequest(name: string, email: string, password: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: { name, email, password },
  });
  setStoredToken(result.token);
  return result;
}

export async function loginRequest(email: string, password: string): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>("/auth/login", { method: "POST", body: { email, password } });
  setStoredToken(result.token);
  return result;
}

export async function fetchMe(): Promise<{ user: ApiUser }> {
  return apiRequest("/auth/me");
}
