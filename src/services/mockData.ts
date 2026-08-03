import type {
  ActivityItem,
  ApiEndpoint,
  Project,
  SecurityIssue,
  TestCase,
  TestRun,
  User,
} from "@/types";

export const currentUser: User = {
  id: "u1",
  name: "Himanshu Gaur",
  email: "himanshugaur055@gmail.com",
  avatarInitials: "HG",
  role: "Founding Engineer",
  plan: "Pro",
};

export const projects: Project[] = [
  {
    id: "proj-payflow",
    name: "PayFlow Core API",
    description: "Payments, ledgers, and settlement orchestration service.",
    baseUrl: "https://api.payflow.dev/v2",
    status: "warning",
    healthScore: 82,
    securityScore: 76,
    endpointCount: 46,
    testsGenerated: 312,
    lastScanAt: "2026-07-29T14:12:00Z",
    createdAt: "2025-11-02T09:00:00Z",
    tags: ["fintech", "production"],
    runsToday: 14,
    passRate: 94.2,
  },
  {
    id: "proj-nova",
    name: "Nova Identity Service",
    description: "Authentication, sessions, and RBAC for the Nova platform.",
    baseUrl: "https://auth.nova.io/api",
    status: "critical",
    healthScore: 61,
    securityScore: 48,
    endpointCount: 28,
    testsGenerated: 187,
    lastScanAt: "2026-07-29T09:40:00Z",
    createdAt: "2026-01-14T09:00:00Z",
    tags: ["auth", "critical-path"],
    runsToday: 9,
    passRate: 81.5,
  },
  {
    id: "proj-orbit",
    name: "Orbit Logistics API",
    description: "Fleet routing, order tracking, and warehouse sync.",
    baseUrl: "https://orbit-api.internal/v1",
    status: "healthy",
    healthScore: 95,
    securityScore: 91,
    endpointCount: 63,
    testsGenerated: 441,
    lastScanAt: "2026-07-28T22:05:00Z",
    createdAt: "2025-08-20T09:00:00Z",
    tags: ["logistics", "internal"],
    runsToday: 21,
    passRate: 98.6,
  },
  {
    id: "proj-atlas",
    name: "Atlas Public Gateway",
    description: "Public-facing REST gateway for third-party integrations.",
    baseUrl: "https://gw.atlas.dev/public",
    status: "scanning",
    healthScore: 0,
    securityScore: 0,
    endpointCount: 37,
    testsGenerated: 0,
    lastScanAt: "2026-07-30T00:02:00Z",
    createdAt: "2026-07-29T18:00:00Z",
    tags: ["public-api"],
    runsToday: 0,
    passRate: 0,
  },
];

