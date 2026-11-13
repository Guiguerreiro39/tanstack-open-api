import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Container Runtime & CI/CD Configurations", () => {
  const rootDir = process.cwd();

  describe("Dockerfile", () => {
    it("exists and specifies a 5-stage multi-arch build based on node:24-slim", () => {
      const dockerfilePath = resolve(rootDir, "Dockerfile");
      expect(existsSync(dockerfilePath)).toBe(true);

      const content = readFileSync(dockerfilePath, "utf8");
      // 5 stages
      expect(content).toContain("FROM node:24-slim AS base");
      expect(content).toContain("FROM base AS deps");
      expect(content).toContain("FROM deps AS build");
      expect(content).toContain("FROM base AS prod-deps");
      expect(content).toContain("FROM node:24-slim AS runtime");

      // Non-root USER node and port 3000
      expect(content).toContain("USER node");
      expect(content).toContain("EXPOSE 3000");
      expect(content).toContain('CMD ["node", "server.mjs"]');

      // Build step runs generate:api and build
      expect(content).toMatch(/pnpm generate:api && pnpm build/);

      // Prod deps stage skips dev-only lifecycle scripts (e.g. prepare: effect-language-service patch)
      expect(content).toContain(
        "RUN CI=true pnpm install --prod --frozen-lockfile --ignore-scripts",
      );
    });
  });

  describe(".dockerignore", () => {
    it("exists and ignores build outputs, node_modules, tests, and secrets", () => {
      const dockerignorePath = resolve(rootDir, ".dockerignore");
      expect(existsSync(dockerignorePath)).toBe(true);

      const content = readFileSync(dockerignorePath, "utf8");
      const lines = content.split("\n").map((l) => l.trim());
      expect(lines).toContain("node_modules");
      expect(lines).toContain("dist");
      expect(lines).toContain("coverage");
      expect(lines).toContain(".git");
      expect(content).toMatch(/\.env\*/);
    });
  });

  describe("docker-compose.yml", () => {
    it("exists and configures the web service on port 3000 with /health probe", () => {
      const composePath = resolve(rootDir, "docker-compose.yml");
      expect(existsSync(composePath)).toBe(true);

      const content = readFileSync(composePath, "utf8");
      expect(content).toContain("services:");
      expect(content).toContain("web:");
      expect(content).toMatch(/3000:3000/);
      expect(content).toContain("API_INTERNAL_URL");
      expect(content).toMatch(/http:\/\/(127\.0\.0\.1|localhost):3000\/health/);
    });
  });

  describe(".github/workflows/ci.yml", () => {
    it("exists and defines verify and docker jobs with codegen drift checks", () => {
      const ciPath = resolve(rootDir, ".github/workflows/ci.yml");
      expect(existsSync(ciPath)).toBe(true);

      const content = readFileSync(ciPath, "utf8");
      expect(content).toContain("verify:");
      expect(content).toContain("docker:");
      expect(content).toMatch(/node-version:\s*"?24"?/);
      expect(content).toContain("pnpm generate:api");
      expect(content).toContain("git diff --exit-code src/shared/api/generated");
      expect(content).toContain("pnpm biome ci .");
      expect(content).toContain("pnpm typecheck");
      expect(content).toContain("pnpm test");
      expect(content).toContain("pnpm build");
      expect(content).toContain("git diff --exit-code src/routeTree.gen.ts");
      expect(content).toContain("docker compose config --quiet");
      expect(content).toContain("docker build");
    });
  });
});
