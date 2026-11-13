# Frontend DX Tooling Research: Biome 2 vs ESLint, Vitest Behavioral Harness, and CI/Docker Patterns

> **Wayfinder Research Ticket**: [#6](https://github.com/Guiguerreiro39/tanstack-open-api/issues/6) — Part of [#1](https://github.com/Guiguerreiro39/tanstack-open-api/issues/1)

## Executive Summary & Decision Gist

1. **Linter & Formatter (`@biomejs/biome` 2.x over ESLint)**:
   - **Adopt Biome 2.x (`@biomejs/biome` `^2.6.7`)** as the unified formatter, linter, import organizer, and Tailwind CSS v4 analyzer, upgrading from `forklore-fe`'s Biome `1.9.4`.
   - Enable `"css": { "parser": { "tailwindDirectives": true } }` so Tailwind v4 CSS-first directives (`@theme inline`, `@custom-variant dark (&:is(.dark *));`, `@utility`, `@plugin`, `@source`, `@apply` in `src/index.css`) parse and format natively without plugin glue.
   - Enforce architectural guardrails matching `hono-open-api`'s rigor via Biome 2.x rules: `style/noRestrictedImports` (with `patterns` and `overrides` enforcing unidirectional `src/routes -> src/features -> src/shared` layer boundaries), `style/noProcessEnv` (isolating `import.meta.env` / `process.env` reads to `src/env.ts`), `style/useFilenamingConvention` (`kebab-case` with an override for TanStack Router route conventions in `src/routes/**`), `assist.actions.source.organizeImports`, `nursery/useSortedClasses` (for `cn`, `cva`, `clsx`), `correctness/noUnusedVariables`, `correctness/noUnusedImports`, `nursery/noFloatingPromises` (Biome 2's built-in Rust type inference), and `a11y/*` rules.
   - Keep `@effect/language-service` in `tsconfig.json` so `pnpm typecheck` (`tsc --noEmit`) enforces Effect-specific diagnostics alongside Biome.