export const endpoints: ApiEndpoint[] = [
  {
    id: "ep-login",
    method: "POST",
    path: "/auth/login",
    summary: "Authenticate a user and issue a JWT session pair.",
    tag: "Authentication",
    authRequired: false,
    params: [],
    headers: [
      { name: "Content-Type", type: "string", required: true, in: "header", description: "application/json", example: "application/json" },
    ],
    requestBody: `{
  "email": "user@example.com",
  "password": "••••••••"
}`,
    responses: [
      { status: 200, description: "Login successful", example: `{ "accessToken": "eyJhbGciOi...", "refreshToken": "d41d8cd9..." }` },
      { status: 401, description: "Invalid credentials", example: `{ "error": "invalid_credentials" }` },
    ],
    healthScore: 54,
    issueCount: 3,
  },
  {
    id: "ep-refresh",
    method: "POST",
    path: "/auth/refresh",
    summary: "Exchange a refresh token for a new access token.",
    tag: "Authentication",
    authRequired: true,
    params: [],
    headers: [{ name: "Authorization", type: "string", required: true, in: "header", description: "Bearer refresh token", example: "Bearer d41d8cd9..." }],
    responses: [{ status: 200, description: "Token refreshed", example: `{ "accessToken": "eyJhbGciOi..." }` }],
    healthScore: 71,
    issueCount: 1,
  },
  {
    id: "ep-users-id",
    method: "GET",
    path: "/users/{id}",
    summary: "Fetch a user profile by ID.",
    tag: "Users",
    authRequired: true,
    params: [{ name: "id", type: "string", required: true, in: "path", description: "User UUID", example: "usr_8f21..." }],
    headers: [{ name: "Authorization", type: "string", required: true, in: "header", description: "Bearer access token" }],
    responses: [
      { status: 200, description: "User found", example: `{ "id": "usr_8f21", "email": "jane@doe.com", "role": "admin" }` },
      { status: 404, description: "User not found", example: `{ "error": "not_found" }` },
    ],
    healthScore: 88,
    issueCount: 0,
  },
  {
    id: "ep-payments",
    method: "POST",
    path: "/payments/charge",
    summary: "Create a new payment charge against a saved instrument.",
    tag: "Payments",
    authRequired: true,
    params: [],
    headers: [
      { name: "Authorization", type: "string", required: true, in: "header", description: "Bearer access token" },
      { name: "Idempotency-Key", type: "string", required: false, in: "header", description: "Prevents duplicate charges" },
    ],
    requestBody: `{
  "amount": 4999,
  "currency": "usd",
  "source": "card_1N3T00",
  "description": "Pro plan upgrade"
}`,
    responses: [
      { status: 201, description: "Charge created", example: `{ "id": "ch_1N3T00", "status": "succeeded" }` },
      { status: 402, description: "Charge failed", example: `{ "error": "card_declined" }` },
    ],
    healthScore: 79,
    issueCount: 2,
  },
  {
    id: "ep-orders",
    method: "GET",
    path: "/orders",
    summary: "List orders with cursor-based pagination.",
    tag: "Orders",
    authRequired: true,
    params: [
      { name: "limit", type: "integer", required: false, in: "query", description: "Page size, max 100", example: "25" },
      { name: "cursor", type: "string", required: false, in: "query", description: "Pagination cursor" },
    ],
    headers: [{ name: "Authorization", type: "string", required: true, in: "header", description: "Bearer access token" }],
    responses: [{ status: 200, description: "Orders returned", example: `{ "data": [...], "nextCursor": "eyJpZCI6..." }` }],
    healthScore: 96,
    issueCount: 0,
  },
  {
    id: "ep-webhook",
    method: "POST",
    path: "/webhooks/stripe",
    summary: "Receive and verify inbound Stripe webhook events.",
    tag: "Webhooks",
    authRequired: false,
    params: [],
    headers: [{ name: "Stripe-Signature", type: "string", required: true, in: "header", description: "HMAC signature header" }],
    requestBody: `{ "type": "charge.succeeded", "data": { "object": { "id": "ch_1N3T00" } } }`,
    responses: [{ status: 200, description: "Event processed", example: `{ "received": true }` }],
    healthScore: 65,
    issueCount: 2,
  },
  {
    id: "ep-delete-user",
    method: "DELETE",
    path: "/users/{id}",
    summary: "Permanently delete a user account and associated data.",
    tag: "Users",
    authRequired: true,
    params: [{ name: "id", type: "string", required: true, in: "path", description: "User UUID" }],
    headers: [{ name: "Authorization", type: "string", required: true, in: "header", description: "Bearer access token" }],
    responses: [
      { status: 204, description: "User deleted", example: "" },
      { status: 403, description: "Forbidden", example: `{ "error": "insufficient_scope" }` },
    ],
    healthScore: 58,
    issueCount: 2,
  },
];

