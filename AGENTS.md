# Agent Instructions

## Design System

Always adhere to the design system, colors, typography, components, and layout specifications defined in [DESIGN.md](./DESIGN.md) when building or modifying frontend UI components, styling, and layouts.

## Agent skills

### Issue tracker

Issues and specs live as GitHub Issues in `Guiguerreiro39/tanstack-open-api` (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 1:1 triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`GLOSSARY.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.

## Engineering guardrails

- **Layer boundaries (`src/app/` -> `src/routes/` -> `src/features/<slice>/` -> `src/shared/`).** Keep `Feature Slice`s (`auth`, `tasks`, `files`, `showcase`) isolated inside `api/`, `model/`, and `ui/` `Segment`s with direct file imports, zero barrel `index.ts` files, and zero cross-slice imports (`style/noRestrictedImports`).

- **Side-effect-free composition.** Wire `QueryClient` and the Effect `ManagedRuntime` exclusively inside `getRouter(options?)` (`src/router.tsx`) and `createAppRuntime(deps?)` (`src/app/runtime.ts`), delegate `<QueryClientProvider>` to `setupRouterSsrQueryIntegration`, and keep all `process.env` / `import.meta.env` reads isolated to `src/shared/config/env.ts` (`style/noProcessEnv`).

- **Orval and Effect contracts.** Bind endpoints through `defineContract` (`src/shared/api/contracts.ts`) paired with generated `@orval/effect` schemas (`src/shared/api/generated/`) and `useEffectQuery`, `useEffectMutation`, and `matchEffect`. Regenerate `src/shared/api/generated/**` via `pnpm generate:api` or `pnpm sync:api` rather than editing generated files or writing duplicate DTO schemas.

- **Auth, SSR guards, and RBAC.** Use `authSessionQueryOptions` (`src/features/auth/api/session.ts`) as the single session cache (`createIsomorphicFn` forwarding SSR `cookie` and `authorization` headers), guard protected routes under `src/routes/_app.tsx`, reset session state on `401` (`UnauthorizedError`) while rendering `403` (`ForbiddenError`) refusals in place, and enforce role and `own` vs `all` `Resource Scope` rules through `src/shared/lib/rbac.ts` and `<Can />` (`src/shared/ui/can.tsx`).

- **Realtime SSE and optimistic mutations.** Subscribe to `/api/v1/tasks/live` via `useLiveQuery` (`src/shared/lib/hooks/use-live-query.ts`) using `EventSource(..., { withCredentials: true })` or `fetch` + `eventsource-parser` for Bearer tokens (never `?token=` query params), and key task mutations under `["tasks", "mutation"]` so incoming SSE snapshots buffer while `isMutating > 0`.

- **Observability and defect discipline.** Call `ObservabilityPort` (`src/shared/observability/port.ts`) rather than vendor SDKs directly. Report only unexpected `Defect`s (`500`/`503`, `UnknownError`, `SchemaDecodeError`, uncaught React 19 errors) via `captureDefect` / `captureReactError`, record expected `4xx` domain errors as PII-safe breadcrumbs via `recordBreadcrumb`, and preserve outbound `X-Request-Id` and W3C `traceparent` headers.

- **Single-source design tokens and forms.** Express all colors, surfaces, radii, typography, and tactile elevation through semantic `Design Token` utilities in `src/styles/theme.css` (`@theme inline`, `shadow-tactile`, `interactive-tactile`, `lucide-react` icons, verified by `src/shared/ui/__tests__/theme-hygiene.test.ts`), and build forms with `useAppForm` and `Field Primitive`s in `src/shared/ui/form.tsx` (`Schema.standardSchemaV1`).

- **File naming and formatting.** Name source and documentation files in `kebab-case` (except TanStack Router file conventions under `src/routes/**` such as `__root.tsx` and `_app.tsx`) and format/sort imports and Tailwind classes with Biome (`pnpm lint:fix`).

- **Boundary-only testing.** Test behavior through the `Test Harness` in `src/test/` (`renderAppRoutes`, `renderWithProviders`, MSW `server` with `onUnhandledRequest: "error"`, `MockEventSource`, `MockXMLHttpRequest`, and `createSpyObservability()`). Avoid `vi.mock()` on internal modules, `authClient`, `@tanstack/react-query`, or `@tanstack/react-router`.

- **Verification gates.** Before reporting done, pass `pnpm generate:api && git diff --exit-code`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` (checking `git diff --exit-code src/routeTree.gen.ts`), and execute `.agents/skills/verify-tanstack-open-api/SKILL.md` whenever routes, UI workflows, or runtime contracts change.

## Context pointers

- `GLOSSARY.md`: consult when naming layers, feature slices, segments, ports, adapters, contracts, resource scopes, live queries, defects, design tokens, theme presets, field primitives, presigned uploads, or test harnesses.
- `DESIGN.md`: consult when building or modifying UI components, layouts, typography, surface hierarchy, tactile shadows, or `Theme Preset`s (`src/styles/theme.css`).
- `docs/architecture.md`: consult when editing `getRouter` / `createAppRuntime`, `customFetch` / `defineContract`, `authSessionQueryOptions`, `useLiveQuery`, `ObservabilityPort` adapters, or `server.mjs`.
- `docs/development.md`: consult when onboarding from template, rebranding or pruning demo slices, adding environment variables, syncing OpenAPI specs, scaffolding a `Feature Slice`, or writing tests.
- `docs/adr/`: consult before changing FSD layer rules, Orval/Effect contracts, Better Auth guards, SSE live queries, Sentry/Datadog telemetry, Tailwind v4 tokens, `shadcn/ui` forms, Vitest harnesses, or CI/Docker (`ADR-0001` through `ADR-0009`).
- `.agents/skills/verify-tanstack-open-api/SKILL.md`: consult before opening a PR or claiming a user-facing feature works at runtime, and update via `/maintain-verification-skill` when routes, auth, env vars, or test harnesses change.
