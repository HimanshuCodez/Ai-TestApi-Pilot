# TestPilot AI — Backend (server/)

Node.js/Express/TypeScript backend for TestPilot AI. Given an API's OpenAPI spec (by URL or file upload), it discovers the API's endpoints, uses an LLM (Gemini) to design test cases, executes those tests as real HTTP requests against the target `baseUrl`, and produces a deterministic health/security/coverage/performance report with AI-written failure explanations.

Connect via an **API URL**, an **uploaded OpenAPI file**, or a **public GitHub repository** (`connect/github` looks for a checked-in spec first, then falls back to a regex-based scan of Express/Fastify/NestJS/Flask/FastAPI/Django route definitions).

## Stack

- Express + TypeScript, ESM (NodeNext)
- PostgreSQL via Prisma
- Redis + BullMQ for background jobs (spec discovery, AI analysis, test generation, test execution)
- Gemini (`@google/genai`) behind an `AIProvider` abstraction — every AI response is Zod-validated before it's trusted
- Server-Sent Events for live job progress, with a polling fallback

## Setup

1. Start Postgres + Redis (docker-compose.yml lives at the repo root):

   ```bash
   docker compose up -d
   ```

2. Copy the env file and fill in secrets:

   ```bash
   cd server
   cp .env.example .env
   ```

   | Var | Required | Notes |
   |---|---|---|
   | `DATABASE_URL` | yes | matches `docker-compose.yml`'s Postgres service by default |
   | `REDIS_URL` | yes | matches `docker-compose.yml`'s Redis service by default |
   | `GEMINI_API_KEY` | yes (for AI-backed features) | AI Analysis/test-generation/failure-analysis jobs fail without it |
   | `GEMINI_MODEL` | no | defaults to `gemini-2.5-flash` |
   | `JWT_SECRET` | yes | min 16 chars |
   | `JWT_EXPIRES_IN` | no | defaults to `7d` |
   | `PORT` | no | defaults to `4000` |
   | `CORS_ORIGIN` | no | defaults to `http://localhost:5173` (the Vite dev server) |
   | `GITHUB_TOKEN` | no | raises GitHub API rate limits for `connect/github`; unauthenticated requests work but limit to 60 req/hr |

3. Install dependencies and run migrations:

   ```bash
   npm install
   npm run prisma:migrate
   ```

4. Start the server (API + BullMQ workers run in one process for V1):

   ```bash
   npm run dev
   ```

   From the repo root, `npm run dev` (if configured) runs this alongside the Vite frontend.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | start with hot reload (`tsx watch`) |
| `npm run build` | type-check + compile to `dist/` |
| `npm start` | run the compiled build |
| `npm test` | run the Vitest suite |
| `npm run prisma:generate` | regenerate the Prisma client |
| `npm run prisma:migrate` | create/apply a dev migration |
| `npm run prisma:deploy` | apply migrations in production |

## Concepts

- **Jobs are durable.** Every background operation (`connect/url`, `analyze-endpoints`, `generate-tests`, `run-tests`) enqueues a BullMQ job *and* writes a `Job` row in Postgres (`{status, stage, progress, error, resultRef}`). The `Job` row is the source of truth for both `GET /api/jobs/:id` polling and the SSE stream — BullMQ is just the execution engine.
- **Nothing from the AI is trusted blindly.** Every Gemini response is parsed against a Zod schema (`src/ai/schemas.ts`) before it's persisted; on a schema mismatch the call is retried once with a stricter prompt, then the job fails with a friendly error.
- **Report scores are never AI-invented.** `healthScore`, `securityScore`, `coverageScore`, and `performanceScore` are all computed deterministically from real `TestResult`/`Finding` rows (`src/reports/report.scoring.ts`). The AI only contributes a qualitative `aiInsights` summary alongside the numbers.
- **SSRF protection is defense-in-depth.** The same `assertSafeUrl` guard (rejects private/loopback/link-local/metadata IPs and non-http(s) schemes) is applied both when fetching a spec from a URL and per-request when executing generated tests against a project's `baseUrl`.
- **Secrets are redacted before they're ever persisted or streamed** — `Authorization`, `Cookie`, `Set-Cookie`, API-key-shaped headers, and body fields matching `/password|token|secret|apikey/i` are stripped in `src/utils/redact.ts`.