export const securityIssues: SecurityIssue[] = [
  {
    id: "sec-1",
    severity: "critical",
    title: "SQL Injection Risk",
    endpoint: "/orders",
    method: "GET",
    category: "Injection",
    description:
      "The `sort` query parameter is concatenated directly into a raw SQL ORDER BY clause without allow-listing or parameter binding.",
    risk:
      "An attacker can inject arbitrary SQL via the sort parameter to exfiltrate data across tenants, bypass row-level security, or corrupt records.",
    fix: "Whitelist allowed sort columns and always use parameterized queries or an ORM query builder — never interpolate user input into SQL strings.",
    codeSnippet: `// Before — vulnerable
const sql = \`SELECT * FROM orders ORDER BY \${req.query.sort}\`;

// After — safe
const ALLOWED_SORTS = new Set(["created_at", "total", "status"]);
const sort = ALLOWED_SORTS.has(req.query.sort) ? req.query.sort : "created_at";
const orders = await db
  .selectFrom("orders")
  .orderBy(sort, "desc")
  .execute();`,
    codeLang: "typescript",
    discoveredAt: "2026-07-29T14:10:00Z",
    status: "open",
  },
  {
    id: "sec-2",
    severity: "critical",
    title: "Expired JWT Accepted",
    endpoint: "/auth/login",
    method: "POST",
    category: "Authentication",
    description:
      "The endpoint does not validate JWT expiration (`exp` claim) correctly when verifying refresh tokens issued before the last key rotation.",
    risk: "Attackers can continue using expired or revoked sessions indefinitely, leading to full account takeover after a leaked token.",
    fix: "Use middleware that verifies `exp`, `nbf`, and `iat` claims on every request and rejects tokens signed with rotated-out keys.",
    codeSnippet: `import { jwtVerify } from "jose";

export async function requireAuth(req, res, next) {
  try {
    const { payload } = await jwtVerify(req.token, SECRET, {
      clockTolerance: 0,
      requiredClaims: ["exp", "iat", "sub"],
    });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "token_expired_or_invalid" });
  }
}`,
    codeLang: "typescript",
    discoveredAt: "2026-07-29T14:11:00Z",
    status: "open",
  },
  {
    id: "sec-3",
    severity: "high",
    title: "Missing Rate Limiting",
    endpoint: "/auth/login",
    method: "POST",
    category: "Abuse Prevention",
    description: "No rate limiting or lockout policy is enforced on the login endpoint.",
    risk: "Enables brute-force credential stuffing attacks against user accounts at unlimited request volume.",
    fix: "Apply a sliding-window rate limiter keyed by IP + email, and add exponential backoff after repeated failures.",
    codeSnippet: `import { rateLimit } from "@/lib/rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req) => \`\${req.ip}:\${req.body.email}\`,
});`,
    codeLang: "typescript",
    discoveredAt: "2026-07-29T14:09:00Z",
    status: "open",
  },
  {
    id: "sec-4",
    severity: "high",
    title: "Insecure Direct Object Reference",
    endpoint: "/users/{id}",
    method: "DELETE",
    category: "Authorization",
    description: "Any authenticated user can delete any other user's account by supplying an arbitrary user ID.",
    risk: "Non-admin users can delete arbitrary accounts, causing data loss and service disruption.",
    fix: "Verify the requesting principal owns the resource or has an explicit admin scope before performing the deletion.",
    codeSnippet: `if (req.user.id !== params.id && !req.user.scopes.includes("admin")) {
  return res.status(403).json({ error: "insufficient_scope" });
}
await db.deleteFrom("users").where("id", "=", params.id).execute();`,
    codeLang: "typescript",
    discoveredAt: "2026-07-29T09:38:00Z",
    status: "acknowledged",
  },
  {
    id: "sec-5",
    severity: "medium",
    title: "Weak Input Validation",
    endpoint: "/payments/charge",
    method: "POST",
    category: "Validation",
    description: "The `amount` field accepts negative numbers and floating-point values without bounds checking.",
    risk: "Negative charge amounts could be exploited to credit an account or cause integer underflow in the ledger.",
    fix: "Validate amount as a positive integer (cents) within a sane range using a schema validator like Zod.",
    codeSnippet: `const ChargeSchema = z.object({
  amount: z.number().int().positive().max(10_000_00),
  currency: z.enum(["usd", "eur", "gbp"]),
});`,
    codeLang: "typescript",
    discoveredAt: "2026-07-29T14:08:00Z",
    status: "open",
  },
  {
    id: "sec-6",
    severity: "medium",
    title: "Webhook Signature Not Verified",
    endpoint: "/webhooks/stripe",
    method: "POST",
    category: "Authentication",
    description: "Incoming webhook payloads are processed before the Stripe-Signature header is verified.",
    risk: "Attackers can forge webhook events to trigger fraudulent order fulfillment or refunds.",
    fix: "Verify the HMAC signature using the raw request body before parsing or acting on the payload.",
    codeSnippet: `const event = stripe.webhooks.constructEvent(
  rawBody,
  req.headers["stripe-signature"],
  process.env.STRIPE_WEBHOOK_SECRET
);`,
    codeLang: "typescript",
    discoveredAt: "2026-07-29T14:07:00Z",
    status: "open",
  },
  {
    id: "sec-7",
    severity: "low",
    title: "Missing Security Headers",
    endpoint: "/*",
    method: "GET",
    category: "Configuration",
    description: "Responses are missing `Strict-Transport-Security` and `X-Content-Type-Options` headers.",
    risk: "Slightly increases exposure to protocol downgrade and MIME-sniffing based attacks.",
    fix: "Attach standard security headers globally via middleware such as helmet().",
    codeSnippet: `app.use(helmet({
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));`,
    codeLang: "typescript",
    discoveredAt: "2026-07-29T14:06:00Z",
    status: "resolved",
  },
];

