import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import lint from "@commitlint/lint";
import load from "@commitlint/load";
import type { LintOptions } from "@commitlint/types";
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

  describe("commitlint.config.mjs", () => {
    const configPath = resolve(rootDir, "commitlint.config.mjs");

    async function lintCommitMessage(message: string) {
      const config = await load({}, { file: "commitlint.config.mjs", cwd: rootDir });
      return lint(message, config.rules, {
        defaultIgnores: config.defaultIgnores,
        ignores: config.ignores,
        parserOpts: config.parserPreset?.parserOpts as LintOptions["parserOpts"],
        plugins: config.plugins,
        helpUrl: config.helpUrl,
      });
    }

    it("accepts valid Conventional Commits (scoped, unscoped, breaking !, BREAKING CHANGE footer)", async () => {
      expect(existsSync(configPath)).toBe(true);

      const validMessages = [
        "feat: add passkey login flow",
        "fix(tasks): resolve optimistic mutation race condition",
        "perf(ssr): cache compiled routes in memory runtime",
        "refactor(api): migrate contract decoder to effect schema",
        "docs(adr): record release pipeline architecture",
        "style: apply biome formatting across feature slices",
        "test(harness): introduce mock event source sse harness",
        "build(docker): optimize multi-stage cache layers",
        "ci(workflows): add multi-arch ghcr container publishing",
        "chore(deps): update dependency @tanstack/react-query",
        'revert: "feat(tasks): live query streaming"',
        "feat(api)!: migrate endpoint response schema to envelope format",
        "refactor(config): remove deprecated backend host variable\n\nBREAKING CHANGE: VITE_BACKEND_HOST has been removed.",
      ];

      for (const msg of validMessages) {
        const result = await lintCommitMessage(msg);
        expect(
          result.valid,
          `Expected "${msg}" to be valid, got errors: ${JSON.stringify(result.errors)}`,
        ).toBe(true);
      }
    });

    it("rejects invalid commit messages (missing type, unknown type, uppercase subject, header > 100 chars)", async () => {
      expect(existsSync(configPath)).toBe(true);

      const missingType = await lintCommitMessage("update tasks list");
      expect(missingType.valid).toBe(false);
      expect(
        missingType.errors.some((e) => e.name === "type-empty" || e.name === "subject-empty"),
      ).toBe(true);

      const unknownType = await lintCommitMessage("wip(tasks): work in progress");
      expect(unknownType.valid).toBe(false);
      expect(unknownType.errors.some((e) => e.name === "type-enum")).toBe(true);

      const pascalCaseSubject = await lintCommitMessage("feat(tasks): AddTaskFiltering");
      expect(pascalCaseSubject.valid).toBe(false);
      expect(pascalCaseSubject.errors.some((e) => e.name === "subject-case")).toBe(true);

      const upperCaseSubject = await lintCommitMessage("feat(tasks): ADD TASK FILTERING");
      expect(upperCaseSubject.valid).toBe(false);
      expect(upperCaseSubject.errors.some((e) => e.name === "subject-case")).toBe(true);

      const sentenceCaseSubject = await lintCommitMessage("feat(tasks): Add task filtering");
      expect(sentenceCaseSubject.valid).toBe(false);
      expect(sentenceCaseSubject.errors.some((e) => e.name === "subject-case")).toBe(true);

      const overlongHeader = await lintCommitMessage(`feat(tasks): ${"a".repeat(95)}`);
      expect(overlongHeader.valid).toBe(false);
      expect(overlongHeader.errors.some((e) => e.name === "header-max-length")).toBe(true);
    });
  });

  describe("lefthook.yml", () => {
    const lefthookPath = resolve(rootDir, "lefthook.yml");

    it("exists and configures pre-commit, commit-msg, and pre-push hooks", () => {
      expect(existsSync(lefthookPath)).toBe(true);

      const content = readFileSync(lefthookPath, "utf8");
      expect(content).toContain("pre-commit:");
      expect(content).toContain("stage_fixed: true");
      expect(content).toMatch(/biome check --write/);
      expect(content).toContain("commit-msg:");
      expect(content).toMatch(/commitlint --edit/);
      expect(content).toContain("pre-push:");
      expect(content).toContain("scripts/check-branch-push.sh");
    });

    it("package.json chains lefthook install into prepare script", () => {
      const packageJsonPath = resolve(rootDir, "package.json");
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      expect(packageJson.scripts?.prepare).toContain("lefthook install");
    });
  });

  describe("scripts/check-branch-push.sh", () => {
    const scriptPath = resolve(rootDir, "scripts/check-branch-push.sh");

    it("exists, is executable, and blocks direct pushes to main/master without bypass", () => {
      expect(existsSync(scriptPath)).toBe(true);

      // biome-ignore lint/style/noProcessEnv: subprocess testing requires env options
      const baseEnv = process.env;

      // Blocked on main branch
      const resultMain = spawnSync("bash", [scriptPath], {
        env: { ...baseEnv, GIT_BRANCH: "main", ALLOW_DIRECT_MAIN_PUSH: "0" },
        encoding: "utf8",
      });
      expect(resultMain.status).toBe(1);
      expect(resultMain.stderr).toContain("Direct pushes to 'main' are prohibited");
      expect(resultMain.stderr).toContain("ALLOW_DIRECT_MAIN_PUSH=1");

      // Blocked on master branch
      const resultMaster = spawnSync("bash", [scriptPath], {
        env: { ...baseEnv, GIT_BRANCH: "master", ALLOW_DIRECT_MAIN_PUSH: "0" },
        encoding: "utf8",
      });
      expect(resultMaster.status).toBe(1);
      expect(resultMaster.stderr).toContain("Direct pushes to 'master' are prohibited");

      // Blocked when pre-push receives refs on stdin
      const resultStdin = spawnSync("bash", [scriptPath], {
        input: "refs/heads/feature 1111 refs/heads/main 2222\n",
        env: { ...baseEnv, GIT_BRANCH: "feat/cool", ALLOW_DIRECT_MAIN_PUSH: "0" },
        encoding: "utf8",
      });
      expect(resultStdin.status).toBe(1);
      expect(resultStdin.stderr).toContain("Direct pushes to 'refs/heads/main' are prohibited");

      // Allowed on feature branch
      const resultFeature = spawnSync("bash", [scriptPath], {
        env: { ...baseEnv, GIT_BRANCH: "feat/some-feature", ALLOW_DIRECT_MAIN_PUSH: "0" },
        encoding: "utf8",
      });
      expect(resultFeature.status).toBe(0);

      // Allowed on main when ALLOW_DIRECT_MAIN_PUSH=1
      const resultBypass = spawnSync("bash", [scriptPath], {
        env: { ...baseEnv, GIT_BRANCH: "main", ALLOW_DIRECT_MAIN_PUSH: "1" },
        encoding: "utf8",
      });
      expect(resultBypass.status).toBe(0);
    });
  });

  describe(".github/workflows/pr-title.yml", () => {
    const workflowPath = resolve(rootDir, ".github/workflows/pr-title.yml");

    it("exists and configures amannn/action-semantic-pull-request with 11 types", () => {
      expect(existsSync(workflowPath)).toBe(true);

      const content = readFileSync(workflowPath, "utf8");
      expect(content).toContain("pull_request_target:");
      expect(content).toContain("pull-requests: read");
      expect(content).toContain("Lint PR Title (Conventional Commits)");
      expect(content).toContain("amannn/action-semantic-pull-request@v6");

      const expectedTypes = [
        "feat",
        "fix",
        "perf",
        "refactor",
        "docs",
        "style",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ];
      for (const type of expectedTypes) {
        expect(content).toContain(type);
      }
      expect(content).toMatch(/subjectPattern:\s*\^\(\?!\[A-Z\]\)\.\+\$/);
    });
  });

  describe("Release-Please configuration & manifests", () => {
    const configPath = resolve(rootDir, "release-please-config.json");
    const manifestPath = resolve(rootDir, ".release-please-manifest.json");
    const pkgJsonPath = resolve(rootDir, "package.json");

    it("release-please-config.json exists, parses, and configures node release with changelog sections", () => {
      expect(existsSync(configPath)).toBe(true);

      const config = JSON.parse(readFileSync(configPath, "utf8"));
      expect(config.packages).toBeDefined();
      expect(config.packages["."]).toBeDefined();

      const rootPkg = config.packages["."];
      expect(rootPkg["release-type"]).toBe("node");
      expect(rootPkg["changelog-path"]).toBe("CHANGELOG.md");
      expect(rootPkg["bump-minor-pre-major"]).toBe(true);
      expect(rootPkg["bump-patch-for-minor-pre-major"]).toBe(true);
      expect(rootPkg["include-component-in-tag"]).toBe(false);

      const sections = rootPkg["changelog-sections"] as Array<{
        type: string;
        section: string;
        hidden?: boolean;
      }>;
      expect(Array.isArray(sections)).toBe(true);

      const sectionTypes = sections.map((s) => s.type);
      expect(sectionTypes).toContain("feat");
      expect(sectionTypes).toContain("fix");
      expect(sectionTypes).toContain("perf");
      expect(sectionTypes).toContain("refactor");
      expect(sectionTypes).toContain("docs");
      expect(sectionTypes).toContain("build");
      expect(sectionTypes).toContain("ci");
      expect(sectionTypes).toContain("chore");

      const choreSection = sections.find((s) => s.type === "chore");
      expect(choreSection?.hidden).toBe(true);
    });

    it(".release-please-manifest.json exists and its root version matches package.json#version", () => {
      expect(existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, "utf8"));

      expect(manifest["."]).toBeDefined();
      expect(manifest["."]).toBe(pkgJson.version);
    });
  });

  describe(".github/workflows/release.yml", () => {
    const releaseWorkflowPath = resolve(rootDir, ".github/workflows/release.yml");

    it("exists and configures Release-Please, multi-arch GHCR publishing, and SLSA attestations", () => {
      expect(existsSync(releaseWorkflowPath)).toBe(true);

      const content = readFileSync(releaseWorkflowPath, "utf8");

      // Push triggers on main and master
      expect(content).toContain("push:");
      expect(content).toContain("main");
      expect(content).toContain("master");

      // Cancel in progress is false
      expect(content).toContain("cancel-in-progress: false");

      // Security permissions
      expect(content).toContain("contents: write");
      expect(content).toContain("pull-requests: write");
      expect(content).toContain("packages: write");
      expect(content).toContain("id-token: write");
      expect(content).toContain("attestations: write");

      // Release job
      expect(content).toContain("release:");
      expect(content).toContain("googleapis/release-please-action@v4");
      expect(content).toContain("config-file: release-please-config.json");
      expect(content).toContain("manifest-file: .release-please-manifest.json");

      // Container job gated on release_created
      expect(content).toContain("publish-container:");
      expect(content).toMatch(/needs\.release\.outputs\.release_created\s*==\s*'?true'?/);

      // Multi-arch platforms
      expect(content).toContain("docker/setup-qemu-action@v3");
      expect(content).toContain("linux/amd64,linux/arm64");
      expect(content).toContain("docker/setup-buildx-action@v3");

      // Dynamic GHCR image derived from github.repository (lowercased)
      expect(content).toContain("ghcr.io");
      expect(content).toContain("${" + "{ github.repository }}");
      // Must not hardcode repository name in image slug definition
      expect(content).not.toMatch(/ghcr\.io\/[^$]+tanstack-open-api/);

      // Metadata tags
      expect(content).toContain("docker/metadata-action@v5");
      expect(content).toContain("type=semver,pattern={{version}}");
      expect(content).toContain("type=semver,pattern={{major}}.{{minor}}");
      expect(content).toContain("type=raw,value=latest");
      expect(content).toContain("type=sha,prefix=sha-");

      // Docker buildx push with Actions cache
      expect(content).toContain("docker/build-push-action@v6");
      expect(content).toContain("cache-from: type=gha");
      expect(content).toContain("cache-to: type=gha,mode=max");

      // SLSA build provenance attestation
      expect(content).toContain("actions/attest-build-provenance@v2");
      expect(content).toContain("push-to-registry: true");
    });
  });
});
