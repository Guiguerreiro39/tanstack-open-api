import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Documentation Suite & Verification Skill Hygiene", () => {
  const rootDir = process.cwd();

  describe("Root README.md", () => {
    const readmePath = resolve(rootDir, "README.md");

    it("exists and has fewer than 120 lines", () => {
      expect(existsSync(readmePath)).toBe(true);
      const content = readFileSync(readmePath, "utf8");
      const lines = content.split("\n");
      expect(lines.length).toBeLessThan(120);
    });

    it("contains value proposition paired with hono-open-api", () => {
      const content = readFileSync(readmePath, "utf8");
      expect(content).toContain("TanStack Start");
      expect(content).toContain("React 19");
      expect(content).toContain("Effect");
      expect(content).toContain("OpenAPI");
      expect(content).toContain("hono-open-api");
    });

    it("contains tech stack highlights", () => {
      const content = readFileSync(readmePath, "utf8");
      expect(content).toMatch(/TanStack (Start|Router|Query|Form)/);
      expect(content).toContain("Better Auth");
      expect(content).toContain("Tailwind");
      expect(content).toContain("shadcn/ui");
      expect(content).toContain("Biome");
      expect(content).toContain("MSW");
      expect(content).toMatch(/Sentry|Datadog/);
    });

    it("contains quickstart commands", () => {
      const content = readFileSync(readmePath, "utf8");
      expect(content).toContain("pnpm install");
      expect(content).toContain("pnpm dev");
      expect(content).toContain("pnpm test");
      expect(content).toContain("pnpm build");
    });

    it("contains project scripts table with all primary scripts", () => {
      const content = readFileSync(readmePath, "utf8");
      const requiredScripts = [
        "dev",
        "build",
        "start",
        "serve",
        "typecheck",
        "lint",
        "lint:fix",
        "test",
        "test:watch",
        "test:coverage",
        "generate:api",
        "sync:api",
      ];
      for (const script of requiredScripts) {
        expect(content).toContain(`\`${script}\``);
      }
    });

    it("contains route and feature slice architecture map", () => {
      const content = readFileSync(readmePath, "utf8");
      expect(content).toContain("_app");
      expect(content).toContain("tasks");
      expect(content).toContain("files");
      expect(content).toContain("showcase");
      expect(content).toContain("login");
    });
  });

  describe("docs/architecture.md", () => {
    const archPath = resolve(rootDir, "docs/architecture.md");

    it("exists and references all ADRs (ADR-0001 through ADR-0009)", () => {
      expect(existsSync(archPath)).toBe(true);
      const content = readFileSync(archPath, "utf8");
      for (let i = 1; i <= 9; i++) {
        const adrNum = String(i).padStart(4, "0");
        expect(content).toContain(`ADR-${adrNum}`);
      }
    });

    it("documents runtime composition and per-request isolation", () => {
      const content = readFileSync(archPath, "utf8");
      expect(content).toContain("getRouter");
      expect(content).toContain("createAppRuntime");
      expect(content).toMatch(/RouterAppContext|Composition Root/i);
    });

    it("documents FSD layer hierarchy and unidirectional DAG", () => {
      const content = readFileSync(archPath, "utf8");
      expect(content).toContain("app");
      expect(content).toContain("routes");
      expect(content).toContain("features");
      expect(content).toContain("shared");
    });

    it("documents Orval dual-target generation and Effect contracts", () => {
      const content = readFileSync(archPath, "utf8");
      expect(content).toContain("defineContract");
      expect(content).toContain("@orval/effect");
      expect(content).toContain("Data.TaggedError");
    });

    it("documents Better Auth isomorphic SSR header forwarding and route guards", () => {
      const content = readFileSync(archPath, "utf8");
      expect(content).toContain("authSessionQueryOptions");
      expect(content).toContain("_app.tsx");
      expect(content).toMatch(/cookie|authorization/i);
    });

    it("documents Realtime SSE live query and mutation buffering", () => {
      const content = readFileSync(archPath, "utf8");
      expect(content).toContain("useLiveQuery");
      expect(content).toContain("/api/v1/tasks/live");
      expect(content).toContain('["tasks", "mutation"]');
    });

    it("documents ObservabilityPort and trace correlation headers", () => {
      const content = readFileSync(archPath, "utf8");
      expect(content).toContain("ObservabilityPort");
      expect(content).toContain("traceparent");
      expect(content).toContain("X-Request-Id");
    });

    it("documents single-source design tokens and tactile elevation", () => {
      const content = readFileSync(archPath, "utf8");
      expect(content).toContain("shadow-tactile");
      expect(content).toContain("interactive-tactile");
      expect(content).toContain("src/styles/theme.css");
    });
  });

  describe("docs/development.md", () => {
    const devPath = resolve(rootDir, "docs/development.md");

    it("exists and describes the 3 local development modes", () => {
      expect(existsSync(devPath)).toBe(true);
      const content = readFileSync(devPath, "utf8");
      expect(content).toMatch(/mock mode/i);
      expect(content).toContain("9999");
      expect(content).toMatch(/docker compose|container/i);
    });

    it("contains all 4 template onboarding playbooks", () => {
      const content = readFileSync(devPath, "utf8");
      expect(content).toMatch(/Bootstrap|Rebrand/i);
      expect(content).toMatch(/Restyle|Theme/i);
      expect(content).toMatch(/Contract Sync|OpenAPI Contract Sync/i);
      expect(content).toMatch(/Demo-Slice Pruning|Pruning/i);
    });

    it("contains the 7-step checklist for scaffolding a new feature slice", () => {
      const content = readFileSync(devPath, "utf8");
      expect(content).toMatch(/scaffold(ing)?/i);
      // Verify step references or list of 7 steps
      expect(content).toContain("Step 1");
      expect(content).toContain("Step 7");
    });

    it("contains testing guide covering boundaries and test harness", () => {
      const content = readFileSync(devPath, "utf8");
      expect(content).toContain("Vitest");
      expect(content).toContain("MSW");
      expect(content).toContain("MockEventSource");
      expect(content).toContain("MockXMLHttpRequest");
    });

    it("contains environment variables reference table", () => {
      const content = readFileSync(devPath, "utf8");
      expect(content).toContain("ClientEnvSchema");
      expect(content).toContain("ServerEnvSchema");
      expect(content).toContain("VITE_API_URL");
      expect(content).toContain("API_INTERNAL_URL");
    });
  });

  describe("Runtime Verification Skill (.agents/skills/verify-tanstack-open-api/)", () => {
    const skillPath = resolve(rootDir, ".agents/skills/verify-tanstack-open-api/SKILL.md");
    const featuresDir = resolve(rootDir, ".agents/skills/verify-tanstack-open-api/features");

    it("SKILL.md exists with valid frontmatter and execution steps", () => {
      expect(existsSync(skillPath)).toBe(true);
      const content = readFileSync(skillPath, "utf8");
      expect(content).toMatch(/name:\s*verify-tanstack-open-api/);
      expect(content).toMatch(/description:/);
      expect(content).toContain("Launch");
      expect(content).toContain("Doctor");
      expect(content).toContain("Drive");
      expect(content).toContain("Evidence");
      expect(content).toContain("Cleanup");
    });

    it("SKILL.md references all 5 core feature flows", () => {
      const content = readFileSync(skillPath, "utf8");
      expect(content).toContain("showcase-and-theming");
      expect(content).toContain("auth-and-rbac");
      expect(content).toContain("live-tasks");
      expect(content).toContain("files-upload-and-download");
      expect(content).toContain("observability-and-headers");
    });

    it("features directory contains all 6 feature flow guides", () => {
      expect(existsSync(featuresDir)).toBe(true);
      const expectedFiles = [
        "README.md",
        "showcase-and-theming.md",
        "auth-and-rbac.md",
        "live-tasks.md",
        "files-upload-and-download.md",
        "observability-and-headers.md",
      ];
      for (const file of expectedFiles) {
        const filePath = resolve(featuresDir, file);
        expect(existsSync(filePath), `Expected ${file} to exist in features/`).toBe(true);
      }
    });
  });
});