const kinds: TestCase["kind"][] = ["positive", "negative", "boundary", "security"];

function genTests(): TestCase[] {
  const templates: Record<TestCase["kind"], (ep: ApiEndpoint) => Omit<TestCase, "id" | "endpointId" | "method" | "path" | "kind">> = {
    positive: (ep) => ({
      title: `${ep.method} ${ep.path} returns a valid response for well-formed input`,
      description: "Verifies the happy path succeeds and the response matches the documented schema.",
      request: `${ep.method} ${ep.path}\n${ep.requestBody ?? "(no body)"}`,
      expected: `Status ${ep.responses[0]?.status ?? 200}, response matches schema`,
    }),
    negative: (ep) => ({
      title: `${ep.method} ${ep.path} rejects malformed or missing required fields`,
      description: "Ensures the endpoint fails gracefully with a clear 4xx error on invalid input.",
      request: `${ep.method} ${ep.path}\n{ "malformed": true }`,
      expected: "Status 400, structured validation error body",
    }),
    boundary: (ep) => ({
      title: `${ep.method} ${ep.path} handles boundary and edge-case values`,
      description: "Tests min/max lengths, empty strings, extreme numbers, and unicode input.",
      request: `${ep.method} ${ep.path}\n{ "value": "MAX_LENGTH_STRING" }`,
      expected: "No 5xx errors; input is clamped or rejected safely",
    }),
    security: (ep) => ({
      title: `${ep.method} ${ep.path} resists injection and auth bypass attempts`,
      description: "Fuzzes the endpoint with SQLi/XSS payloads and forged/expired tokens.",
      request: `${ep.method} ${ep.path}\nAuthorization: Bearer <expired_token>`,
      expected: "Status 401/403, no data leakage, no stack traces",
    }),
  };

  const out: TestCase[] = [];
  endpoints.forEach((ep, epIdx) => {
    kinds.forEach((kind, kIdx) => {
      const t = templates[kind](ep);
      out.push({
        id: `test-${epIdx}-${kIdx}`,
        endpointId: ep.id,
        method: ep.method,
        path: ep.path,
        kind,
        ...t,
        status: kind === "security" && ep.issueCount > 0 ? "failed" : "passed",
        durationMs: Math.floor(80 + Math.random() * 420),
      });
    });
  });
  return out;
}

export const testCases: TestCase[] = genTests();

