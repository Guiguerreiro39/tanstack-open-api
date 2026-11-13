# TanStack OpenAPI Starter — Development & Onboarding Playbooks

This guide covers local development workflows, template onboarding playbooks, the 7-step checklist for scaffolding new feature slices, the boundary-only testing strategy, and the complete environment variable reference.

---

## 1. Local Development Modes

The starter kit supports three distinct development modes depending on your workflow and backend availability.

### Mode 1: Standalone Mock Mode (Offline with MSW v2)

Use this mode when building UI components, prototyping new flows, or working offline without running an upstream backend.

1. **Start Vite in Mock Mode**:

   ```bash
   pnpm dev
   ```
2. **Behavior**:
   - Network requests are intercepted in-browser by MSW v2 service worker or handled gracefully via client-side fallbacks.
   - Ideal for isolated UI development on `/showcase` and design token iteration.

### Mode 2: Paired with Local `hono-open-api` Backend (`http://localhost:9999`)

The standard full-stack development workflow.

1. **Start Backend**:
   In your local `hono-open-api` clone:

   ```bash
   pnpm dev   # Starts backend on http://localhost:9999
   ```
2. **Start Frontend**:
   In `tanstack-open-api`:

   ```bash
   pnpm dev   # Starts frontend on http://localhost:3000
   ```
3. **Behavior**:
   - `vite.config.ts` proxies `/api` and `/_storage` directly to `http://localhost:9999`.
   - Browser cookies and Better Auth sessions work seamlessly same-origin (`VITE_API_URL=""`).
   - Server-Sent Events (`/api/v1/tasks/live`) stream directly without CORS negotiation.

### Mode 3: Containerized Full-Stack via Docker Compose

Use this mode to test production builds, reverse proxies, and health probes identically to deployment.

1. **Launch Containers**:

   ```bash
   docker compose up --build
   ```
2. **Behavior**:
   - Boots the multi-stage `Dockerfile` (`node:24-slim`) running `server.mjs` on port `3000`.
   - Connects to host services via `API_INTERNAL_URL: http://host.docker.internal:9999`.
   - Verifies the `/health` endpoint and SSR winterCG rendering.

---

## 2. Template Onboarding Playbooks

Four step-by-step playbooks for transforming this starter kit into your own production application.

### Playbook 1: Bootstrap / Rebrand

Follow these steps to rename and brand the project for your organization:

1. **Update `package.json`**:
   - Change `"name": "my-company-app"`.
   - Update `"description"`, `"repository"`, and `"author"`.
2. **Update HTML Document Metadata (`src/routes/__root.tsx`)**:
   - Change the `<title>` tag default and template:

     ```tsx
     <title>My Company App</title>
     ```
   - Update meta tags (description, OpenGraph, favicon links in `public/`).
3. **Customize Application Shell Branding (`src/shared/ui/app-shell.tsx`)**:
   - Replace the application logo icon and text (`"TanStack Starter"` $\to$ `"My Application"`).
   - Configure primary navigation links and mobile sidebar items.
4. **Verify Clean Build**:

   ```bash
   pnpm typecheck && pnpm build
   ```

### Playbook 2: Single-File Restyle

Restyle the entire application without touching React component markup by modifying `src/styles/theme.css`:

1. **Select or Switch Theme Presets**:
   In `src/routes/__root.tsx` or using the `ThemeSwitcher` component, set the active preset on `<html>`:
   - `warm-tactile`: Default warm terracotta and sage palette with tactile physical shadows.
   - `editorial-slate`: Minimal monochrome palette with diffuse SaaS elevation.
   - `neo-brutalist`: High-contrast retro brutalism with hard borders and offset depth.
2. **Modify OKLCH Color Tokens**:
   Open `src/styles/theme.css` and adjust Layer 1 CSS custom properties:

   ```css
   :root {
     --primary: oklch(0.55 0.22 260); /* Switch to vibrant indigo */
     --primary-foreground: oklch(1 0 0);
     --radius: 0.5rem;                 /* Tighter border radii */
   }
   ```
3. **Adjust Tactile Elevation Physics**:
   Tweak the tactile shadow variables to change the physical feel:

   ```css
   --shadow-tactile: 4px 4px 0px 0px rgb(var(--shadow-color) / 0.15);
   --tactile-hover-translate-y: -3px;
   --tactile-active-translate-y: 2px;
   ```