## Authentication

All routes below (except `/api/auth/register` and `/api/auth/login`) require a JWT, either via:

- `Authorization: Bearer <token>` header, or
- `?token=<token>` query param (needed for the SSE endpoint, since `EventSource` can't set custom headers)

## API Reference

All responses are JSON. Errors are shaped as:

```json
{ "error": { "message": "Human-readable message.", "code": "SOME_CODE", "details": { } } }
```

`details` is only present on `422 VALIDATION_ERROR` (Zod field errors). Common `code` values: `VALIDATION_ERROR` (422), `NOT_FOUND` (404), `FORBIDDEN` (403), `UNAUTHORIZED` (401), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500), plus per-case codes like `NO_BASE_URL` surfaced from job failures.

### Auth

#### `POST /api/auth/register`
Rate-limited (20 req/15min).

Request:
```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "at-least-8-chars" }
```
Response `201`:
```json
{ "token": "<jwt>", "user": { "id": "...", "name": "Ada Lovelace", "email": "ada@example.com" } }
```

#### `POST /api/auth/login`
Rate-limited (20 req/15min).

Request: `{ "email": "...", "password": "..." }`
Response `200`: same shape as register.

#### `GET /api/auth/me`
Auth required. Response `200`: `{ "user": { "id", "name", "email" } }`

---

### Projects

#### `POST /api/projects`
Request: `{ "name": "My API", "description": "" }`
Response `201`: the created `Project` row.

#### `GET /api/projects`
Response `200`: `Project[]` for the current user.

#### `GET /api/projects/:id`
Response `200`: a single owned `Project`.

#### `GET /api/projects/:id/endpoints`
Response `200`: `Endpoint[]` discovered for the project (empty until a source has been connected).

---

### Connecting a source (Phase 1: URL or file only)

Both routes are rate-limited (30 req/15min) and kick off the same `analyze_url` job type (spec fetch/parse → endpoint discovery → auth-scheme detection).

#### `POST /api/projects/:id/connect/url`
Request: `{ "url": "https://api.example.com/openapi.json" }`
Response `202`: `{ "jobId": "..." }`

#### `POST /api/projects/:id/connect/file`
Request: `{ "fileName": "openapi.yaml", "content": "<raw file text>" }`
Response `202`: `{ "jobId": "..." }`

#### `POST /api/projects/:id/connect/github`
Request: `{ "repoUrl": "https://github.com/owner/repo" }` — public repositories only.
Response `202`: `{ "jobId": "..." }`

