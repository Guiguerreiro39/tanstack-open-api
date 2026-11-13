import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { Schema } from "effect";
import type React from "react";
import { describe, expect, it } from "vitest";
import { defineContract } from "@/shared/api/contracts";
import { useLiveQuery } from "@/shared/lib/hooks/use-live-query";
import { MockEventSource } from "@/test/mock-event-source";

describe("Adversary 1: useLiveQuery mutation buffer clobbers newly created task on settle", () => {
  it("wipes out newly created task when an SSE update from concurrent activity arrives while mutation is in-flight", async () => {
    MockEventSource.reset();
    // @ts-expect-error Mocking global EventSource
    globalThis.EventSource = MockEventSource;

    const queryClient = new QueryClient();
    const liveUrl = "/api/v1/tasks/live";

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

    const initialData = {
      data: [{ id: "t1", name: "Task 1", done: false }],
      meta: { nextCursor: null, hasMore: false },
    };
    queryClient.setQueryData(["/api/v1/tasks"], initialData);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useLiveQuery({
          queryOptions: {
            queryKey: ["/api/v1/tasks"],
            queryFn: async () => initialData,
          },
          descriptor: tasksContract,
          liveUrl,
          mutationKey: ["tasks", "mutation"],
        }),
      { wrapper },
    );

    const instance = MockEventSource.instances.get("/api/v1/tasks/live");
    expect(instance).toBeDefined();

    // Now start a create task mutation (like in useTaskMutation)
    let resolvePost: (data: unknown) => void = () => {};
    const postPromise = new Promise((res) => {
      resolvePost = res;
    });

    const { result: mutationResult } = renderHook(
      () =>
        useMutation({
          mutationKey: ["tasks", "mutation", "create"],
          mutationFn: () => postPromise,
          onMutate: () => {
            const optimistic = {
              data: [
                { id: "optimistic-new", name: "My New Task", done: false },
                ...initialData.data,
              ],
              meta: { nextCursor: null, hasMore: false },
            };
            queryClient.setQueryData(["/api/v1/tasks"], optimistic);
          },
          onSuccess: (serverTask: unknown) => {
            queryClient.setQueriesData({ queryKey: ["/api/v1/tasks"] }, (old: unknown) => {
              const current = old as typeof initialData | undefined;
              if (!current) return current;
              return {
                ...current,
                data: current.data.map((item) =>
                  item.id === "optimistic-new"
                    ? (serverTask as (typeof initialData.data)[0])
                    : item,
                ),
              };
            });
          },
        }),
      { wrapper },
    );

    // Trigger mutation: status becomes pending, activeMutations = 1
    act(() => {
      mutationResult.current.mutate();
    });

    expect(queryClient.isMutating({ mutationKey: ["tasks", "mutation"] })).toBe(1);

    // While mutation is in flight, another client deletes a task or updates something,
    // causing an SSE update to arrive. This snapshot does NOT know about "My New Task" yet.
    const concurrentSseSnapshot = {
      data: [{ id: "t1", name: "Task 1 (renamed by peer)", done: false }],
      meta: { nextCursor: null, hasMore: false },
    };

    act(() => {
      instance?.emit("update", concurrentSseSnapshot);
    });

    // The mutation succeeds with the newly created server task
    const realServerTask = { id: "real-server-id", name: "My New Task", done: false };
    await act(async () => {
      resolvePost(realServerTask);
      await postPromise;
    });

    // Both the mutation is settled and buffered SSE flush occurred.
    // Intent: The user's newly created task MUST NOT disappear from the tasks cache!
    const finalCache = queryClient.getQueryData<typeof initialData>(["/api/v1/tasks"]);
    const hasNewTask = finalCache?.data?.some(
      (t: (typeof initialData.data)[0]) => t.id === "real-server-id",
    );
    expect(hasNewTask).toBe(true);
  });
});
