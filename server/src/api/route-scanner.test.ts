import { describe, expect, it } from "vitest";
import { isScannableSourceFile, rankCandidateFiles, routesToEndpoints, scanFileForRoutes } from "./route-scanner.js";

describe("scanFileForRoutes", () => {
  it("extracts Express routes and normalizes :param syntax", () => {
    const content = `
      const router = require('express').Router();
      router.get('/users/:id', getUser);
      router.post("/users", createUser);
    `;
    const endpoints = routesToEndpoints(scanFileForRoutes(content, "src/routes/users.js"));
    expect(endpoints).toContainEqual(
      expect.objectContaining({ method: "GET", path: "/users/{id}", source: "github" })
    );
    expect(endpoints).toContainEqual(expect.objectContaining({ method: "POST", path: "/users" }));
  });

  it("extracts path parameters from normalized routes", () => {
    const content = `router.get('/users/:id/posts/:postId', handler);`;
    const [endpoint] = routesToEndpoints(scanFileForRoutes(content, "routes.js"));
    expect(endpoint.parameters).toEqual([
      { name: "id", type: "string", required: true, in: "path", description: "" },
      { name: "postId", type: "string", required: true, in: "path", description: "" },
    ]);
  });

  it("combines NestJS @Controller prefix with method decorators", () => {
    const content = `
      @Controller('users')
      export class UsersController {
        @Get(':id')
        findOne() {}

        @Post()
        create() {}
      }
    `;
    const endpoints = routesToEndpoints(scanFileForRoutes(content, "users.controller.ts"));
    expect(endpoints).toContainEqual(expect.objectContaining({ method: "GET", path: "/users/{id}" }));
    expect(endpoints).toContainEqual(expect.objectContaining({ method: "POST", path: "/users" }));
  });

  it("extracts FastAPI routes", () => {
    const content = `
      @app.get("/items/{item_id}")
      def read_item(item_id: int):
          pass
    `;
    const endpoints = routesToEndpoints(scanFileForRoutes(content, "main.py"));
    expect(endpoints).toContainEqual(expect.objectContaining({ method: "GET", path: "/items/{item_id}" }));
  });

  it("extracts Flask routes with explicit methods, defaulting to GET otherwise", () => {
    const content = `
      @app.route('/login', methods=['POST'])
      def login():
          pass

      @app.route('/health')
      def health():
          pass
    `;
    const endpoints = routesToEndpoints(scanFileForRoutes(content, "app.py"));
    expect(endpoints).toContainEqual(expect.objectContaining({ method: "POST", path: "/login" }));
    expect(endpoints).toContainEqual(expect.objectContaining({ method: "GET", path: "/health" }));
  });

  it("normalizes Flask typed converters like <int:id>", () => {
    const content = `@app.route('/users/<int:id>')\ndef get_user(id):\n    pass`;
    const [endpoint] = routesToEndpoints(scanFileForRoutes(content, "app.py"));
    expect(endpoint.path).toBe("/users/{id}");
  });

  it("extracts Django urls.py paths as GET without a real method signal", () => {
    const content = `urlpatterns = [\n    path('api/users/', views.user_list),\n]`;
    const endpoints = routesToEndpoints(scanFileForRoutes(content, "app/urls.py"));
    expect(endpoints).toContainEqual(expect.objectContaining({ method: "GET", path: "/api/users" }));
  });

  it("does not extract Django-style path() calls from non-urls.py files", () => {
    const content = `path('/some/file/system/path', 'r')`;
    const endpoints = routesToEndpoints(scanFileForRoutes(content, "src/fs-helper.py"));
    expect(endpoints).toHaveLength(0);
  });

  it("flags authRequired when a nearby line hints at auth middleware", () => {
    const content = `router.get('/admin', requireAuth, adminHandler);`;
    const [endpoint] = routesToEndpoints(scanFileForRoutes(content, "routes.js"));
    expect(endpoint.authRequired).toBe(true);
  });

  it("deduplicates identical method+path pairs across files", () => {
    const routesA = scanFileForRoutes(`router.get('/ping', h);`, "a.js");
    const routesB = scanFileForRoutes(`router.get('/ping', h);`, "b.js");
    const endpoints = routesToEndpoints([...routesA, ...routesB]);
    expect(endpoints).toHaveLength(1);
  });
});

describe("isScannableSourceFile", () => {
  it("accepts recognized source extensions", () => {
    expect(isScannableSourceFile("src/routes/users.ts")).toBe(true);
    expect(isScannableSourceFile("app/views.py")).toBe(true);
  });

  it("rejects vendored, built, and test files", () => {
    expect(isScannableSourceFile("node_modules/express/index.js")).toBe(false);
    expect(isScannableSourceFile("dist/index.js")).toBe(false);
    expect(isScannableSourceFile("src/routes/users.test.ts")).toBe(false);
    expect(isScannableSourceFile("venv/lib/site-packages/flask/app.py")).toBe(false);
  });

  it("rejects unrecognized extensions", () => {
    expect(isScannableSourceFile("README.md")).toBe(false);
  });
});

describe("rankCandidateFiles", () => {
  it("prioritizes files with route/controller/api hints", () => {
    const ranked = rankCandidateFiles(["src/utils/helpers.js", "src/routes/users.js", "src/index.js"]);
    expect(ranked[0]).toBe("src/routes/users.js");
  });
});
