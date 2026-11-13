# Agent Environment & Friction Notes (GEMINI.md)

## Recurring Friction & Guardrails

### 1. GitHub CLI GraphQL Warnings on Projects

- **Issue**: Standard `gh issue view <id>` and `gh pr edit <id>` commands fail with exit code 1 due to GitHub deprecating classic Project Cards GraphQL endpoints (`repository.pullRequest.projectCards`).
- **Remedy**: Always pass explicit JSON fields (e.g. `gh issue view <id> --json number,title,body`) or use REST calls via `gh api -X PATCH repos/:owner/:repo/pulls/<id> -f body=...`.

### 2. Cross-Layer Session Access in Feature-Sliced Design

- **Issue**: Components in `src/shared/ui/` (such as `<Can />`) cannot import `authSessionQueryOptions` from `src/features/auth/api/session.ts` without violating Biome's `style/noRestrictedImports` rule. Defining a local in-memory `queryFn` clobbers React Query's default network query function on `["auth", "session"]`.
- **Remedy**: Use the bridge pattern in `src/shared/lib/auth-session-bridge.ts`. The feature layer registers query options on module load, and shared components subscribe via the bridge or `useSyncExternalStore`.

### 3. TanStack Form Concurrent Submission Race

- **Issue**: TanStack Form does not prevent concurrent `handleSubmit()` triggers if double-clicked or submitted via rapid Enter keypresses before `isSubmitting` disables the button.
- **Remedy**: `useAppForm` in `src/shared/ui/form.tsx` wraps `handleSubmit` and `onSubmit` with a submission ref to drop reentrant submissions while one is in flight.

### 4. Realtime Mutation Buffer Settle Timing

- **Issue**: React Query's `mutationCache.subscribe` emits a success event synchronously when the mutation promise resolves, immediately before hook-level `onSuccess` updates the query cache. If the buffered SSE snapshot is flushed synchronously, it overwrites the cache before `onSuccess` can swap the optimistic ID for the server ID.
- **Remedy**: Flush buffered SSE snapshots inside a `queueMicrotask` callback so `onSuccess` runs first, and preserve non-optimistic items present in the cache that are not yet in the incoming snapshot.

### 5. Client Hydration Entry for React 19 Error Hooks

- **Issue**: TanStack Start uses a default internal hydration script when `src/client.tsx` is missing, which silently bypasses React 19's `onUncaughtError`, `onCaughtError`, and `onRecoverableError` hooks.
- **Remedy**: Maintain `src/client.tsx` with `hydrateRoot(document, <StartClient />, { onUncaughtError, onCaughtError, onRecoverableError })` wired to `observability.captureReactError`.