export const activity: ActivityItem[] = [
  {
    id: "act-1",
    type: "bug",
    title: "Critical issue found",
    description: "SQL Injection risk detected in /orders on PayFlow Core API",
    timestamp: "2026-07-29T14:12:00Z",
  },
  {
    id: "act-2",
    type: "scan",
    title: "AI scan completed",
    description: "Nova Identity Service — 28 endpoints analyzed, health score 61",
    timestamp: "2026-07-29T09:41:00Z",
  },
  {
    id: "act-3",
    type: "test",
    title: "Test suite passed",
    description: "441 tests generated and executed for Orbit Logistics API",
    timestamp: "2026-07-28T22:08:00Z",
  },
  {
    id: "act-4",
    type: "deploy",
    title: "Project connected",
    description: "Atlas Public Gateway linked via Swagger URL",
    timestamp: "2026-07-29T18:00:00Z",
  },
  {
    id: "act-5",
    type: "chat",
    title: "AI explained a failure",
    description: "\"Why did /auth/login fail?\" answered in AI Chat",
    timestamp: "2026-07-28T16:22:00Z",
  },
];

export const recentRuns: TestRun[] = [
  { id: "run-1", projectId: "proj-payflow", status: "passed", startedAt: "2026-07-29T14:00:00Z", durationMs: 48000, total: 312, passed: 294, failed: 12, skipped: 6 },
  { id: "run-2", projectId: "proj-nova", status: "failed", startedAt: "2026-07-29T09:30:00Z", durationMs: 31000, total: 187, passed: 152, failed: 31, skipped: 4 },
  { id: "run-3", projectId: "proj-orbit", status: "passed", startedAt: "2026-07-28T22:00:00Z", durationMs: 61000, total: 441, passed: 435, failed: 2, skipped: 4 },
];

export const chartData = {
  passRateTrend: [
    { day: "Mon", passRate: 88 },
    { day: "Tue", passRate: 90 },
    { day: "Wed", passRate: 86 },
    { day: "Thu", passRate: 93 },
    { day: "Fri", passRate: 91 },
    { day: "Sat", passRate: 95 },
    { day: "Sun", passRate: 94 },
  ],
  coverage: [
    { name: "Covered", value: 82 },
    { name: "Uncovered", value: 18 },
  ],
  responseTime: [
    { day: "Mon", p50: 120, p95: 340 },
    { day: "Tue", p50: 118, p95: 310 },
    { day: "Wed", p50: 132, p95: 380 },
    { day: "Thu", p50: 110, p95: 290 },
    { day: "Fri", p50: 125, p95: 305 },
    { day: "Sat", p50: 104, p95: 260 },
    { day: "Sun", p50: 108, p95: 275 },
  ],
  bugDistribution: [
    { name: "Injection", value: 4 },
    { name: "Auth", value: 6 },
    { name: "Validation", value: 9 },
    { name: "Config", value: 3 },
    { name: "Rate Limit", value: 2 },
  ],
  requestsByEndpoint: [
    { name: "/orders", requests: 4820 },
    { name: "/auth/login", requests: 3910 },
    { name: "/payments/charge", requests: 2760 },
    { name: "/users/{id}", requests: 2210 },
    { name: "/webhooks/stripe", requests: 1340 },
  ],
};

export const analysisSteps = [
  { id: "s1", label: "Reading file", detail: "Parsing swagger.json (412 KB)" },
  { id: "s2", label: "Parsing schema", detail: "Resolving $ref definitions and components" },
  { id: "s3", label: "Found 37 endpoints", detail: "Grouped into 6 resource tags" },
  { id: "s4", label: "Understanding authentication", detail: "Detected Bearer JWT + API key schemes" },
  { id: "s5", label: "Mapping relationships", detail: "Building dependency graph across resources" },
  { id: "s6", label: "Checking SQL injection", detail: "Fuzzing query and path parameters" },
  { id: "s7", label: "Analyzing JWT handling", detail: "Validating expiration and signature checks" },
  { id: "s8", label: "Checking rate limiting", detail: "Probing for missing throttling policies" },
  { id: "s9", label: "Generating test cases", detail: "Synthesizing positive, negative & boundary tests" },
  { id: "s10", label: "Calculating API health", detail: "Aggregating security, performance & docs scores" },
];
