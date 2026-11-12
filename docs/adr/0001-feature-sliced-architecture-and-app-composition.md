---
status: accepted
---

# Pragmatic Feature-Sliced Design (`app`, `routes`, `features`, `shared`) and router-scoped Effect composition

We organize `src/` into a four-layer pragmatic Feature-Sliced Design hierarchy—`src/app/` (Effect `ManagedRuntime` and global styles), `src/routes/` (TanStack Router file-based route assembly and guards), `src/features/<slice>/` (`auth`, `tasks`, `files`, and `showcase` slices, each segmented into `api/`, `model/`, and `ui/`), and `src/shared/` (`ui/`, `api/`, `config/`, `observability/`, and `lib/`)—enforced by a unidirectional import DAG (`app` → `routes` → `features` → `shared`) with direct segment imports and no barrel files. `getRouter(options?)` in `src/router.tsx` (paired with `createAppRuntime(deps?)` in `src/app/runtime.ts`) acts as the single side-effect-free `Composition Root`, injecting `{ queryClient, runtime }` into `RouterAppContext` and delegating `<QueryClientProvider>` ownership to `setupRouterSsrQueryIntegration`.

## Considered Options

- **Backend-mirrored Ports-and-Adapters layout (`src/core/`, `src/infra/`, `src/components/`, `src/features/`, `src/routes/`)**: Rejected because Feature-Sliced Design (`app`, `routes`, `features`, `shared`) is a more idiomatic fit for frontend UI/state decomposition and preserves `forklore-fe`'s slice mental model while cleaning up its stray `src/components/` directory.
- **Full six-layer FSD (`app`, `pages`, `widgets`, `features`, `entities`, `shared`)**: Rejected because TanStack Router's file-based routing natively owns `src/routes/` (replacing `pages/`), and adding separate `widgets/` and `entities/` layers introduces unnecessary indirection when layout shells live in `src/shared/ui/` and accept feature slots (such as `<UserMenu />`) from `src/routes/_app.tsx`.
- **Module-level `RuntimeClient` singleton (`ManagedRuntime.make(Layer.empty)`) + duplicate `<QueryClientProvider>` in `__root.tsx`**: Rejected because a global singleton prevents per-request SSR isolation and per-test Effect `Layer` injection, while wrapping `<QueryClientProvider>` inside `__root.tsx` duplicates the provider already registered by `@tanstack/react-router-ssr-query`.

## Consequences

- Biome `noRestrictedImports` enforces `app` → `routes` → `features` → `shared`, bans cross-slice imports (`src/features/<a>` cannot import `src/features/<b>`), and bans upward imports from `src/shared/` into `src/features/` or `src/routes/`.
- `components.json` maps `ui` to `@/shared/ui` and `utils` to `@/shared/lib/utils`, consolidating all 62 `shadcn/ui` primitives and layout shells under `src/shared/ui/`.
- Every `Feature Slice` (`auth`, `tasks`, `files`, `showcase`) uses `api/`, `model/`, and `ui/` segments with direct file imports (no `index.ts` barrel files) and co-located `*.test.ts(x)` files.
- `useEffectQuery`, `useEffectMutation`, `matchEffect`, and route loaders resolve their Effect `ManagedRuntime` from `RouterAppContext`, enabling deterministic test overrides via `getRouter({ runtime })`.
