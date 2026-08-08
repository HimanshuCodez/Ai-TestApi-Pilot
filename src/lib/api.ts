const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const TOKEN_STORAGE_KEY = "testpilot-token";

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function apiUrl(path: string): string {
  return `${BASE_URL}${path}`;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

interface ErrorPayload {
  error?: { message?: string; code?: string; details?: unknown };
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getStoredToken();

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError("Couldn't reach TestPilot's server. Check your connection and try again.", 0, "NETWORK_ERROR");
  }

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? ((await res.json()) as unknown) : undefined;

  if (!res.ok) {
    const payload = (data ?? {}) as ErrorPayload;
    throw new ApiError(
      payload.error?.message ?? "Something went wrong. Please try again.",
      res.status,
      payload.error?.code ?? "UNKNOWN_ERROR",
      payload.error?.details
    );
  }

  return data as T;
}