4. **Enforce Design System Hygiene**:
   Run the automated theme hygiene test to ensure zero hardcoded hex values or utility regressions:

   ```bash
   pnpm test src/shared/ui/__tests__/theme-hygiene.test.ts
   ```

### Playbook 3: OpenAPI Contract Sync

When the backend API changes in `hono-open-api`:

1. **Ensure Backend is Running**:
   Confirm `http://localhost:9999/doc` is accessible.
2. **Run Contract Sync**:

   ```bash
   pnpm sync:api
   ```

   This command:
   - Fetches the OpenAPI 3.1 specification from `http://localhost:9999/doc` into `./openapi.json`.
   - Executes `orval` to regenerate `@orval/effect` schemas and React Query hooks in `src/shared/api/generated/`.
3. **Offline Generation (Manual Spec)**:
   If editing `openapi.json` directly or importing a file:

   ```bash
   pnpm generate:api
   ```
4. **Audit Generated Diffs**:
   Verify the schema changes with Git:

   ```bash
   git diff src/shared/api/generated
   ```
5. **Update Contracts & Consumer Slices**:
   Update `defineContract` mappings in feature slices if endpoint signatures changed.

### Playbook 4: Demo-Slice Pruning

Safely remove the reference feature slices (`tasks`, `files`, and `showcase`) to leave a pristine blank canvas:

1. **Delete Route Files**:

   ```bash
   rm src/routes/_app/tasks.tsx
   rm src/routes/_app/files.tsx
   rm src/routes/showcase.tsx
   ```
2. **Delete Feature Directories**:

   ```bash
   rm -rf src/features/tasks
   rm -rf src/features/files
   ```
3. **Update Navigation in `src/shared/ui/app-shell.tsx`**:
   Remove `Tasks`, `Files`, and `Showcase` navigation links from `navItems`.
4. **Update Default Authenticated Landing (`src/routes/_app/index.tsx`)**:
   Update the index route to point to your new primary feature route instead of redirecting to `/tasks`.
5. **Regenerate Route Tree and Test**:

   ```bash
   pnpm build
   pnpm test
   ```

   TanStack Router will automatically regenerate `src/routeTree.gen.ts`. The core engine (auth, RBAC, theme, forms, error taxonomy, observability) remains completely intact.

---

## 3. Scaffolding a New Feature Slice (7-Step Checklist)

Follow this checklist to build a new feature slice adhering to Feature-Sliced Design:

- [ ] **Step 1: Domain Modeling & Glossary**: Update `GLOSSARY.md` with ubiquitous terms. If introducing major architectural patterns, create an ADR in `docs/adr/`.
- [ ] **Step 2: Sync OpenAPI Schema**: Run `pnpm sync:api` or `pnpm generate:api` to ensure generated schemas exist in `src/shared/api/generated/`.
- [ ] **Step 3: Create Feature Structure**:

  ```bash
  mkdir -p src/features/<slice-name>/{api,model,ui}
  ```
- [ ] **Step 4: Bind API Contracts (`api/`)**: Create `defineContract` mappings binding the Orval operation, Effect schema, and error handlers.
- [ ] **Step 5: Define Domain Logic & State (`model/`)**: Create queries, mutations, or `useLiveQuery` subscriptions in `model/`.
- [ ] **Step 6: Implement UI Components (`ui/`)**: Build components using `useAppForm`, `Field Primitive`s, semantic design tokens, and `<Can />` authorization.
- [ ] **Step 7: Wire Route & Add Behavioral Tests**: Create the route in `src/routes/_app/<slice-name>.tsx` and write boundary integration tests in `src/features/<slice-name>/__tests__/`.

---

## 4. Testing Guide & Boundary Test Harness (ADR-0008)

The test suite runs on Vitest 4 with `happy-dom`, prioritizing realistic behavioral assertions without fragile internal mocks.

### The Boundary-Only Principle

> **No Internal Mocking**: Banned `vi.mock()` calls on internal modules, `@/shared/lib/auth-client`, `@tanstack/react-query`, or `@tanstack/react-router`.

