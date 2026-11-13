# tanstack-open-api

Production-ready full-stack React 19 frontend starter kit built on TanStack Start, Effect, and OpenAPI contracts, pairing directly with [`hono-open-api`](https://github.com/Guiguerreiro39/hono-open-api).

## Tech Stack Highlights

- **Framework & Routing**: [TanStack Start](https://tanstack.com/start) (React 19 SSR) + [TanStack Router](https://tanstack.com/router) with pathless guards and search validation.
- **State & Forms**: [TanStack Query](https://tanstack.com/query) (isomorphic hydration, SSE live queries) + [TanStack Form](https://tanstack.com/form) with Effect StandardSchemaV1.
- **Contract & Errors**: [Effect](https://effect.website) typed schemas, 11 status `Data.TaggedError` classes, and dual-target [Orval](https://orval.dev) generation.
- **Authentication & RBAC**: [Better Auth](https://better-auth.com) isomorphic cookie/bearer forwarding with fine-grained `<Can />` authorization.
- **Design System**: [Tailwind CSS v4](https://tailwindcss.com) semantic tokens, [shadcn/ui](https://ui.shadcn.com) catalog, OKLCH presets, and tactile elevation.
- **Quality & Testing**: [Biome 2](https://biomejs.dev) lint/format guardrails, [Vitest](https://vitest.dev) 4 boundary harness, and [MSW](https://mswjs.io) v2.
- **Observability**: Pluggable `ObservabilityPort` (Sentry / Datadog) with W3C `traceparent` and `X-Request-Id` trace correlation.

## Quickstart

```bash
pnpm install       # Install dependencies
pnpm dev           # Start Vite dev server on http://localhost:3000
pnpm test          # Run Vitest unit and boundary suites
pnpm build         # Build production client and server bundles
```

## Project Scripts

| Script          | Command                                | Purpose                                                                |
| :-------------- | :------------------------------------- | :--------------------------------------------------------------------- |
| `dev`           | `vite dev`                             | Start development server with HMR                                      |
| `build`         | `vite build`                           | Build production client (`dist/client`) and SSR server (`dist/server`) |
| `start`         | `node server.mjs`                      | Run Node 24 production server with static serving & reverse proxy      |
| `serve`         | `vite preview`                         | Preview production build locally via Vite                              |
| `typecheck`     | `tsc --noEmit`                         | Check TypeScript types without emitting artifacts                      |
| `lint`          | `biome check .`                        | Verify code style, imports, and accessibility rules                    |
| `lint:fix`      | `biome check --write .`                | Apply safe auto-fixes for formatting and import sorting                |
| `test`          | `vitest run --project unit`            | Execute unit, contract, and boundary test suites                       |
| `test:watch`    | `vitest --project unit`                | Run Vitest in interactive watch mode                                   |
| `test:coverage` | `vitest run --project unit --coverage` | Generate test coverage report via `@vitest/coverage-v8`                |
| `generate:api`  | `orval`                                | Regenerate API contracts and Effect schemas from `openapi.json`        |
| `sync:api`      | `curl ... && orval`                    | Fetch OpenAPI spec from running `hono-open-api` and regenerate         |

## Route & Feature Slice Architecture

Organized under Feature-Sliced Design (`src/app` -> `src/routes` -> `src/features` -> `src/shared`):

```text
src/routes/
├── __root.tsx          # Root shell, HTML document, theme provider, router devtools
├── login.tsx           # Public login feature slice (authClient, credential forms)
├── showcase.tsx        # Design system showcase, OKLCH token preview, tactile components
└── _app.tsx            # Pathless authenticated layout, SSR session guard, RBAC context
    ├── _app/index.tsx  # Dashboard landing view and route redirection
    ├── _app/tasks.tsx  # Realtime SSE tasks slice (tasks) with optimistic mutation buffering
    └── _app/files.tsx  # File management slice (files) with multipart and presigned uploads
```

## Documentation

- [Architecture Guide](docs/architecture.md): Runtime composition, FSD layers, Effect contracts, SSE, and telemetry.
- [Development & Playbooks](docs/development.md): 3 dev modes, 4 onboarding playbooks, 7-step scaffolding, and env vars.
- [Design System & Tokens](DESIGN.md): Semantic OKLCH tokens, tactile elevation, and typography.
- [Domain Glossary](GLOSSARY.md): Ubiquitous language and domain definitions.
- [Architecture Decision Records](docs/adr/): Accepted ADRs (`ADR-0001` through `ADR-0009`).
- [Runtime Verification](.agents/skills/verify-tanstack-open-api/SKILL.md): Automated verification skill and feature flows.