Searches the repo tree for a checked-in `openapi`/`swagger` spec file first (any path) and parses it exactly like the URL/file flow. If none is found, falls back to a best-effort regex scan of Express/Fastify/NestJS (`.js`/`.ts`) and Flask/FastAPI/Django (`.py`) source files for route definitions — endpoints found this way have `source: "github"`, no request/response schemas, and `authRequired` set from a keyword heuristic only. `Project.baseUrl` is left unset in the scan fallback (there's no way to infer it statically) — set it manually before running tests.

Job `resultRef` (on completion) is a JSON string: `{ "endpointCount": number, "authSchemeCount": number, "specVersion": string, "baseUrl": string }`.

---

### AI Analysis

#### `POST /api/projects/:id/analyze-endpoints`
Rate-limited (30 req/15min). Runs a qualitative AI pass over every discovered endpoint.
Response `202`: `{ "jobId": "..." }`. `resultRef` on completion: `{ "analyzed": number, "flagged": number }`.

---

### Test generation

#### `POST /api/projects/:id/generate-tests`
Rate-limited (30 req/15min). Generates positive/negative/boundary/security/auth test cases via AI.
Request: `{ "endpointIds": ["..."] }` — omit to generate for every endpoint (also used to regenerate tests scoped to one endpoint).
Response `202`: `{ "jobId": "..." }`

#### `GET /api/projects/:id/tests`
Response `200`: `GeneratedTest[]`, newest first.

---

### Running tests

#### `POST /api/projects/:id/run-tests`
Rate-limited (30 req/15min). Executes generated tests as real HTTP requests against `Project.baseUrl`, analyzes failures with AI, and generates a `Report`, all in one job.
Request: `{ "testIds": ["..."] }` — omit to run every generated test.
Response `202`: `{ "jobId": "..." }`
`resultRef` on completion: `{ "testRunId": "...", "reportId": "...", "total": number, "passed": number, "failed": number }`

#### `GET /api/projects/:id/runs/:runId`
Response `200`: `TestRun` including `results[]` (each with its `generatedTest` embedded).

---

### Reports & findings

#### `GET /api/projects/:id/report`
Returns the most recent report. `404 NOT_FOUND` if no test run has completed yet.
Response `200`:
```json
{
  "report": {
    "id": "...", "testRunId": "...",
    "healthScore": 92, "securityScore": 88, "coverageScore": 100, "performanceScore": 95,
    "metrics": { "avgDurationMs": 0, "p50DurationMs": 0, "p95DurationMs": 0, "...": "..." },
    "aiInsights": { "summary": "...", "topRecommendations": ["..."] } 
  },
  "findings": [ { "id", "severity", "title", "endpoint", "method", "description", "recommendation", "confidence", "status" } ]
}
```
`aiInsights` is `null` if the insight-generation call failed — the numeric scores are still valid.

#### `GET /api/projects/:id/findings/:findingId`
Response `200`: a single `Finding`. `404 NOT_FOUND` if it doesn't belong to the project.

---

### Jobs (progress polling / streaming)

#### `GET /api/jobs/:id`
Response `200`: `{ "id", "type", "status", "stage", "progress", "error", "resultRef" }`
`status` is one of `queued | processing | completed | failed`.

#### `GET /api/jobs/:id/events`
Server-Sent Events stream. Requires `?token=<jwt>` (or the `Authorization` header, but browsers' `EventSource` can't set one). Emits:
```
data: {"type":"progress","stage":"RUNNING_TESTS","progress":42}
data: {"type":"completed","stage":"COMPLETED","progress":100,"resultRef":"..."}
```
or `{"type":"failed", "error": "..."}`. Sends a `: heartbeat` comment every 15s to keep the connection alive; closes automatically once the job reaches a terminal state. Clients should fall back to polling `GET /api/jobs/:id` if the SSE connection errors.

---

## Job stages

| Job type | Stages |
|---|---|
| `analyze_url` | URL: `CONNECTING → FETCHING_SPEC → PARSING_API → DISCOVERING_ENDPOINTS → ANALYZING_AUTH → COMPLETED`; file: `PARSING_API → DISCOVERING_ENDPOINTS → ANALYZING_AUTH → COMPLETED`; GitHub: `CONNECTING → SCANNING_REPOSITORY → PARSING_API → DISCOVERING_ENDPOINTS → ANALYZING_AUTH → COMPLETED` |
| `analyze_endpoints` | `ANALYZING_ENDPOINTS → COMPLETED` |
| `generate_tests` | `GENERATING_TESTS → COMPLETED` |
| `run_tests` | `RUNNING_TESTS → ANALYZING_FAILURES → GENERATING_REPORT → COMPLETED` |

Any job can end in `FAILED` with a friendly `error` string instead of a raw stack trace.

## Testing

```bash
npm test
```

Covers: the OpenAPI parser (2.0/3.0/3.1, JSON+YAML, invalid-doc rejection), the SSRF guard, AI response Zod validation, secret redaction, deterministic report scoring, and auth (register/login/JWT).