Instead, the test harness mounts the real application `Composition Root` (`renderAppRoutes` / `renderWithProviders` in `src/test/render.tsx`) and intercepts exclusively at the four outer system boundaries:

| Boundary                  | Interception Tool         | File                                | Purpose                                                                                   |
| :------------------------ | :------------------------ | :---------------------------------- | :---------------------------------------------------------------------------------------- |
| **HTTP Network**          | MSW v2 (`msw/node`)       | `src/test/msw-server.ts`            | Intercepts REST calls; fails tests on unhandled requests (`onUnhandledRequest: "error"`). |
| **Server-Sent Events**    | `MockEventSource`         | `src/test/mock-event-source.ts`     | Simulates SSE streams, reconnection delays, and live updates.                             |
| **Binary File Transfers** | `MockXMLHttpRequest`      | `src/test/mock-xml-http-request.ts` | Simulates presigned PUT uploads, progress events, and aborts.                             |
| **Observability**         | `SpyObservabilityAdapter` | `src/test/spy-observability.ts`     | In-memory spy asserting captured defects and recorded breadcrumbs.                        |

### Running Tests

```bash
pnpm test                  # Run full unit & boundary suite
pnpm test:watch            # Interactive TDD watch mode
pnpm test:coverage         # Full coverage report via @vitest/coverage-v8
```

---

## 5. Environment Variables Reference

Environment variables are validated using Effect schemas in `src/shared/config/env.ts` (`ClientEnvSchema` and `ServerEnvSchema`). Direct access via `process.env` or `import.meta.env` outside this module is blocked by Biome.

### Client Environment Variables (`ClientEnvSchema`)

Prefix with `VITE_` for browser visibility:

| Variable                         | Type         | Default                   | Purpose                                                         |
| :------------------------------- | :----------- | :------------------------ | :-------------------------------------------------------------- |
| `VITE_API_URL`                   | String       | `""`                      | Base URL for API calls. Empty string uses same-origin proxy.    |
| `VITE_APP_VERSION`               | String       | `"0.0.0"`                 | Client application version string for release tracking.         |
| `VITE_SENTRY_DSN`                | String (opt) | `undefined`               | Sentry DSN for frontend defect and error reporting.             |
| `VITE_SENTRY_TRACES_SAMPLE_RATE` | Number       | `0.2`                     | Sentry performance tracing sample rate (0.0 to 1.0).            |
| `VITE_SENTRY_REPLAY_SAMPLE_RATE` | Number       | `0.1`                     | Sentry session replay sample rate (0.0 to 1.0).                 |
| `VITE_DD_APPLICATION_ID`         | String (opt) | `undefined`               | Datadog RUM application ID.                                     |
| `VITE_DD_CLIENT_TOKEN`           | String (opt) | `undefined`               | Datadog client token for RUM telemetry ingestion.               |
| `VITE_DD_SITE`                   | String       | `"datadoghq.com"`         | Datadog intake site (e.g. `datadoghq.eu`, `us5.datadoghq.com`). |
| `VITE_DD_SERVICE`                | String       | `"tanstack-open-api-web"` | Datadog service identifier.                                     |
| `VITE_DD_SESSION_SAMPLE_RATE`    | Number       | `100`                     | Percentage of total user sessions tracked in Datadog RUM.       |
| `VITE_DD_REPLAY_SAMPLE_RATE`     | Number       | `20`                      | Percentage of tracked sessions with Datadog session replay.     |
| `VITE_DD_TRACE_SAMPLE_RATE`      | Number       | `100`                     | Percentage of Datadog requests injected with trace headers.     |

### Server Environment Variables (`ServerEnvSchema`)

Server-only runtime variables:

| Variable           | Type   | Default                   | Purpose                                                                   |
| :----------------- | :----- | :------------------------ | :------------------------------------------------------------------------ |
| `API_INTERNAL_URL` | String | `"http://localhost:9999"` | Upstream API destination for SSR fetching and `server.mjs` reverse proxy. |
| `NODE_ENV`         | String | `"development"`           | Node execution environment (`development`, `production`, `test`).         |
| `PORT`             | Number | `3001`                    | Server port used by Node 24 runtime in `server.mjs`.                      |
| `HOST`             | String | `"0.0.0.0"`               | Host binding address for production server.                               |
