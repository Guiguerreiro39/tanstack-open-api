# TanStack Start, Router, Query v5, and Form v1: Best Practices & `forklore-fe` Audit

> **Research Ticket:** [Guiguerreiro39/tanstack-open-api#2](https://github.com/Guiguerreiro39/tanstack-open-api/issues/2)  
> **Parent Epic:** [Guiguerreiro39/tanstack-open-api#1](https://github.com/Guiguerreiro39/tanstack-open-api/issues/1)  
> **Reference Codebases:** `forklore-fe` (React 19 + TanStack Start/Router/Query/Form + Effect) and `hono-open-api` (Hono + Better Auth + Zod OpenAPI)

---

## Executive Summary (Decision Gist)

Use **TanStack Start (`@tanstack/react-start`) + `@tanstack/react-router-ssr-query`** (removing deprecated `@tanstack/react-router-with-query` and duplicate `<QueryClientProvider>` wrappers), configure **`defaultPreloadStaleTime: 0`** on the router so TanStack Query v5 owns caching, move Better Auth session checks into a pathless **`src/routes/_app.tsx` layout `beforeLoad`** backed by **`queryClient.ensureQueryData(authSessionQueryOptions)`** (forwarding request cookies via `createServerFn` in SSR mode or enabling SPA/Selective SSR mode against external backends), and replace raw `<form.Field>` repetition with **`createFormHookContexts` + `createFormHook` (`useAppForm`)** wired to **Effect `Schema.standardSchemaV1`**.

---

## 1. Package Audit of `forklore-fe`

Inspection of `forklore-fe/package.json` alongside the resolved packages in `forklore-fe/node_modules/@tanstack/*` reveals several dependency and wiring redundancies that should be cleaned up in `tanstack-open-api`:

| Package in `forklore-fe/package.json` | Specifier (`package.json`) | Resolved (`.pnpm`) | Status & Recommendation for `tanstack-open-api` |
| :--- | :--- | :--- | :--- |
| `@tanstack/react-start` | `^1.141.1` | `1.168.49` | **Keep (Core)**. Full-stack Vite plugin, SSR/SPA mode, `createServerFn`, middleware, and request context utilities. |
| `@tanstack/react-router` | `^1.141.1` | `1.170.32` | **Keep (Core)**. File-based routing, `createFileRoute`, `createRootRouteWithContext`, `redirect`, `notFound`. |
| `@tanstack/react-router-ssr-query` | `^1.142.7` | `1.167.2` | **Keep (Canonical)**. Provides `setupRouterSsrQueryIntegration({ router, queryClient })` for automatic QueryClient provider wrapping, SSR dehydration/hydration, streaming, and redirect handling. |
| `@tanstack/react-router-with-query` | `^1.130.17` | `1.130.17` | **Remove (Deprecated)**. Superseded by `@tanstack/react-router-ssr-query`. Frozen at `1.130.17` and unused anywhere in `forklore-fe/src`. |
| `@tanstack/router-plugin` | `^1.141.1` (`dependencies`) | `1.168.35` | **Remove from `dependencies`** (or move to `devDependencies` if using standalone `tsr` CLI). `@tanstack/react-start/plugin/vite` (`@tanstack/start-plugin-core`) already embeds and configures `@tanstack/router-plugin` via the `tanstackStart({ router: { ... } })` option. |
| `@tanstack/react-query` | `^5.80.6` | `5.102.8` | **Keep (Core)**. Note that `@tanstack/react-router-ssr-query@1.167.2` requires peer `@tanstack/react-query >= 5.102.0`; pin `^5.102.0` in `package.json`. |
| `@tanstack/react-form` | `^1.23.5` | `1.33.5` | **Keep (Core)**. Pin `^1.33.0` for `createFormHook`, `createFormHookContexts`, `withForm`, `withFieldGroup`, and native Standard Schema v1 support. |

### Redundant `<QueryClientProvider>` in `forklore-fe`

In `forklore-fe/src/router.tsx`, `setupRouterSsrQueryIntegration({ router, queryClient })` is called, and in `forklore-fe/src/routes/__root.tsx` (lines 62–65), `RootDocument` manually wraps the tree in `<QueryClientProvider client={context.queryClient}>`.

Inspecting the primary source of `@tanstack/react-router-ssr-query` (`node_modules/@tanstack/react-router-ssr-query/dist/esm/index.js`):

```js
function setupRouterSsrQueryIntegration(opts) {
  setupCoreRouterSsrQueryIntegration(opts);
  if (opts.wrapQueryClient === false) return;
  const OGWrap = opts.router.options.Wrap || Fragment;
  opts.router.options.Wrap = ({ children }) => {
    return jsx(QueryClientProvider, {
      client: opts.queryClient,
      children: jsx(OGWrap, { children })
    });
  };
}
```

Because `wrapQueryClient` defaults to `true`, `setupRouterSsrQueryIntegration` **already wraps the router in `<QueryClientProvider>`**. The manual `<QueryClientProvider>` in `src/routes/__root.tsx` is redundant and should be removed.

### Missing `defaultPreloadStaleTime: 0` in `forklore-fe/src/router.tsx`

TanStack Router includes an internal SWR cache whose `defaultPreloadStaleTime` defaults to `30_000` ms (30 seconds). When using TanStack Query as the application cache, the official TanStack Router Data Loading guide mandates setting `defaultPreloadStaleTime: 0` on `createRouter` so that every link preload (`defaultPreload: "intent"`) delegates staleness decisions to `QueryClient`:

```tsx
// src/router.tsx
export function getRouter() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
      },
    },
  });

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0, // Let TanStack Query manage preload staleness
    scrollRestoration: true,
    defaultPendingComponent: () => <Loader />,
    defaultNotFoundComponent: DefaultNotFound,
    defaultErrorComponent: DefaultErrorBoundary,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}
```

---

## 2. TanStack Start & Router: SSR vs SPA, Auth Guards, and Error Boundaries

### 2.1 Vite Plugin Ordering & Execution Model (`SSR` vs `SPA` vs `Selective SSR`)

In `vite.config.ts`, `tanstackStart()` **must** be registered before `viteReact()` so server function compilation (`createServerFn`) and route tree code-splitting transforms run before React Fast Refresh.

By default, TanStack Start runs in **Full SSR mode (`ssr: true`)**, where route `beforeLoad` and `loader` hooks are **isomorphic**:
1. On initial page request, `beforeLoad` and `loader` run **on the server** (Node/Bun/Worker SSR).
2. On subsequent client navigations, `beforeLoad` and `loader` run **in the browser**.

#### Critical SSR Bug in `forklore-fe`'s Auth Guard

In `forklore-fe/src/routes/_app/index.tsx` and `src/routes/login.tsx`, `beforeLoad` calls `authClient.getSession()` directly:

```ts
// forklore-fe/src/shared/lib/auth-client.ts
export const authClient = createAuthClient({
  baseURL:
    import.meta.env.VITE_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:9999"),
  fetchOptions: {
    credentials: "include",
  },
});
```

Because `hono-open-api` (`src/infra/auth/index.ts`) issues `HttpOnly`, `SameSite=Lax` session cookies, browser `fetch` requests automatically include the cookie via `credentials: "include"`. However, when `beforeLoad` executes on the **TanStack Start SSR server** (`typeof window === "undefined"`), the server-side `fetch("http://localhost:9999/api/auth/get-session")` has **no `Cookie` header** unless forwarded from the incoming SSR HTTP request. Consequently, SSR `getSession()` always returns `null`, causing a false server-side redirect to `/login?redirect=%2F` on every full-page reload.

#### Architectural Options for `tanstack-open-api`

Depending on whether `tanstack-open-api` is deployed as a full-stack SSR app or a client-rendered SPA talking to `hono-open-api`, TanStack Start supports two canonical configurations:

##### Option A: Full SSR with `createServerFn` Cookie Forwarding (Recommended for SSR)
Use `createServerFn` and `getRequestHeader("cookie")` from `@tanstack/react-start/server` (or `createIsomorphicFn`) so that during SSR, the incoming browser cookie is forwarded to the Better Auth backend (`hono-open-api`), and during client hydration/navigation, the cached Query data is reused without an extra round-trip:

```ts
// src/features/auth/api/get-session.ts
import { authClient } from "@/shared/lib/auth-client";
import { queryOptions } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const fetchAuthSession = createIsomorphicFn()
  .server(async () => {
    const cookie = getRequestHeader("cookie");
    const { data } = await authClient.getSession({
      fetchOptions: {
        headers: cookie ? { cookie } : undefined,
      },
    });
    return data ?? null;
  })
  .client(async () => {
    const { data } = await authClient.getSession();
    return data ?? null;
  });

export const authSessionQueryOptions = queryOptions({
  queryKey: ["auth", "session"] as const,
  queryFn: () => fetchAuthSession(),
  staleTime: 1000 * 60 * 5, // 5 minutes — prevents refetch on every route navigation
  gcTime: 1000 * 60 * 30,
});
```

##### Option B: Global SPA Mode or Selective SSR (`ssr: false`)
If the starter kit targets a pure SPA deployment (or static hosting) backed by `hono-open-api`, configure either:
1. **Global SPA mode** in `vite.config.ts`:
   ```ts
   tanstackStart({
     spa: {
       enabled: true,
       prerender: { outputPath: "/_shell.html" },
     },
   })
   ```
2. **Selective SSR** in `src/start.ts` (`createStart(() => ({ defaultSsr: false }))`) or per-layout route (`ssr: false` on `src/routes/_app.tsx`), which skips server execution of `beforeLoad`/`loader` for protected routes while keeping public routes SSR-capable.

---

### 2.2 Pathless Layout Guard (`_app.tsx`) + `queryClient.ensureQueryData`

In `forklore-fe`, the auth guard lives inside the leaf route `src/routes/_app/index.tsx` (`createFileRoute("/_app/")`), and there is **no `src/routes/_app.tsx` layout route**. Furthermore, `beforeLoad` calls `authClient.getSession()` directly on every navigation while `Header` (`src/components/header.tsx`), `useCurrentUser` (`src/features/auth/api/get-current-user.ts`), and `useRecipes` (`src/features/recipes/api/get-all.ts`) separately call `useSession()`.

#### Best-Practice Pattern for `tanstack-open-api`

1. **Create a pathless layout route `src/routes/_app.tsx`** (`createFileRoute("/_app")`) so every child route under `src/routes/_app/*` automatically inherits the guard and typed `user`/`session` context.
2. **Use `queryClient.ensureQueryData(authSessionQueryOptions)`** inside `beforeLoad` and return `{ user: session.user, session: session.session }`.
   - On the first navigation, `ensureQueryData` fetches and caches the session in TanStack Query.
   - On subsequent navigations within `staleTime` (5 minutes), `ensureQueryData` resolves synchronously from the Query cache with **zero network requests**.
   - Returning `{ user, session }` from `beforeLoad` merges them into the route context for all child routes (`/_app/*`), providing non-nullable `Route.useRouteContext().user` in child loaders and components.
3. **Sanitize the `redirect` search param on `/login`** to block protocol-relative open redirects (`//evil.com` passes `url.startsWith("/")` in `forklore-fe/src/routes/login.tsx` line 19!).
4. **Invalidate Query cache + Router on Sign-In / Sign-Out** instead of `location.reload()` (used in `forklore-fe/src/features/auth/ui/user-menu.tsx` line 53).

```tsx
// src/routes/_app.tsx
import { authSessionQueryOptions } from "@/features/auth/api/get-session";
import { Outlet, createFileRoute, isRedirect, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    try {
      const session = await queryClient.ensureQueryData(authSessionQueryOptions);
      if (!session?.user) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
      return {
        user: session.user,
        session: session.session,
      };
    } catch (error) {
      if (isRedirect(error)) throw error;
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: () => <Outlet />,
});
```

```tsx
// src/routes/login.tsx (Open-Redirect Safe)
import { authSessionQueryOptions } from "@/features/auth/api/get-session";
import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";

export function sanitizeRedirect(url: unknown): string {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) {
    return "/";
  }
  return url;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  beforeLoad: async ({ context: { queryClient }, search }) => {
    try {
      const session = await queryClient.ensureQueryData(authSessionQueryOptions);
      if (session?.user) {
        throw redirect({ to: search.redirect });
      }
    } catch (error) {
      if (isRedirect(error)) throw error;
    }
  },
  component: LoginComponent,
});
```

When signing in, signing up, or signing out, synchronize TanStack Query and TanStack Router cleanly:

```ts
// On sign-in / sign-up success:
await queryClient.invalidateQueries({ queryKey: authSessionQueryOptions.queryKey });
await router.invalidate();
await navigate({ to: sanitizeRedirect(redirectTo) });

// On sign-out success:
queryClient.setQueryData(authSessionQueryOptions.queryKey, null);
await router.invalidate();
await navigate({ to: "/login" });
```

---

### 2.3 Error Boundaries (`defaultErrorComponent`) & Not-Found Handling (`defaultNotFoundComponent`)

`forklore-fe/src/router.tsx` has no `defaultErrorComponent` and only a bare `() => <div>Not Found</div>` for `defaultNotFoundComponent`.

Per TanStack Router's official error handling rules:
- **Never call `reset()` alone** to retry a failed route loader. `reset()` only clears the React error boundary while leaving the failed loader state cached. Always call **`router.invalidate()`**, which re-runs active loaders and automatically resets the error boundary.
- **Do not call `Route.useLoaderData()` inside `notFoundComponent`**, because the loader may have thrown `notFound()` before completing. Use `Route.useParams()`, `Route.useSearch()`, or `Route.useRouteContext()` instead.

```tsx
// src/shared/ui/router-feedback.tsx
import { Button } from "@/shared/ui/button";
import { type ErrorComponentProps, Link, useRouter } from "@tanstack/react-router";

export function DefaultErrorBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();

  return (
    <div role="alert" className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-bold">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "An unexpected error occurred."}
      </p>
      <div className="flex gap-3">
        <Button onClick={() => router.invalidate()}>Retry</Button>
        <Button variant="outline" asChild>
          <Link to="/">Go Home</Link>
        </Button>
      </div>
    </div>
  );
}

export function DefaultNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-bold">404 — Page Not Found</h2>
      <p className="text-sm text-muted-foreground">
        The page or resource you are looking for does not exist.
      </p>
      <Button asChild>
        <Link to="/">Back to Home</Link>
      </Button>
    </div>
  );
}
```

---

## 3. TanStack Query v5 Best Practices

1. **`queryOptions` Factories as the Single Source of Truth**:
   Always define queries via `queryOptions({ queryKey, queryFn, ... })` (including Orval-generated `get*QueryOptions()` factories). This tags `queryKey` with `DataTag<QueryKey, TData, TError>`, giving full type inference across:
   - Route loaders: `context.queryClient.ensureQueryData(tasksQueryOptions)`
   - Components: `useQuery(tasksQueryOptions)` / `useSuspenseQuery(tasksQueryOptions)` / `useEffectQuery(tasksQueryOptions, descriptor)`
   - Optimistic updates & invalidation: `queryClient.setQueryData(tasksQueryOptions.queryKey, updater)`
2. **Route Loader Prefetching + Cache Hydration**:
   Prefetch critical route data in the route's `loader` via `queryClient.ensureQueryData(...)`. With `@tanstack/react-router-ssr-query` and `defaultPreload: "intent"` + `defaultPreloadStaleTime: 0`, hovering a `<Link>` preloads the query into `QueryClient` before navigation completes.
3. **Redirects Inside Queries/Mutations**:
   `@tanstack/react-router-ssr-query` enables `handleRedirects: true` by default (`@tanstack/router-ssr-query-core`), automatically catching any `redirect()` thrown in a query or mutation and routing via `router.navigate(...)`.
4. **Effect-Decoded Boundary (`useEffectQuery` / `useEffectMutation`)**:
   `forklore-fe`'s `useEffectQuery` (`src/shared/lib/hooks/use-effect-query.ts`) and `useEffectMutation` (`src/shared/lib/hooks/use-effect-mutation.ts`) wrap `useQuery`/`useMutation` and decode responses/errors through a `FunctionDescriptor<A, E, I>` using `Schema.decodeUnknownEither`. Pairing this with route loader `ensureQueryData` gives both zero-waterfall preloading and strict runtime schema validation at the API boundary.

---

## 4. TanStack Form v1 + Effect Standard Schema (`Schema.standardSchemaV1`) + `createFormHook`

### 4.1 How `Schema.standardSchemaV1` Integrates with TanStack Form v1

Effect (`>= 3.13.0`) implements the [Standard Schema v1](https://standardschema.dev/) specification via `Schema.standardSchemaV1(schema)`:

```ts
// node_modules/effect/dist/dts/Schema.d.ts
export declare const standardSchemaV1: <A, I>(
  schema: Schema<A, I, never>,
  overrideOptions?: AST.ParseOptions
) => StandardSchemaV1<I, A> & SchemaClass<A, I, never>;
```

TanStack Form v1 (`@tanstack/form-core/dist/esm/standardSchemaValidator.js`) natively detects any validator with `"~standard" in validator` and routes `result.issues` to both `form` and `fields` by joining `issue.path` segments (e.g. `user.email` or `items[0].name`).

#### Key Nuances & Best Practices with Effect Schema + TanStack Form

1. **Error Shape in `field.state.meta.errors`**:
   When a Standard Schema validator fails, each item in `field.state.meta.errors` is a `StandardSchemaV1Issue` object (`{ readonly message: string; readonly path?: ReadonlyArray<...> }`), **not** a plain `string`. However, if a field also uses a custom function validator, an error item may be a `string`. Reusable `FieldError` components must normalize both:
   ```ts
   function formatFieldError(error: unknown): string {
     if (typeof error === "string") return error;
     if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
       return error.message;
     }
     return String(error);
   }
   ```
2. **Validation Timing (`revalidateLogic` / `onBlur` + `onSubmit`)**:
   In `forklore-fe`, `SignInForm` and `SignUpForm` only pass `validators: { onSubmit: Schema.standardSchemaV1(SignInSchema) }`, meaning errors do not clear as the user edits a field until they click submit again (unless `onChange` is also set, which validates prematurely on the first keystroke).
   - **Best Practice**: Use `revalidateLogic({ mode: "submit", modeAfterSubmission: "change" })` from `@tanstack/react-form` with `validators: { onDynamic: Schema.standardSchemaV1(Schema) }`, **or** pair `onBlur: Schema.standardSchemaV1(Schema)` with `onSubmit: Schema.standardSchemaV1(Schema)`.
3. **Standard Schema Does Not Transform `onSubmit` `value`**:
   TanStack Form uses Standard Schema strictly to produce validation issues; `onSubmit({ value })` receives the raw form state (`I`), not the decoded `Output` (`A`) of a transforming schema (such as `Schema.Trim` or `Schema.NumberFromString`). If a form schema includes transformations or branded types (`Schema.brand`), run `Schema.decodeSync(MySchema)(value)` inside `onSubmit` (which is guaranteed to succeed after `onSubmit` validation passes).

---

### 4.2 Eliminating `<form.Field>` Boilerplate with `createFormHook` & `shadcn/ui`

In `forklore-fe`, `SignInForm` (`src/features/auth/ui/sign-in-form.tsx`, 150 lines) and `SignUpForm` (`src/features/auth/ui/sign-up-form.tsx`, 181 lines) repeat ~25 lines of `<form.Field>`, `<Label>`, `<Input>`, and `field.state.meta.errors.map(...)` per field, plus `<form.Subscribe>` for the submit button.

TanStack Form v1 solves this with **`createFormHookContexts`** and **`createFormHook`** (`@tanstack/react-form`), which provide context-bound, strictly typed `form.AppField` and `form.AppForm` components without prop drilling.

#### Step 1: Create Form Contexts & Reusable `shadcn/ui` Field Primitives (`src/shared/ui/form.tsx`)

```tsx
// src/shared/ui/form.tsx
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { cn } from "@/shared/lib/utils";
import { createFormHook, createFormHookContexts, useStore } from "@tanstack/react-form";
import type { ComponentProps, ReactNode } from "react";

export const {
  fieldContext,
  formContext,
  useFieldContext,
  useFormContext,
} = createFormHookContexts();

function formatError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return String(error);
}

export function FieldErrors({ className }: { className?: string }) {
  const field = useFieldContext<unknown>();
  const errors = useStore(field.store, (state) => state.meta.errors);

  if (!errors.length) return null;

  return (
    <div id={`${field.name}-error`} role="alert" className={cn("space-y-1", className)}>
      {errors.map((err) => {
        const message = formatError(err);
        return (
          <p key={message} className="text-xs font-medium text-destructive">
            {message}
          </p>
        );
      })}
    </div>
  );
}

export interface TextFieldProps extends Omit<ComponentProps<typeof Input>, "id" | "name" | "value" | "onChange" | "onBlur"> {
  label: string;
  description?: string;
}

export function TextField({ label, description, className, ...inputProps }: TextFieldProps) {
  const field = useFieldContext<string>();
  const errors = useStore(field.store, (state) => state.meta.errors);
  const hasError = errors.length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value ?? ""}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${field.name}-error` : description ? `${field.name}-desc` : undefined}
        className={className}
        {...inputProps}
      />
      {description && !hasError ? (
        <p id={`${field.name}-desc`} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
      <FieldErrors />
    </div>
  );
}

export interface CheckboxFieldProps {
  label: string;
  description?: string;
}

export function CheckboxField({ label, description }: CheckboxFieldProps) {
  const field = useFieldContext<boolean>();
  const errors = useStore(field.store, (state) => state.meta.errors);
  const hasError = errors.length > 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.name}
          checked={Boolean(field.state.value)}
          onCheckedChange={(checked) => field.handleChange(Boolean(checked))}
          onBlur={field.handleBlur}
          aria-invalid={hasError}
        />
        <Label htmlFor={field.name}>{label}</Label>
      </div>
      {description && !hasError ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      <FieldErrors />
    </div>
  );
}

export interface SubmitButtonProps extends ComponentProps<typeof Button> {
  pendingText?: ReactNode;
}

export function SubmitButton({
  children,
  pendingText = "Submitting...",
  disabled,
  ...props
}: SubmitButtonProps) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting] as const}>
      {([canSubmit, isSubmitting]) => (
        <Button type="submit" disabled={disabled || !canSubmit || isSubmitting} {...props}>
          {isSubmitting ? pendingText : children}
        </Button>
      )}
    </form.Subscribe>
  );
}