2. **Behavioral Testing Architecture (Vitest 4 + Real Router/Query/Effect + Network Boundary Interception)**:
   - Eliminate `forklore-fe`'s brittle `vi.mock()` module patching (`vi.mock("@/shared/lib/auth-client")`, `vi.mock("@tanstack/react-router")`, `vi.mock("@tanstack/react-query")`, and direct `Route.options.beforeLoad` casting).
   - Intercept solely at the **HTTP / SSE transport boundary** using **MSW v2 (`msw/node` `setupServer`)** (or an injectable WinterCG `Request -> Promise<Response>` fetch router) + a deterministic `MockEventSource` in `src/test/setup.ts`. Because both Orval's `customFetch` (`src/shared/api/client.ts`) and Better Auth's `createAuthClient` (`src/shared/lib/auth-client.ts`) execute standard `fetch` calls (`/api/auth/get-session`, `/api/auth/sign-in/email`, generated OpenAPI endpoints), a single network boundary harness drives auth guards, session hooks, queries, and mutations end-to-end.
   - Provide a shared `renderWithApp(ui, options)` test helper (the frontend counterpart to `hono-open-api`'s `createTestApp`) that wires a fresh `QueryClient` (`retry: false`, `gcTime: Infinity`), a real TanStack Router (`createMemoryHistory`, `defaultPendingMinMs: 0`), `@testing-library/user-event`, and a test Effect `Layer` (`NoopObservabilityLive`).
   - Use `@effect/vitest` (`it.effect`, `it.scoped`, `TestClock`) for deterministic contract tests of Effect schemas, `decodeApiError`, `matchEffect`, and scoped Effect services.
   - Configure `vitest.config.ts` with `projects` (`unit` on `happy-dom` for sub-second feedback, plus an optional `browser` project via `@vitest/browser` + Playwright for real-CSS/focus verification) and `@vitest/coverage-v8` (`text`, `lcov`, no artificial % threshold gates).
3. **CI/CD & Multi-Stage Docker / Compose Topology**:
   - Mirror `hono-open-api/.github/workflows/ci.yml` with Node 24 + `pnpm@10.19.0`: a `verify` job running `pnpm install --frozen-lockfile`, **Orval + TanStack Router codegen drift check** (`pnpm generate:api && git diff --exit-code src/shared/api/generated src/routeTree.gen.ts`), `pnpm typecheck` (`tsc --noEmit`), `pnpm lint` (`biome ci .`), `pnpm test` (`vitest run --project unit`), and `pnpm build` (`vite build`), plus a `docker` job validating `docker compose config --quiet` and `docker build`.
   - Package the app in a multi-stage `node:24-slim` `Dockerfile` (`base` → `deps` → `build` → `prod-deps` → `runtime` as non-root `USER node`) running a lightweight Node/Hono production server (`server.mjs`) that serves `dist/client` static assets, delegates SSR requests to `dist/server/server.js`, and optionally reverse-proxies `/api/*` to `hono-open-api` (`http://api:9999`) in `docker-compose.yml`.

---

## 1. Code Quality, Formatting & Linting: Biome 2.x vs ESLint (`@antfu/eslint-config`)

### 1.1 Baseline Audit (`forklore-fe` vs `hono-open-api`)

| Dimension                 | `forklore-fe` (Current Baseline)                                                                                           | `hono-open-api` (Backend Reference)                                                                             | Gap to Close in `tanstack-open-api`                                                                                                                      |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Toolchain**             | `@biomejs/biome` `1.9.4` (`package.json#L46`)                                                                              | `eslint` `^10.8.0` + `@antfu/eslint-config` `^9.2.0` + `eslint-plugin-format` `^2.0.1` (`package.json#L50-L56`) | `forklore-fe` is on Biome 1.9.x schema (`organizeImports`, `files.ignore`) and lacks Biome 2's Tailwind v4 parser, type-aware rules, and boundary rules. |
| **Layer Boundaries**      | None enforced by linter                                                                                                    | Architectural boundary guardrail (`src/modules/ -> src/core/ <- src/infra/`) documented in `AGENTS.md#L19`      | Enforce unidirectional layer imports via `style/noRestrictedImports` + directory `overrides`.                                                            |
| **Environment Isolation** | Scattered `import.meta.env` & `process.env` reads in `client.ts#L27-L28`, `auth-client.ts#L5`, `use-live-query.ts#L56-L57` | `node/no-process-env: ["error"]` in `eslint.config.mjs#L18`; isolated to `src/env.ts`                           | Enforce `style/noProcessEnv: "error"` globally with an override for `src/env.ts` and config files.                                                       |
| **File Naming**           | Unenforced                                                                                                                 | `unicorn/filename-case` (`kebabCase`) in `eslint.config.mjs#L20-L23`                                            | Enforce `style/useFilenamingConvention` (`kebab-case`) with an override for TanStack Router's `src/routes/**` conventions (`__root.tsx`, `_app`, `$id`). |
| **CSS & Tailwind v4**     | `src/index.css` uses `@theme inline` (`#L87`) and `@custom-variant dark` (`#L129`) without `tailwindDirectives: true`      | Backend-only (no CSS)                                                                                           | Enable `css.parser.tailwindDirectives: true` and `nursery/useSortedClasses` for `cn()` / `cva()` / `clsx()`.                                             |
| **Scripts**               | `"check-types": "tsc --noEmit"`, `"lint": "biome check"`                                                                   | `"typecheck": "tsc --noEmit"`, `"lint": "eslint ."`, `"lint:fix": "eslint . --fix"`                             | Standardize script names (`typecheck`, `lint`, `lint:fix`, `format`) across both repos.                                                                  |

### 1.2 Head-to-Head Comparison: Biome 2.x vs ESLint 10 (`@antfu/eslint-config`)

Primary sources evaluated:

- [Biome v2.0 Release Notes ("Biotype")](https://biomejs.dev/blog/biome-v2/)
- [Biome v2 Upgrade Guide](https://biomejs.dev/guides/upgrade-to-biome-v2/)
- [Biome Linter Rules Reference](https://biomejs.dev/linter/rules/)
- [Biome CSS Parser & Tailwind Directives](https://biomejs.dev/reference/configuration/#cssparsertailwinddirectives)
- [`@antfu/eslint-config` Repository & Docs](https://github.com/antfu/eslint-config)

| Capability                                                                     | Biome 2.x (`@biomejs/biome` `^2.6.7`)                                                                                                                                                                                                                                | ESLint 10 + `@antfu/eslint-config` `^9.2.0`                                                                                                                                                | Verdict for `tanstack-open-api`                                                                                                                                         |
| :----------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Runtime Speed**                                                              | **~20–50ms** across ~60–200 files (single native Rust binary).                                                                                                                                                                                                       | **~2.5–6.0s** cold run across ~60–200 files (Node.js + TypeScript ESTree + multiple plugins).                                                                                              | **Biome 2.x** (50–100x faster in local save hooks, pre-commit, and CI).                                                                                                 |
| **Dependency Footprint**                                                       | **1 devDependency** (`@biomejs/biome`), zero transitive JS plugin dependencies.                                                                                                                                                                                      | **45+ transitive packages** (`@eslint-react/*`, `eslint-plugin-format`, `eslint-plugin-perfectionist`, `eslint-plugin-unicorn`, etc.).                                                     | **Biome 2.x** (dramatically simpler lockfile and zero peer-dependency churn).                                                                                           |
| **Tailwind CSS v4 Syntax (`@theme`, `@custom-variant`, `@utility`, `@apply`)** | **Native in Rust CSS parser** via `"css": { "parser": { "tailwindDirectives": true } }`. Formats and lints `src/index.css` directly ([Biome CSS Config](https://biomejs.dev/reference/configuration/#cssparsertailwinddirectives)).                                  | `@antfu/eslint-config` delegates CSS formatting to Prettier (`eslint-plugin-format`) and requires adding `eslint-plugin-better-tailwindcss` configured with `entryPoint: "src/index.css"`. | **Biome 2.x** (zero extra plugins required for Tailwind v4 CSS-first syntax).                                                                                           |
| **Tailwind Utility Class Sorting**                                             | Built-in `nursery/useSortedClasses` supporting JSX `className` and helper functions (`cn`, `cva`, `clsx`) ([`useSortedClasses` Docs](https://biomejs.dev/linter/rules/use-sorted-classes/)).                                                                         | Requires `eslint-plugin-better-tailwindcss` or `prettier-plugin-tailwindcss`.                                                                                                              | **Tie / Slight Edge Biome** (built-in without external plugins; note that `useSortedClasses` is in `nursery` and applies via `--unsafe` or explicit fix configuration). |
| **Import Sorting**                                                             | Built-in `assist.actions.source.organizeImports` with configurable import groups (`:NODE:`, `:PACKAGE:`, `:ALIAS:`, `:PATH:`) ([Biome Assist Docs](https://biomejs.dev/assist/actions/organize-imports/)).                                                           | Built-in via `eslint-plugin-perfectionist` (`perfectionist/sort-imports`).                                                                                                                 | **Tie** (both deterministic and autofixable).                                                                                                                           |
| **Layer Boundary Enforcement**                                                 | Built-in `style/noRestrictedImports` (`paths` + glob `patterns` with negation `!` and custom `message`) scoped per directory via `overrides` ([`noRestrictedImports` Docs](https://biomejs.dev/linter/rules/no-restricted-imports/)).                                | Built-in `no-restricted-imports` or external `eslint-plugin-boundaries`.                                                                                                                   | **Tie** (Biome 2.x `patterns` + `overrides` cleanly expresses unidirectional `routes -> features -> shared` boundaries without extra plugins).                          |
| **Filename Case Enforcement**                                                  | Built-in `style/useFilenamingConvention` (`kebab-case`) ([`useFilenamingConvention` Docs](https://biomejs.dev/linter/rules/use-filenaming-convention/)).                                                                                                             | Built-in `unicorn/filename-case` (`kebabCase`).                                                                                                                                            | **Tie** (both require an override/ignore for TanStack Router's `src/routes/**` file naming conventions like `__root.tsx` and `_app`).                                   |
| **Environment Variable Isolation**                                             | Built-in `style/noProcessEnv` ([`noProcessEnv` Docs](https://biomejs.dev/linter/rules/no-process-env/)) + `noRestrictedSyntax` / architecture conventions for `import.meta.env`.                                                                                     | Built-in `node/no-process-env` (`eslint-plugin-n`).                                                                                                                                        | **Tie** (both disallow raw `process.env` reads outside `src/env.ts`).                                                                                                   |
| **React 19 & Hooks Rules**                                                     | Built-in `correctness/useExhaustiveDependencies`, `correctness/useHookAtTopLevel`, `correctness/noChildrenProp`, `security/noDangerouslySetInnerHtml`.                                                                                                               | Uses `@eslint-react/eslint-plugin` + `eslint-plugin-react-hooks` when `react: true` is enabled.                                                                                            | **Biome 2.x** covers all core React 19 + Hooks rules natively; `@antfu/eslint-config` has slightly more granular React compiler niche rules.                            |
| **Accessibility (`a11y`)**                                                     | **30+ built-in `a11y` rules** enabled by default in `recommended` (`useAltText`, `useButtonType`, `useKeyWithClickEvents`, `useSemanticElements`, `useValidAriaProps`, `noSvgWithoutTitle`, etc.) ([Biome a11y Rules](https://biomejs.dev/linter/rules/#a11y)).      | `@antfu/eslint-config` does **not** bundle `eslint-plugin-jsx-a11y` by default; must be installed and wired manually.                                                                      | **Biome 2.x** (first-class `a11y` enforcement out of the box, essential for custom UI + `shadcn/ui` compositions).                                                      |
| **Type-Aware Linting & Effect**                                                | Biome 2.0 introduces a Rust type-inference engine (`nursery/noFloatingPromises`, multi-file analysis) without invoking `tsc` ([Biome v2 Blog](https://biomejs.dev/blog/biome-v2/)). Effect diagnostics are handled by `@effect/language-service` in `tsconfig.json`. | Supports `typescript-eslint` type-aware rules (`tsconfigPath`), which slows ESLint down to `tsc` speeds.                                                                                   | **Biome 2.x + `@effect/language-service`** (fast linting in Biome + full Effect type diagnostics in `pnpm typecheck`).                                                  |

### 1.3 Recommended `biome.json` (Biome 2.x) for `tanstack-open-api`

Upgrading from `forklore-fe/biome.json` (`1.9.4`) to Biome `2.6.x` involves:

1. Migrating `files.ignore` to `files.includes` with force-ignore (`!!`) for build/generated outputs (`!!dist`, `!!src/routeTree.gen.ts`, `!!src/shared/api/generated`) so Biome's multi-file scanner skips indexing generated files ([Biome v2 `files.includes`](https://biomejs.dev/guides/upgrade-to-biome-v2/)).
2. Migrating top-level `organizeImports` to `assist.actions.source.organizeImports`.
3. Enabling `"css": { "parser": { "tailwindDirectives": true } }`.
4. Adding `noProcessEnv`, `useFilenamingConvention`, `useSortedClasses`, `noUnusedVariables`, `noUnusedImports`, and `overrides` for unidirectional layer boundaries (`src/shared/**` cannot import `src/features/**` or `src/routes/**`; `src/features/**` cannot import `src/routes/**`).

```json
{
  "$schema": "https://biomejs.dev/schemas/2.6.7/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": false,
    "includes": [
      "**",
      "!!dist",
      "!!coverage",
      "!!src/routeTree.gen.ts",
      "!!src/shared/api/generated",
      "!!openapi.json",
      "!!tsconfig.tsbuildinfo"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    },
    "formatter": {
      "enabled": true,
      "indentStyle": "space",
      "indentWidth": 2
    },
    "linter": {
      "enabled": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all"
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "error",
        "noUnusedVariables": "error",
        "useExhaustiveDependencies": "warn",
        "useHookAtTopLevel": "error"
      },
      "style": {
        "noProcessEnv": "error",
        "useFilenamingConvention": {
          "level": "error",
          "options": {
            "strictCase": false,
            "filenameCases": ["kebab-case"]
          }
        }
      },
      "nursery": {
        "useSortedClasses": {
          "level": "warn",
          "fix": "safe",
          "options": {
            "attributes": ["classList"],
            "functions": ["clsx", "cva", "cn"]
          }
        }
      }
    }
  },
  "overrides": [
    {
      "includes": [
        "src/env.ts",
        "vite.config.ts",
        "vitest.config.ts",
        "orval.config.ts",
        "server.mjs"
      ],
      "linter": {
        "rules": {
          "style": {
            "noProcessEnv": "off"
          }
        }
      }
    },
    {
      "includes": ["src/routes/**"],
      "linter": {
        "rules": {
          "style": {
            "useFilenamingConvention": "off"
          }
        }
      }
    },
    {
      "includes": ["src/shared/**", "src/core/**"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "level": "error",
              "options": {
                "patterns": [
                  {
                    "group": ["@/features/**", "@/modules/**", "@/routes/**", "@/components/**"],
                    "message": "Shared/Core layer must not depend on Feature Modules, Routes, or App Components."
                  }
                ]
              }
            }
          }
        }
      }
    },
    {
      "includes": ["src/features/**", "src/modules/**"],
      "linter": {
        "rules": {
          "style": {
            "noRestrictedImports": {
              "level": "error",
              "options": {
                "patterns": [
                  {
                    "group": ["@/routes/**"],
                    "message": "Feature Modules must not import from Routes."
                  }
                ]
              }
            }
          }
        }
      }
    }
  ]
}
```

---

## 2. Behavioral Testing Architecture (Vitest 4, No Brittle `vi.mock()`)

### 2.1 Audit of `forklore-fe`'s Current Testing Anti-Patterns

Inspecting `forklore-fe`'s existing test suite reveals four structural issues that violate `hono-open-api`'s **Behavior-only testing** principle ([`hono-open-api/AGENTS.md#L35`](file:///Users/guilhermeguerreiro/Documents/Git/hono-open-api/AGENTS.md#L35), [`ADR-0011`](file:///Users/guilhermeguerreiro/Documents/Git/hono-open-api/docs/adr/0011-testing-strategy-and-contract-suites.md)):

1. **Direct `beforeLoad` invocation + `vi.mock("@/shared/lib/auth-client")` in [`src/test/route-guards.test.ts`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/test/route-guards.test.ts#L7-L41)**:
   - Mocks `@/shared/lib/auth-client` via `vi.mock()` and casts `AppIndexRoute.options.beforeLoad as unknown as RouteBeforeLoad`, invoking the function with a hand-crafted `{ location: { href: "/" } }` object and catching the thrown redirect manually.
   - **Why this is brittle**: It never mounts TanStack Router, never runs `validateSearch`, never tests parent-to-child route guard inheritance (`/_app`), and breaks if route guard logic moves from a leaf route to a pathless layout route (`/_app.tsx`) or router context.
2. **Mocking `@tanstack/react-router` and child components in [`src/components/__tests__/header.test.tsx`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/components/__tests__/header.test.tsx#L7-L24)**:
   - Replaces `<Link>` with a fake `<a>`, mocks `useSession`, and replaces `<UserMenu />` with `<div data-testid="user-menu">`.
   - **Why this is brittle**: It cannot catch broken route `to` params, Radix `DropdownMenu` accessibility/interaction bugs inside `UserMenu`, or sign-out state transitions.
3. **Mocking `@tanstack/react-query` itself in [`src/shared/lib/hooks/__tests__/use-effect-query.test.tsx`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/shared/lib/hooks/__tests__/use-effect-query.test.tsx#L9-L11) and [`use-effect-mutation.test.tsx`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/shared/lib/hooks/__tests__/use-effect-mutation.test.tsx#L9-L11)**:
   - Calls `vi.mock("@tanstack/react-query", () => ({ useQuery: vi.fn() }))` and fabricates partial `UseQueryResult` state objects (`{ isPending: false, error: null, data: 12_345 }`).
   - **Why this is brittle**: It completely bypasses TanStack Query's state machine, `queryFn` execution, `FetchError` propagation from `customFetch`, and query cache invalidation.
4. **Global uncleaned `globalThis.fetch` mutation + `fireEvent` in [`src/features/recipes/__tests__/recipes.test.tsx`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/features/recipes/__tests__/recipes.test.tsx#L17)**:
   - Overwrites `globalThis.fetch = vi.fn().mockResolvedValue(new Response(""))` at module top level and uses low-level `fireEvent.click` / `fireEvent.change` instead of `@testing-library/user-event` (which is required to accurately trigger Radix UI / `shadcn/ui` pointer, keyboard, and focus events).
   - Furthermore, `@effect/vitest` (`^0.27.0`) is listed in `forklore-fe/package.json#L48` but is never imported in any test.

### 2.2 Test Environment Trade-Offs: `happy-dom` vs `jsdom` vs Vitest 4 Browser Mode

Primary sources evaluated:

- [Vitest Browser Mode Guide](https://vitest.dev/guide/browser/)
- [Vitest Coverage (`@vitest/coverage-v8`)](https://vitest.dev/guide/coverage.html)
- [Testing Library User Interactions (`@testing-library/user-event`)](https://testing-library.com/docs/user-event/intro)

| Environment                                                | Execution Speed                                                                             | DOM & Layout Fidelity                                                                                                                                                                                                                   | Best Fit in `tanstack-open-api`                                                                                                                    |
| :--------------------------------------------------------- | :------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`happy-dom` (`^20.5.0`)**                                | **Fastest** (~150–400ms full suite startup, 2–4x faster than `jsdom`).                      | Emulated DOM in Node.js. Supports standard `fetch`, `AbortController`, `CustomEvent`, and React 19 rendering; requires tiny shims in `setup.ts` for Radix UI pointer capture (`hasPointerCapture`, `ResizeObserver`) and `EventSource`. | **Primary `unit` project** (`pnpm test`) for all Effect contract tests, hook tests, route guard tests, and `shadcn/ui` behavioral component tests. |
| **`jsdom` (`^26.0.0`)**                                    | **Slower** (heavier spec bookkeeping per test file).                                        | Emulated DOM in Node.js; still lacks real layout (`getBoundingClientRect`), CSS cascade, and `ResizeObserver`.                                                                                                                          | **Unnecessary** when `happy-dom` is used for Node-based tests; remove duplicate `jsdom` devDependency from `forklore-fe/package.json#L57`.         |
| **Vitest 4 Browser Mode (`@vitest/browser` + Playwright)** | **Moderate** (~2–4s headless Chromium startup; requires Playwright browser binaries in CI). | **100% Real Browser** (real CSS `@theme` / `@custom-variant dark` computed styles, real focus traps, real pointer occlusion, native `EventSource`).                                                                                     | **Optional `browser` project** (or handled by the repo's `.agents/skills/verify-*/SKILL.md` Playwright/browser runtime verification skill).        |

### 2.3 Why Network Boundary Interception Eliminates `vi.mock()` Completely

In `forklore-fe` (and `tanstack-open-api`), **every external I/O operation passes through the standard WinterCG `fetch` API** (plus `EventSource` for SSE):

1. **Orval API Client ([`src/shared/api/client.ts`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/shared/api/client.ts#L34))**: Calls `fetch(fullUrl, { ...options, credentials: "include" })` and throws `FetchError(status, message, data)` on non-2xx responses.
2. **Better Auth Client ([`src/shared/lib/auth-client.ts`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/shared/lib/auth-client.ts#L3-L10))**: `createAuthClient` from `better-auth/react` calls `fetch("${baseURL}/api/auth/get-session")`, `fetch("${baseURL}/api/auth/sign-in/email")`, `fetch("${baseURL}/api/auth/sign-out")`, etc. (and accepts `fetchOptions.customFetchImpl` if a custom fetch function is desired).

Therefore, by intercepting at the **HTTP network boundary** using **MSW v2 (`msw/node` `setupServer`)** (or an in-memory WinterCG `Request -> Response` handler), tests never need `vi.mock("@/shared/lib/auth-client")`, `vi.mock("@tanstack/react-query")`, or `vi.mock("@tanstack/react-router")`:

| Aspect                        | MSW v2 (`msw/node` `setupServer`)                                                                                                                                          | In-Memory Fetch Adapter (`createTestFetch`)                                                                                 | Recommendation                                                                                                                                     |
| :---------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mechanism**                 | Intercepts Node's native `fetch` (`undici` / `http`) via `@mswjs/interceptors` ([MSW Node Integration](https://mswjs.io/docs/integrations/node)).                          | Injects a WinterCG `(req: Request) => Promise<Response>` router into `globalThis.fetch` and `authClient` `customFetchImpl`. | **Use MSW v2 (`msw/node`) as the canonical network harness** (with helper factories for Better Auth sessions and `hono-open-api` error envelopes). |
| **Better Auth Compatibility** | Automatically intercepts `authClient.getSession()` (`GET /api/auth/get-session`), `useSession()`, `signIn.email()`, and `signOut()` with zero changes to `auth-client.ts`. | Requires passing `customFetchImpl` or overriding `globalThis.fetch` in `beforeEach`.                                        | MSW's `server.use(...)` and `server.resetHandlers()` in `afterEach` provide standard, leak-free per-test overrides.                                |
| **Unmocked Request Safety**   | `server.listen({ onUnhandledRequest: "error" })` fails loudly if any component fires an unexpected network call.                                                           | Requires custom unhandled-route assertion logic.                                                                            | Matches `hono-open-api`'s fail-loud testing philosophy.                                                                                            |

### 2.4 Reference Test Harness Architecture (`src/test/`)

#### 1. `src/test/msw-server.ts` — Typed Auth & API Network Helpers

```ts
// src/test/msw-server.ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export interface TestAuthUser {
  id: string;
  name: string;
  email: string;
  role?: "user" | "admin";
  image?: string | null;
}

const API_BASE = "http://localhost:9999";

/**
 * Default MSW handlers: unauthenticated session by default.
 * Individual tests override via `mockAuthSession(user)` or `server.use(...)`.
 */
export const defaultHandlers = [
  http.get(`${API_BASE}/api/auth/get-session`, () => {
    return HttpResponse.json(null);
  }),
  http.post(`${API_BASE}/api/auth/sign-out`, () => {
    return HttpResponse.json({ success: true });
  }),
];

export const server = setupServer(...defaultHandlers);

/**
 * Seeds Better Auth session state at the HTTP boundary without `vi.mock()`.
 * Works identically for `authClient.getSession()` in route `beforeLoad` guards
 * and `useSession()` in React components.
 */
export function mockAuthSession(user: TestAuthUser | null) {
  server.use(
    http.get(`${API_BASE}/api/auth/get-session`, () => {
      if (!user) {
        return HttpResponse.json(null);
      }
      const now = new Date().toISOString();
      return HttpResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: true,
          role: user.role ?? "user",
          image: user.image ?? null,
          createdAt: now,
          updatedAt: now,
        },
        session: {
          id: `session-${user.id}`,
          userId: user.id,
          token: `token-${user.id}`,
          expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
          createdAt: now,
          updatedAt: now,
        },
      });
    }),
  );
}

/**
 * Helper to return canonical `hono-open-api` error payloads
 * (`{ error: { code, message, requestId, details? } }`).
 */
export function honoErrorResponse(
  status: 401 | 403 | 404 | 409 | 422 | 429 | 500,
  code: string,
  message: string,
  details?: unknown,
) {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        requestId: "req-test-123",
        ...(details !== undefined ? { details } : {}),
      },
    },
    {
      status,
      headers: { "X-Request-Id": "req-test-123" },
    },
  );
}
```

#### 2. `src/test/mock-event-source.ts` & `src/test/setup.ts` — Deterministic SSE & Radix UI Shims

Because `useLiveQuery` ([`src/shared/lib/hooks/use-live-query.ts#L66`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/shared/lib/hooks/use-live-query.ts#L66)) uses browser `new EventSource(fullUrl, { withCredentials: true })`, providing a lightweight controllable `MockEventSource` in `src/test/setup.ts` lets tests deterministically emit `"update"` SSE events and assert real-time TanStack Query cache updates without real sockets or sleeps:

```ts
// src/test/mock-event-source.ts
type EventSourceListener = (event: MessageEvent) => void;

export class MockEventSource {
  static instances = new Map<string, MockEventSource>();

  readonly url: string;
  readonly withCredentials: boolean;
  readyState = 1; // OPEN
  onerror: ((err: Event) => void) | null = null;
  private listeners = new Map<string, Set<EventSourceListener>>();

  constructor(url: string, init?: EventSourceInit) {
    this.url = url;
    this.withCredentials = Boolean(init?.withCredentials);
    MockEventSource.instances.set(url, this);
  }

  addEventListener(type: string, listener: EventSourceListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: EventSourceListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, data: unknown) {
    const payload = typeof data === "string" ? data : JSON.stringify(data);
    const event = new MessageEvent(type, { data: payload });
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  close() {
    this.readyState = 2; // CLOSED
    MockEventSource.instances.delete(this.url);
  }

  static reset() {
    for (const instance of MockEventSource.instances.values()) {
      instance.close();
    }
    MockEventSource.instances.clear();
  }
}
```

```ts
// src/test/setup.ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { MockEventSource } from "./mock-event-source";
import { server } from "./msw-server";

// Start MSW interception server before all tests; fail loudly on unhandled requests
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Object.defineProperty(globalThis, "EventSource", {
    writable: true,
    configurable: true,
    value: MockEventSource,
  });

  // Radix UI / shadcn pointer capture shims for happy-dom
  if (typeof Element !== "undefined") {
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
  }
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  MockEventSource.reset();
});

afterAll(() => {
  server.close();
});
```

#### 3. `src/test/render-with-app.tsx` — Unified Router + QueryClient + Effect Test Harness

This helper is the frontend equivalent of `hono-open-api/tests/helpers/test-app.ts` (`createTestApp`), supporting both full-app route tree navigation tests and isolated component/hook rendering inside a real `RouterProvider` + `QueryClientProvider`:

```tsx
// src/test/render-with-app.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { type RenderOptions, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { routeTree } from "@/routeTree.gen";
import { type TestAuthUser, mockAuthSession } from "./msw-server";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Number.POSITIVE_INFINITY,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export interface RenderAppOptions extends Omit<RenderOptions, "wrapper"> {
  /** Initial URL entries for TanStack Router memory history (default: `["/"]`) */
  initialEntries?: string[];
  /** Optional authenticated user to seed in MSW before rendering */
  user?: TestAuthUser | null;
  /** Optional custom QueryClient instance */
  queryClient?: QueryClient;
}

/**
 * Renders the full file-based application `routeTree` at `initialEntries`
 * with a real TanStack Router (`createMemoryHistory`) and `QueryClient`.
 * Ideal for behavioral route-guard, navigation, and page-level tests.
 */
export async function renderAppRoutes(options: RenderAppOptions = {}) {
  const {
    initialEntries = ["/"],
    user = null,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  mockAuthSession(user);

  const history = createMemoryHistory({ initialEntries });
  const router = createRouter({
    routeTree,
    history,
    context: { queryClient },
    defaultPendingMinMs: 0,
    defaultPreloadStaleTime: 0,
  });

  await router.load();

  const userActor = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
    renderOptions,
  );

  return {
    ...view,
    user: userActor,
    router,
    queryClient,
  };
}

/**
 * Renders an isolated component or UI subtree inside a real `QueryClientProvider`
 * and a minimal TanStack `RouterProvider` so `<Link>`, `useNavigate()`, and
 * `useEffectQuery()` work behaviorally without `vi.mock()`.
 */
export async function renderWithProviders(ui: React.ReactElement, options: RenderAppOptions = {}) {
  const {
    initialEntries = ["/"],
    user = null,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  mockAuthSession(user);

  const rootRoute = createRootRoute({
    component: () => ui,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "$",
    component: () => ui,
  });
  const testRouteTree = rootRoute.addChildren([indexRoute]);

  const history = createMemoryHistory({ initialEntries });
  const router = createRouter({
    routeTree: testRouteTree,
    history,
    defaultPendingMinMs: 0,
  });

  await router.load();

  const userActor = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
    renderOptions,
  );

  return {
    ...view,
    user: userActor,
    router,
    queryClient,
  };
}
```

### 2.5 Concrete Refactorings of `forklore-fe` Tests (Zero `vi.mock()`)

#### 1. Behavioral Route Guards (`src/test/route-guards.test.tsx`)

Instead of mocking `@/shared/lib/auth-client` and casting `Route.options.beforeLoad`:

```tsx
// src/test/route-guards.test.tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAppRoutes } from "./render-with-app";

describe("Route Guards (Behavioral Router Navigation)", () => {
  it("redirects unauthenticated visitors from / to /login?redirect=%2F", async () => {
    const { router } = await renderAppRoutes({
      initialEntries: ["/"],
      user: null,
    });

    expect(router.state.location.pathname).toBe("/login");
    expect(router.state.location.search).toEqual({ redirect: "/" });
  });

  it("redirects authenticated visitors away from /login to search.redirect target", async () => {
    const { router } = await renderAppRoutes({
      initialEntries: ["/login?redirect=%2F"],
      user: { id: "u1", name: "Chef Remy", email: "remy@forklore.app" },
    });

    expect(router.state.location.pathname).toBe("/");
    expect(
      await screen.findByRole("heading", { name: /20-Minute Garlic Confit/i }),
    ).toBeInTheDocument();
  });
});
```

#### 2. Behavioral Effect Hooks & Contract Tests with `@effect/vitest` (`use-effect-query.test.tsx`)

Instead of calling `vi.mock("@tanstack/react-query")`, run `useEffectQuery` against a real `QueryClientProvider` + MSW endpoint and use `@effect/vitest` (`it.effect`) for Effect contract assertions:

```tsx
// src/shared/lib/hooks/__tests__/use-effect-query.test.tsx
import { it } from "@effect/vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { Effect, Exit, Schema } from "effect";
import { http, HttpResponse } from "msw";
import type React from "react";
import { describe, expect } from "vitest";
import { customFetch } from "@/shared/api/client";
import {
  type FunctionDescriptor,
  type UnauthorizedError,
  decodeApiError,
} from "@/shared/api/contracts";
import { honoErrorResponse, server } from "@/test/msw-server";
import { createTestQueryClient } from "@/test/render-with-app";
import { useEffectQuery } from "../use-effect-query";

const TaskSchema = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
});

const descriptor: FunctionDescriptor<typeof TaskSchema.Type, UnauthorizedError> = {
  path: "/tasks/1",
  dataSchema: TaskSchema,
  decodeError: decodeApiError,
};

function createWrapper() {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useEffectQuery (Real QueryClient + MSW + Effect Schema)", () => {
  it("fetches, validates via Effect Schema, and resolves toEffect() on valid payload", async () => {
    server.use(
      http.get("http://localhost:9999/tasks/1", () =>
        HttpResponse.json({ id: "t-1", title: "Write behavioral tests" }),
      ),
    );

    const { result } = renderHook(
      () =>
        useEffectQuery(
          {
            queryKey: ["tasks", "1"],
            queryFn: () => customFetch("/tasks/1"),
          },
          descriptor,
        ),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const value = await Effect.runPromise(result.current.toEffect());
    expect(value).toEqual({ id: "t-1", title: "Write behavioral tests" });
  });

  it("fails toEffect() with SchemaDecodeError when server payload violates Effect Schema", async () => {
    server.use(
      http.get("http://localhost:9999/tasks/1", () =>
        HttpResponse.json({ id: 999, wrongField: true }),
      ),
    );

    const { result } = renderHook(
      () =>
        useEffectQuery(
          {
            queryKey: ["tasks", "1"],
            queryFn: () => customFetch("/tasks/1"),
          },
          descriptor,
        ),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const err = await Effect.runPromise(Effect.flip(result.current.toEffect()));
    expect(err._tag).toBe("SchemaDecodeError");
  });

  it("fails toEffect() with UnauthorizedError on HTTP 401 from hono-open-api", async () => {
    server.use(
      http.get("http://localhost:9999/tasks/1", () =>
        honoErrorResponse(401, "UNAUTHORIZED", "Authentication required"),
      ),
    );

    const { result } = renderHook(
      () =>
        useEffectQuery(
          {
            queryKey: ["tasks", "1"],
            queryFn: () => customFetch("/tasks/1"),
          },
          descriptor,
        ),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    const err = await Effect.runPromise(Effect.flip(result.current.toEffect()));
    expect(err._tag).toBe("UnauthorizedError");
  });

  it.effect("decodes canonical hono-open-api error envelopes inside @effect/vitest", () =>
    Effect.gen(function* () {
      const decoded = decodeApiError({
        status: 422,
        data: {
          message: "Validation failed",
          error: { issues: [{ path: ["title"], message: "Required" }] },
        },
      });
      const exit = yield* Effect.exit(Effect.fail(decoded));
      expect(Exit.isFailure(exit)).toBe(true);
      expect(decoded._tag).toBe("ValidationError");
    }),
  );
});
```

### 2.6 Recommended `vitest.config.ts` (Aligned with `hono-open-api`)

```ts
// vitest.config.ts
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), viteReact()],
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    fileParallelism: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.{test,spec}.{ts,tsx}",
        "src/test/**",
        "src/routeTree.gen.ts",
        "src/shared/api/generated/**",
      ],
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "happy-dom",
          setupFiles: ["src/test/setup.ts"],
          include: ["src/**/*.{test,spec}.{ts,tsx}"],
        },
      },
    ],
  },
});
```

---

## 3. CI/CD Pipelines, Codegen Drift Checks & Containerization

### 3.1 GitHub Actions Workflow (`.github/workflows/ci.yml`)

To match `hono-open-api/.github/workflows/ci.yml` (`node-version: "24"`, `pnpm/action-setup@v4`, concurrency group cancellation, read-only `contents` permissions, and explicit codegen drift checks), `tanstack-open-api`'s `.github/workflows/ci.yml` should run two parallel/staged jobs (`verify` and `docker`):

1. **Orval OpenAPI & TanStack Router Codegen Drift Verification**:
   - In `hono-open-api`, CI runs `pnpm db:generate && git diff --exit-code src/infra/db/migrations` (`ci.yml#L48-L52`) to guarantee committed SQL migrations never drift from Drizzle schemas.
   - In `tanstack-open-api`, the equivalent contract artifacts are `src/shared/api/generated/**` (generated by Orval from `openapi.json`) and `src/routeTree.gen.ts` (generated by `@tanstack/router-plugin` / `@tanstack/react-start`).
   - Running `pnpm generate:api` followed by `git diff --exit-code src/shared/api/generated` and `test -z "$(git status --porcelain src/shared/api/generated)"` guarantees that any PR updating `openapi.json` or `orval.config.ts` also commits the regenerated client hooks and models.
2. **`biome ci .` for Deterministic Linting & Formatting**:
   - Unlike `biome check`, `biome ci .` is purpose-built for CI environments: it verifies formatting, import sorting (`assist`), and lint rules in a single read-only pass, respects `.gitignore`, and exits non-zero on any violation ([Biome CLI `ci` Reference](https://biomejs.dev/reference/cli/#biome-ci)).

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches:
      - master
      - main
  pull_request:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/master' && github.ref != 'refs/heads/main' }}

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Verify Orval OpenAPI codegen is up to date
        run: |
          pnpm generate:api
          git diff --exit-code src/shared/api/generated
          test -z "$(git status --porcelain src/shared/api/generated)"

      - name: Typecheck
        run: pnpm typecheck

      - name: Lint & Format
        run: pnpm biome ci .

      - name: Unit & Component Tests
        run: pnpm test

      - name: Build Production Bundle
        run: pnpm build

      - name: Verify TanStack Router routeTree.gen.ts is up to date
        run: |
          git diff --exit-code src/routeTree.gen.ts
          test -z "$(git status --porcelain src/routeTree.gen.ts)"

  docker:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Validate Compose configuration
        run: docker compose config --quiet

      - name: Build Docker image
        run: docker build -t tanstack-open-api-starter:ci .

      - name: Container runtime smoke test
        run: |
          docker run -d --name web-smoke -p 3001:3001 tanstack-open-api-starter:ci
          for i in $(seq 1 15); do
            if curl -fsS http://127.0.0.1:3001/health >/dev/null 2>&1; then
              docker rm -f web-smoke
              exit 0
            fi
            sleep 1
          done
          docker logs web-smoke
          docker rm -f web-smoke
          exit 1
```

### 3.2 Production Server Entry & Multi-Stage `Dockerfile` (`node:24-slim`)

#### How `@tanstack/react-start/plugin/vite` Builds for Production

In `forklore-fe` (`@tanstack/react-start` `^1.141.1` with `@tanstack/react-start/plugin/vite`), `pnpm build` (`vite build`) emits two directories into `dist/`:

- `dist/client/`: Static browser assets (`dist/client/assets/*`, `logo.svg`, `robots.txt`).
- `dist/server/server.js`: An ESM WinterCG server module exporting `default: { fetch(request: Request): Promise<Response> }` ([`forklore-fe/dist/server/server.js`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/dist/server/server.js), [TanStack Start Hosting Docs](https://tanstack.com/start/latest/docs/framework/react/hosting)).

While `vite preview` works for quick local previews, Vite's docs explicitly note that `vite preview` is intended for local previewing rather than a production server. A ~50-line zero-extra-framework Node `node:http` + `node:fs` production entry (`server.mjs`) (or `srvx`) serves:

1. `/health` → `200 OK` (`{ status: "ok" }`) for Docker / Kubernetes health probes.
2. Static assets from `./dist/client` with immutable caching on `/assets/*`.
3. Optional reverse proxy for `/api/*`, `/tasks/*`, `/users/*`, `/files/*`, `/auth/*` to `API_INTERNAL_URL` (e.g., `http://api:9999` inside Docker Compose) so browser cookies (`credentials: "include"`) work seamlessly on the same origin without CORS friction.
4. All other requests delegated to `dist/server/server.js`'s WinterCG `server.fetch(request)` handler with graceful `SIGTERM` / `SIGINT` drain matching `hono-open-api` ADR-0010.

#### Multi-Stage `Dockerfile`

```dockerfile
FROM node:24-slim AS base
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.19.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --frozen-lockfile

FROM deps AS build
ARG VITE_API_URL=""
ARG VITE_SENTRY_DSN=""
ARG VITE_DD_APPLICATION_ID=""
ARG VITE_DD_CLIENT_TOKEN=""
ARG VITE_DD_SITE="datadoghq.com"
ARG VITE_APP_VERSION="1.0.0"
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SENTRY_DSN=$VITE_SENTRY_DSN \
    VITE_DD_APPLICATION_ID=$VITE_DD_APPLICATION_ID \
    VITE_DD_CLIENT_TOKEN=$VITE_DD_CLIENT_TOKEN \
    VITE_DD_SITE=$VITE_DD_SITE \
    VITE_APP_VERSION=$VITE_APP_VERSION

COPY tsconfig.json vite.config.ts ./
COPY public ./public
COPY src ./src
RUN pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN CI=true pnpm install --prod --frozen-lockfile

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server.mjs package.json ./

USER node
EXPOSE 3001

CMD ["node", "server.mjs"]
```

#### `.dockerignore`

```text
.git
.github
node_modules
dist
coverage
.env*
*.log
docs
src/**/*.test.ts
src/**/*.test.tsx
src/test
```

### 3.3 Full-Stack `docker-compose.yml` Pairing with `hono-open-api`

When running `tanstack-open-api` (`web`, port `3001`) alongside `hono-open-api` (`api`, port `9999`), two networking paths happen simultaneously:

1. **Browser-to-API (or Browser-to-Web Proxy)**: The user's browser on the host machine accesses `http://localhost:3001`. If `VITE_API_URL` is left empty (`""`) and `server.mjs` proxies `/api/*`, `/tasks/*`, `/users/*`, `/files/*` to `API_INTERNAL_URL=http://api:9999`, all browser `fetch` and `EventSource` calls stay same-origin (`http://localhost:3001`), eliminating cross-origin cookie (`SameSite`) and CORS preflight issues. Alternatively, if `VITE_API_URL=http://localhost:9999` is used directly from the browser, `hono-open-api` must be configured with `CORS_ORIGINS=http://localhost:3001` and `BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3001`.
2. **SSR Server-to-API (Container-to-Container)**: During SSR (`beforeLoad` / loader execution inside the `web` container), `localhost:9999` would point to the `web` container itself rather than `api`. Setting `API_INTERNAL_URL=http://api:9999` in the `web` container environment (and reading `process.env.API_INTERNAL_URL` when `typeof window === "undefined"` in `src/env.ts`) routes SSR requests directly over the Docker bridge network to `http://api:9999`.

```yaml
# docker-compose.yml (Frontend + hono-open-api integration)
services:
  web:
    image: tanstack-open-api-starter:local
    build:
      context: .
      args:
        VITE_API_URL: ${VITE_API_URL:-}
        VITE_APP_VERSION: ${VITE_APP_VERSION:-1.0.0}
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: "3001"
      HOST: "0.0.0.0"
      # Internal Docker network URL for SSR requests and /api reverse-proxying
      API_INTERNAL_URL: ${API_INTERNAL_URL:-http://host.docker.internal:9999}
    extra_hosts:
      - "host.docker.internal:host-gateway"
    stop_grace_period: 15s
    healthcheck:
      test:
        [
          CMD,
          node,
          -e,
          "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))",
        ]
      interval: 5s
      timeout: 3s
      retries: 10
      start_period: 5s
```

---

## 4. Recommended `package.json` Scripts & DevDependencies

To standardize the developer workflow across `hono-open-api` and `tanstack-open-api`:

```json
{
  "packageManager": "pnpm@10.19.0",
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "start": "node server.mjs",
    "serve": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "biome check .",
    "lint:fix": "biome check --write .",
    "test": "vitest run --project unit",
    "test:watch": "vitest --project unit",
    "test:coverage": "vitest run --project unit --coverage",
    "generate:api": "orval",
    "prepare": "effect-language-service patch"
  }
}
```

Key `devDependencies` additions/updates over `forklore-fe`:

- Upgrade `@biomejs/biome` from `1.9.4` → `^2.6.7`.
- Add `msw` (`^2.10.0` / `^3.0.0`), `@testing-library/user-event` (`^14.6.1`), and `@vitest/coverage-v8` (`^4.0.18`).
- Remove redundant `jsdom` (`^26.0.0`) since `happy-dom` is the standardized fast DOM environment for the `unit` project.

---

## Primary Sources Cited

1. **Biome v2.0 Release ("Biotype") & Type-Aware Linting**: https://biomejs.dev/blog/biome-v2/
2. **Biome v2 Upgrade & Configuration Reference (`files.includes`, `assist`, `css.parser.tailwindDirectives`)**: https://biomejs.dev/guides/upgrade-to-biome-v2/ & https://biomejs.dev/reference/configuration/
3. **Biome Linter Rules (`noRestrictedImports`, `useFilenamingConvention`, `noProcessEnv`, `useSortedClasses`, `a11y`)**: https://biomejs.dev/linter/rules/
4. **`@antfu/eslint-config` Architecture**: https://github.com/antfu/eslint-config
5. **TanStack Router Testing & In-Memory History (`createMemoryHistory`, `createRouter`, `RouterProvider`)**: https://tanstack.com/router/latest/docs/framework/react/how-to/test-file-based-routing
6. **TanStack Start Hosting & Build Output (`dist/client`, `dist/server/server.js`)**: https://tanstack.com/start/latest/docs/framework/react/hosting
7. **MSW Node Interception (`msw/node` `setupServer`)**: https://mswjs.io/docs/integrations/node
8. **Effect Testing with `@effect/vitest` (`it.effect`, `it.scoped`, `TestClock`)**: https://effect.website/docs/testing/testclock/ & https://github.com/Effect-TS/effect/tree/main/packages/vitest
9. **Vitest 4 Projects, Browser Mode & `@vitest/coverage-v8`**: https://vitest.dev/guide/projects.html, https://vitest.dev/guide/browser/, https://vitest.dev/guide/coverage.html
10. **Reference Repository Artifacts**:
    - [`hono-open-api/AGENTS.md`](file:///Users/guilhermeguerreiro/Documents/Git/hono-open-api/AGENTS.md)
    - [`hono-open-api/.github/workflows/ci.yml`](file:///Users/guilhermeguerreiro/Documents/Git/hono-open-api/.github/workflows/ci.yml)
    - [`hono-open-api/Dockerfile`](file:///Users/guilhermeguerreiro/Documents/Git/hono-open-api/Dockerfile) & [`hono-open-api/docker-compose.yml`](file:///Users/guilhermeguerreiro/Documents/Git/hono-open-api/docker-compose.yml)
    - [`hono-open-api/docs/adr/0011-testing-strategy-and-contract-suites.md`](file:///Users/guilhermeguerreiro/Documents/Git/hono-open-api/docs/adr/0011-testing-strategy-and-contract-suites.md)
    - [`hono-open-api/docs/adr/0012-ci-containerization-and-compose.md`](file:///Users/guilhermeguerreiro/Documents/Git/hono-open-api/docs/adr/0012-ci-containerization-and-compose.md)
    - [`forklore-fe/package.json`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/package.json), [`forklore-fe/biome.json`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/biome.json), [`forklore-fe/vitest.config.ts`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/vitest.config.ts), [`forklore-fe/src/test/route-guards.test.ts`](file:///Users/guilhermeguerreiro/Documents/Git/forklore-fe/src/test/route-guards.test.ts)
