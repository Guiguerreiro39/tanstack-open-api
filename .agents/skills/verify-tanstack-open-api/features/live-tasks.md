# Verification Flow: Live Tasks & Realtime SSE (`live-tasks`)

This verification guide validates real-time Server-Sent Events (SSE) synchronization via `useLiveQuery`, optimistic UI mutations, and mutation buffering on `/tasks`.

---

## Prerequisites

- Frontend running at `http://localhost:3000`.
- Authenticated session established (logged in as `member@example.com`).

---

## Verification Steps

### 1. Navigation & Initial SSE Connection

1. Navigate to `http://localhost:3000/tasks`.
2. Inspect the Network tab in DevTools:
   - Filter by EventStream / Fetch:
   - **Assertion**: An active connection to `/api/v1/tasks/live` is established with status 200 and `Content-Type: text/event-stream`.
   - **Assertion**: The connection uses credentials (`withCredentials: true` or forwarded Bearer authorization).
3. **Live Indicator**:
   - Locate the live connection status badge in the task list header.
   - **Assertion**: Status indicator displays "Connected" (or green pulse).

### 2. Task Creation & Optimistic Rendering

1. Fill out the "Create Task" form with a title (e.g. `"Test Verification Task"`) and optional description.
2. Click "Add Task".
3. **Assertion**:
   - The task appears immediately in the task list with an optimistic state.
   - A POST request is sent to `/api/v1/tasks`.
   - Upon HTTP 201 response, the optimistic task is replaced with the server-assigned task ID.

### 3. Realtime SSE Synchronization

1. Open a second browser tab (or split window) navigating to `http://localhost:3000/tasks`.
2. In Tab A, create a new task: `"Collaborative SSE Task"`.
3. Observe Tab B:
   - **Assertion**: Without user refresh or polling, Tab B receives an SSE `update` event and renders `"Collaborative SSE Task"` automatically.

### 4. Optimistic Mutation Buffering (`["tasks", "mutation"]`)

1. In Tab A, click the checkbox to complete a task.
2. **Assertion**:
   - The checkbox toggles immediately in the UI (optimistic update).
   - An in-flight mutation is registered with TanStack Query under key `["tasks", "mutation"]`.
3. While the mutation is in flight, simulate an incoming SSE snapshot or trigger a concurrent event:
   - **Assertion**: `useLiveQuery` detects `isMutating > 0` and buffers incoming SSE updates in memory.
   - The checkbox state does **not** jitter or revert during the pending mutation.
   - Once the mutation settles, any buffered updates are reconciled cleanly into the cache.

### 5. Optimistic Rollback on Server Failure

1. Simulate a network failure or 500 error on task update (e.g., disconnecting network or mocking an endpoint error).
2. Toggle a task status.
3. **Assertion**:
   - The task toggles immediately in the UI.
   - Upon receiving the failure response, TanStack Query catches the error and rolls back the task to its previous state.
   - A descriptive error toast is displayed to the user.