export const { useAppForm, withForm, withFieldGroup } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    CheckboxField,
    FieldErrors,
  },
  formComponents: {
    SubmitButton,
  },
});
```

#### Step 2: Refactored `SignInForm` Using `useAppForm` + `Schema.standardSchemaV1`

With `useAppForm`, `SignInForm` shrinks by over 50% while gaining automatic `aria-invalid` / `aria-describedby` accessibility attributes and compile-time field name/type safety:

```tsx
// src/features/auth/ui/sign-in-form.tsx
import { useAppForm } from "@/shared/ui/form";
import { revalidateLogic } from "@tanstack/react-form";
import { Schema } from "effect";
import { SignInSchema } from "../model/schemas";

export function SignInForm() {
  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onDynamic: Schema.standardSchemaV1(SignInSchema),
    },
    onSubmit: async ({ value }) => {
      const validated = Schema.decodeSync(SignInSchema)(value);
      // Submit via authClient.signIn.email(validated, ...)
    },
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.AppField name="email">
        {(field) => (
          <field.TextField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="chef@example.com"
          />
        )}
      </form.AppField>

      <form.AppField name="password">
        {(field) => (
          <field.TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
          />
        )}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton className="w-full" pendingText="Signing in...">
          Sign In
        </form.SubmitButton>
      </form.AppForm>
    </form>
  );
}
```

---

## 5. Summary of DX Gaps in `forklore-fe` & Concrete Recommendations for `tanstack-open-api`

| Area | Current State in `forklore-fe` | Recommended Standard for `tanstack-open-api` |
| :--- | :--- | :--- |
| **Router + Query Packages** | Installs both `@tanstack/react-router-ssr-query` and deprecated `@tanstack/react-router-with-query`; installs `@tanstack/router-plugin` in `dependencies`. | Keep only `@tanstack/react-router-ssr-query` (`>=1.167.0`) and `@tanstack/react-query` (`>=5.102.0`); remove `@tanstack/react-router-with-query` and redundant `@tanstack/router-plugin`. |
| **`QueryClientProvider` Wrapping** | Wrapped twice: automatically by `setupRouterSsrQueryIntegration` in `src/router.tsx` AND manually in `src/routes/__root.tsx`. | Remove manual `<QueryClientProvider>` from `src/routes/__root.tsx`; rely on `setupRouterSsrQueryIntegration`'s default `wrapQueryClient: true`. |
| **Router Preload Caching** | `createTanStackRouter` sets `defaultPreload: "intent"` without `defaultPreloadStaleTime: 0`. | Set `defaultPreloadStaleTime: 0` so TanStack Query (`queryClient`) is the sole authority for preload cache staleness. |
| **SSR vs Client Session Fetch** | `beforeLoad` calls `authClient.getSession()` directly, which lacks incoming `Cookie` headers during SSR and refetches on every client navigation. | Define `authSessionQueryOptions` (`staleTime: 5 min`) backed by `createIsomorphicFn` / `createServerFn` forwarding `getRequestHeader("cookie")` on the server (or configure SPA / `ssr: false` mode), and call `queryClient.ensureQueryData(authSessionQueryOptions)` in `beforeLoad`. |
| **Protected Route Layout** | Auth guard placed on leaf route `src/routes/_app/index.tsx`; no `src/routes/_app.tsx` layout route exists; user is not returned in route context. | Create pathless layout route `src/routes/_app.tsx` (`createFileRoute("/_app")`) that validates the session in `beforeLoad` and returns `{ user, session }` into context for all `/_app/*` child routes. |
| **Open Redirect Defense** | `src/routes/login.tsx` checks `search.redirect?.startsWith("/")`, which allows protocol-relative `//evil.com`. | Enforce `typeof url === "string" && url.startsWith("/") && !url.startsWith("//")` in `validateSearch`. |
| **Sign-Out / Sign-In State Sync** | `UserMenu` uses `location.reload()` on sign-out. | Update/invalidate `authSessionQueryOptions` in `QueryClient` + call `await router.invalidate()` and `navigate({ to: "/login" })`. |
| **Error & 404 Boundaries** | Missing `defaultErrorComponent`; unstyled `<div>Not Found</div>` for `defaultNotFoundComponent`. | Provide `defaultErrorComponent` (using `router.invalidate()` on Retry) and `defaultNotFoundComponent` on `createRouter`. |
| **Form Composition & Validation** | Raw `<form.Field>` + `<form.Subscribe>` repeated across `SignInForm` and `SignUpForm`; only validates `onSubmit`. | Export `useAppForm` via `createFormHook` + `createFormHookContexts` with `TextField`, `CheckboxField`, `FieldErrors`, and `SubmitButton` primitives; use `revalidateLogic()` + `Schema.standardSchemaV1(schema)`. |

---

## Primary Sources Cited

1. **TanStack Start Documentation & Bundled Skills (`@tanstack/react-start@1.168.49`, `@tanstack/start-client-core@1.170.27`, `@tanstack/start-plugin-core@1.171.39`)**:
   - `node_modules/@tanstack/react-start/skills/react-start/SKILL.md` (`TanStack/router:packages/react-start/src`, `docs/start/framework/react/build-from-scratch.md`)
   - `node_modules/@tanstack/start-client-core/skills/start-core/execution-model/SKILL.md` (`docs/start/framework/react/guide/execution-model.md`)
   - `node_modules/@tanstack/start-client-core/skills/start-core/deployment/SKILL.md` (`docs/start/framework/react/guide/selective-ssr.md`, `docs/start/framework/react/guide/hosting.md`)
   - `node_modules/@tanstack/start-client-core/skills/start-core/auth-server-primitives/SKILL.md` (`docs/start/framework/react/guide/authentication-overview.md`)
   - `node_modules/@tanstack/start-plugin-core/dist/esm/schema.d.ts` (`tanstackStartOptionsObjectSchema` — `spa`, `prerender`, `router`, `importProtection` options)
2. **TanStack Router & SSR Query Integration (`@tanstack/react-router@1.170.32`, `@tanstack/router-core@1.171.27`, `@tanstack/react-router-ssr-query@1.167.2`)**:
   - `node_modules/@tanstack/react-router-ssr-query/dist/esm/index.js` & `node_modules/@tanstack/router-ssr-query-core/dist/esm/index.js` (`setupRouterSsrQueryIntegration`, `wrapQueryClient`, `handleRedirects`)
   - `node_modules/@tanstack/router-core/skills/router-core/auth-and-guards/SKILL.md` (`docs/router/guide/authenticated-routes.md`, `docs/router/how-to/setup-authentication.md`)
   - `node_modules/@tanstack/router-core/skills/router-core/data-loading/SKILL.md` (`docs/router/guide/data-loading.md`, `docs/router/guide/router-context.md`)
   - `node_modules/@tanstack/router-core/skills/router-core/not-found-and-errors/SKILL.md` (`docs/router/guide/not-found-errors.md`)
3. **TanStack Form v1 & Effect Schema Standard Schema (`@tanstack/react-form@1.33.5`, `@tanstack/form-core@1.33.5`, `effect@3.13.0`)**:
   - `node_modules/@tanstack/react-form/dist/esm/createFormHook.d.ts` (`createFormHook`, `createFormHookContexts`, `useAppForm`, `withForm`, `withFieldGroup`)
   - `node_modules/@tanstack/form-core/dist/esm/standardSchemaValidator.d.ts` & `standardSchemaValidator.js` (`StandardSchemaV1`, `prefixSchemaToErrors`, `transformFormIssues`)
   - `node_modules/effect/dist/dts/Schema.d.ts` (`Schema.standardSchemaV1` specification)
   - [TanStack Form Composition Guide](https://tanstack.com/form/latest/docs/framework/react/guides/form-composition) & [Standard Schema Validation Guide](https://tanstack.com/form/latest/docs/framework/react/guides/validation)
4. **Better Auth (`better-auth@1.7.2`) & Reference Codebases**:
   - `node_modules/better-auth/dist/integrations/tanstack-start.d.mts` (`tanstackStartCookies`)
   - `hono-open-api/src/infra/auth/index.ts` (`createBetterAuth`, `defaultCookieAttributes`)
   - `forklore-fe/package.json`, `forklore-fe/vite.config.ts`, `forklore-fe/src/router.tsx`, `forklore-fe/src/routes/__root.tsx`, `forklore-fe/src/routes/_app/index.tsx`, `forklore-fe/src/routes/login.tsx`, `forklore-fe/src/features/auth/ui/sign-in-form.tsx`, `forklore-fe/src/features/auth/ui/sign-up-form.tsx`, `forklore-fe/src/features/auth/model/schemas.ts`
