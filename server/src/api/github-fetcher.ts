import { env } from "../env.js";

const GITHUB_API = "https://api.github.com";
const RAW_BASE = "https://raw.githubusercontent.com";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_FILE_BYTES = 512 * 1024; // per source file — generous for route definitions
const MAX_TREE_ENTRIES = 20_000; // safety net on top of GitHub's own recursive-tree cap

export interface GithubTreeEntry {
  path: string;
  type: "blob" | "tree";
  size?: number;
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "TestPilot-AI",
  };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  return headers;
}

async function githubFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { headers: githubHeaders(), signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("TIMEOUT: GitHub request took too long");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Extracts {owner, repo} from a github.com repo URL, rejecting anything else. */
export function parseGithubRepoUrl(rawUrl: string): { owner: string; repo: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("INVALID_URL: malformed URL");
  }

  if (url.hostname.toLowerCase() !== "github.com") {
    throw new Error("INVALID_URL: only github.com repository URLs are supported");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw new Error("INVALID_URL: expected a URL like https://github.com/owner/repo");
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, "");
  if (!/^[A-Za-z0-9_.-]+$/.test(owner) || !/^[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error("INVALID_URL: invalid repository owner or name");
  }

  return { owner, repo };
}

/** Fetches the repo's default branch and its full recursive file tree. */
export async function fetchRepoTree(
  owner: string,
  repo: string
): Promise<{ defaultBranch: string; tree: GithubTreeEntry[] }> {
  const repoRes = await githubFetch(`${GITHUB_API}/repos/${owner}/${repo}`);
  if (repoRes.status === 404) throw new Error("REPO_NOT_FOUND: repository not found or private");
  if (repoRes.status === 403) throw new Error("RATE_LIMITED: GitHub API rate limit exceeded");
  if (!repoRes.ok) throw new Error(`UPSTREAM_ERROR: GitHub API returned HTTP ${repoRes.status}`);

  const repoJson = (await repoRes.json()) as { default_branch?: string; private?: boolean };
  if (repoJson.private) throw new Error("REPO_NOT_FOUND: repository not found or private");
  const defaultBranch = repoJson.default_branch ?? "main";

  const treeRes = await githubFetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
  );
  if (treeRes.status === 403) throw new Error("RATE_LIMITED: GitHub API rate limit exceeded");
  if (!treeRes.ok) throw new Error(`UPSTREAM_ERROR: GitHub API returned HTTP ${treeRes.status}`);

  const treeJson = (await treeRes.json()) as { tree?: GithubTreeEntry[] };
  const tree = (treeJson.tree ?? []).filter((e) => e.type === "blob").slice(0, MAX_TREE_ENTRIES);
  return { defaultBranch, tree };
}

/** Fetches a single file's raw text content, bounded by MAX_FILE_BYTES. */
export async function fetchRawFile(owner: string, repo: string, ref: string, path: string): Promise<string> {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const url = `${RAW_BASE}/${owner}/${repo}/${encodeURIComponent(ref)}/${encodedPath}`;
  const res = await githubFetch(url);
  if (!res.ok) throw new Error(`UPSTREAM_ERROR: could not fetch ${path} (HTTP ${res.status})`);

  const contentLength = res.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_FILE_BYTES) {
    throw new Error("TOO_LARGE: source file exceeds size limit");
  }

  const text = await res.text();
  if (text.length > MAX_FILE_BYTES) throw new Error("TOO_LARGE: source file exceeds size limit");
  return text;
}
