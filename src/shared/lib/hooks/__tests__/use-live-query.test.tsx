import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { Schema } from "effect";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineContract, SchemaDecodeError } from "@/shared/api/contracts";
import { MockEventSource } from "@/test/mock-event-source";
import { useLiveQuery } from "../use-live-query";

function TestWrapper({ client, children }: { client: QueryClient; children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useLiveQuery hook", () => {
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    MockEventSource.reset();
    // @ts-expect-error Mocking global EventSource with MockEventSource
    globalThis.EventSource = MockEventSource;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    MockEventSource.reset();
  });

  const TaskItemSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    done: Schema.Boolean,
  });

  const TaskListSchema = Schema.Struct({
    data: Schema.Array(TaskItemSchema),
    meta: Schema.Struct({
      nextCursor: Schema.NullOr(Schema.String),
      hasMore: Schema.Boolean,
    }),
  });

  const tasksContract = defineContract({
    path: "/api/v1/tasks",
    dataSchema: TaskListSchema,
  });

  it("connects to SSE with credentials and without token query params, updating data on init event", async () => {
    const queryClient = new QueryClient();
    const liveUrl = "/api/v1/tasks/live";

    const { result } = renderHook(
      () =>
        useLiveQuery({
          queryOptions: {
            queryKey: ["tasks", "list"],
            queryFn: async () => ({
              data: [],
              meta: { nextCursor: null, hasMore: false },
            }),
          },
          descriptor: tasksContract,
          liveUrl,
        }),
      { wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper> },
    );

    expect(result.current.liveStatus).toBe("connecting");

    const instance = MockEventSource.instances.get("/api/v1/tasks/live");
    expect(instance).toBeDefined();
    expect(instance?.withCredentials).toBe(true);
    expect(instance?.url).toBe("/api/v1/tasks/live");
    expect(instance?.url).not.toContain("?token=");

    const initialSnapshot = {
      data: [{ id: "t1", name: "Initial task", done: false }],
      meta: { nextCursor: null, hasMore: false },
    };

    act(() => {
      instance?.emit("init", initialSnapshot);
    });

    expect(result.current.liveStatus).toBe("connected");
    expect(queryClient.getQueryData(["tasks", "list"])).toEqual(initialSnapshot);
  });

  it("updates query data on SSE update event", async () => {
    const queryClient = new QueryClient();
    const liveUrl = "/api/v1/tasks/live";

    const { result } = renderHook(
      () =>
        useLiveQuery({
          queryOptions: {
            queryKey: ["tasks", "list"],
            queryFn: async () => ({
              data: [],
              meta: { nextCursor: null, hasMore: false },
            }),
          },
          descriptor: tasksContract,
          liveUrl,
        }),
      { wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper> },
    );

    const instance = MockEventSource.instances.get("/api/v1/tasks/live");

    const updatedSnapshot = {
      data: [
        { id: "t1", name: "Task 1", done: false },
        { id: "t2", name: "Task 2", done: true },
      ],
      meta: { nextCursor: null, hasMore: false },
    };

    act(() => {
      instance?.emit("update", updatedSnapshot);
    });

    expect(result.current.liveStatus).toBe("connected");
    expect(queryClient.getQueryData(["tasks", "list"])).toEqual(updatedSnapshot);
  });

  it("buffers incoming SSE updates while mutationKey ['tasks', 'mutation'] is in flight, and flushes on settle", async () => {
    const queryClient = new QueryClient();
    const liveUrl = "/api/v1/tasks/live";

    // Set initial data
    const initialSnapshot = {
      data: [{ id: "t1", name: "Task 1", done: false }],
      meta: { nextCursor: null, hasMore: false },
    };
    queryClient.setQueryData(["tasks", "list"], initialSnapshot);

    renderHook(
      () =>
        useLiveQuery({
          queryOptions: {
            queryKey: ["tasks", "list"],
            queryFn: async () => initialSnapshot,
          },
          descriptor: tasksContract,
          liveUrl,
          mutationKey: ["tasks", "mutation"],
        }),
      { wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper> },
    );

    const instance = MockEventSource.instances.get("/api/v1/tasks/live");

    // Simulate an in-flight mutation under ["tasks", "mutation"]
    let finishMutation: () => void = () => {};
    const mutationPromise = new Promise<void>((resolve) => {
      finishMutation = resolve;
    });

    const mutationObserver = queryClient.getMutationCache().build(queryClient, {
      mutationKey: ["tasks", "mutation"],
      mutationFn: () => mutationPromise,
    });

    void mutationObserver.execute(undefined);

    // Verify mutation is active
    expect(queryClient.isMutating({ mutationKey: ["tasks", "mutation"] })).toBe(1);

    // Apply an optimistic update directly to TanStack Query cache
    const optimisticSnapshot = {
      data: [
        { id: "t1", name: "Task 1", done: false },
        { id: "optimistic-1", name: "Optimistic new task", done: false },
      ],
      meta: { nextCursor: null, hasMore: false },
    };
    queryClient.setQueryData(["tasks", "list"], optimisticSnapshot);

    // While mutation is in flight, an SSE update arrives from server
    const serverSnapshot = {
      data: [
        { id: "t1", name: "Task 1", done: false },
        { id: "server-real-id", name: "Optimistic new task", done: false },
      ],
      meta: { nextCursor: null, hasMore: false },
    };

    act(() => {
      instance?.emit("update", serverSnapshot);
    });

    // Mutation is still in flight -> TanStack Query cache must NOT be clobbered yet!
    expect(queryClient.getQueryData(["tasks", "list"])).toEqual(optimisticSnapshot);

    // Settle mutation
    await act(async () => {
      finishMutation();
      await mutationPromise;
    });

    // Now mutations are 0 -> buffered serverSnapshot must be flushed!
    expect(queryClient.isMutating({ mutationKey: ["tasks", "mutation"] })).toBe(0);
    expect(queryClient.getQueryData(["tasks", "list"])).toEqual(serverSnapshot);
  });

  it("handles event: ping and updates lastPingAt", () => {
    const queryClient = new QueryClient();
    const liveUrl = "/api/v1/tasks/live";

    const { result } = renderHook(
      () =>
        useLiveQuery({
          queryOptions: {
            queryKey: ["tasks", "list"],
            queryFn: async () => ({
              data: [],
              meta: { nextCursor: null, hasMore: false },
            }),
          },
          descriptor: tasksContract,
          liveUrl,
        }),
      { wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper> },
    );

    const instance = MockEventSource.instances.get("/api/v1/tasks/live");
    const pingTime = 1762974000000;

    act(() => {
      instance?.emit("ping", { timestamp: pingTime });
    });

    expect(result.current.lastPingAt).toBe(pingTime);
    expect(result.current.liveStatus).toBe("connected");
  });

  it("handles malformed snapshot with SchemaDecodeError and does not corrupt cache", () => {
    const queryClient = new QueryClient();
    const liveUrl = "/api/v1/tasks/live";
    const onStreamError = vi.fn();

    const validData = {
      data: [{ id: "t1", name: "Valid", done: true }],
      meta: { nextCursor: null, hasMore: false },
    };
    queryClient.setQueryData(["tasks", "list"], validData);

    const { result } = renderHook(
      () =>
        useLiveQuery({
          queryOptions: {
            queryKey: ["tasks", "list"],
            queryFn: async () => validData,
          },
          descriptor: tasksContract,
          liveUrl,
          onStreamError,
        }),
      { wrapper: ({ children }) => <TestWrapper client={queryClient}>{children}</TestWrapper> },
    );

    const instance = MockEventSource.instances.get("/api/v1/tasks/live");

    // Emit invalid payload (missing id and meta)
    act(() => {
      instance?.emit("update", { corrupted: true });
    });

    expect(result.current.streamError).toBeInstanceOf(SchemaDecodeError);
    expect(onStreamError).toHaveBeenCalledWith(expect.any(SchemaDecodeError));
    // Cache remains unchanged
    expect(queryClient.getQueryData(["tasks", "list"])).toEqual(validData);
  });
});
