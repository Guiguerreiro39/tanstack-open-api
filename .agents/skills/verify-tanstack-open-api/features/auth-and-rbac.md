# Verification Flow: Authentication & RBAC (`auth-and-rbac`)

This verification guide validates Better Auth credential flows, isomorphic SSR header forwarding, session caching, pathless route guards, and fine-grained Role-Based Access Control (`<Can />`).

---

## Prerequisites

- Frontend server running at `http://localhost:3000`.
- Upstream backend running at `http://localhost:9999` (or mocked via MSW).

---

## Verification Steps

### 1. Pathless Route Guard Redirection

1. In a clean/incognito browser session without cookies, attempt to navigate to a protected route:

   ```text
   http://localhost:3000/tasks
   ```
2. **Assertion**: TanStack Router's `beforeLoad` guard in `src/routes/_app.tsx` intercepts the navigation and redirects to:

   ```text
   http://localhost:3000/login?redirect=%2Ftasks
   ```
3. **Assertion**: The login form displays with email and password fields.

### 2. User Authentication & SSR Header Forwarding

1. Enter valid user credentials (e.g. `member@example.com` / `password123`) and submit the form.
2. Observe network activity:
   - Request sent to `/api/auth/sign-in/email`.
   - Response sets `Set-Cookie` with session token.
3. **Assertion**: User is redirected to `/tasks` (or the URL specified in `redirect` search parameter).
4. Perform a hard browser refresh on `/tasks`:
   - Inspect server-side log or SSR response.
   - **Assertion**: Server-side request forwards the incoming browser `cookie` to the internal API via `authSessionQueryOptions` and TanStack Start's `createIsomorphicFn`.
   - **Assertion**: HTML is rendered server-side with authenticated user details in the header, without client-side redirect flash.

### 3. Session Caching

1. Navigate between authenticated tabs (`/tasks` and `/files`).
2. Observe network traffic:
   - **Assertion**: No redundant `/api/auth/get-session` calls occur because `authSessionQueryOptions` caches session state in TanStack Query with standard stale-time policies.

### 4. RBAC & Declarative `<Can />` Authorization

1. **Member Role Verification**:
   - Log in as a standard member (`member@example.com`).
   - Navigate to `/tasks`.
   - **Assertion**: Tasks owned by the user show action buttons (`Edit`, `Delete`).
   - Tasks owned by another user do not show the delete button (governed by `<Can I="delete" a="task" this={task}>`).
2. **Admin Role Verification**:
   - Log in as an administrator (`admin@example.com`).
   - Navigate to `/tasks`.
   - **Assertion**: Administrator can view and delete all tasks regardless of ownership, matching role `:any` permissions in `src/shared/lib/rbac.ts`.

### 5. Error Taxonomy: 401 vs 403 Discipline

1. **401 Unauthorized**:
   - Manually clear the session cookie or trigger an expired session error.
   - Attempt any protected query or mutation.
   - **Assertion**: Session cache resets and application immediately redirects to `/login`.
2. **403 Forbidden**:
   - Trigger a mutation or action for which the user lacks permissions.
   - **Assertion**: Application does **not** redirect to login; instead, it renders an in-place permission refusal or toast alert explaining that access was forbidden.
