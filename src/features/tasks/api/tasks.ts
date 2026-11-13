import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Schema } from "effect";
import { defineContract, type UseEffectQueryResult, useEffectQuery } from "@/shared/api/contracts";
import {
  deleteApiV1TasksId,
  getGetApiV1TasksLiveUrl,
  getGetApiV1TasksQueryKey,
  getGetApiV1TasksQueryOptions,
  patchApiV1TasksId,
  postApiV1Tasks,
} from "@/shared/api/generated/endpoints";
import type {
  GetApiV1Tasks200,
  GetApiV1TasksParams,
  PostApiV1Tasks201,
  PostApiV1TasksBody,
} from "@/shared/api/generated/models";
import {
  GetApiV1Tasks200Response,
  PatchApiV1TasksId200Response,
  PostApiV1Tasks201Response,
} from "@/shared/api/generated/schemas";
import { type UseLiveQueryResult, useLiveQuery } from "@/shared/lib/hooks/use-live-query";

export const listTasksContract = defineContract({
  operation: "GetApiV1Tasks",
  path: "/api/v1/tasks",
  dataSchema: GetApiV1Tasks200Response,
});

export const createTaskContract = defineContract({
  operation: "PostApiV1Tasks",
  path: "/api/v1/tasks",
  dataSchema: PostApiV1Tasks201Response,
});

export const updateTaskContract = defineContract({
  operation: "PatchApiV1TasksId",
  path: "/api/v1/tasks/:id",
  dataSchema: PatchApiV1TasksId200Response,
});

export const deleteTaskContract = defineContract({
  operation: "DeleteApiV1TasksId",
  path: "/api/v1/tasks/:id",
  dataSchema: Schema.Void,
});

export type TaskListResponse = Schema.Schema.Type<typeof GetApiV1Tasks200Response>;

export function useTasksQuery(
  params?: GetApiV1TasksParams,
): UseEffectQueryResult<TaskListResponse, unknown> {
  return useEffectQuery(getGetApiV1TasksQueryOptions(params), listTasksContract);
}

export function useTaskLiveQuery(
  params?: GetApiV1TasksParams,
): UseLiveQueryResult<TaskListResponse, unknown> {
  return useLiveQuery({
    queryOptions: getGetApiV1TasksQueryOptions(params),
    descriptor: listTasksContract,
    liveUrl: getGetApiV1TasksLiveUrl(params),
    mutationKey: ["tasks", "mutation"],
  });
}

export function useTaskMutation(params?: GetApiV1TasksParams) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationKey: ["tasks", "mutation", "create"],
    mutationFn: (data: PostApiV1TasksBody) => postApiV1Tasks(data),
    onMutate: async (newBody) => {
      await queryClient.cancelQueries({ queryKey: ["/api/v1/tasks"] });
      await queryClient.cancelQueries({ queryKey: getGetApiV1TasksQueryKey(params) });

      const previousQueries = queryClient.getQueriesData<GetApiV1Tasks200>({
        queryKey: ["/api/v1/tasks"],
      });

      const sessionData = queryClient.getQueryData<{ user?: { id?: string } }>(["auth", "session"]);
      const currentUserId = sessionData?.user?.id ?? "local-user";

      const optimisticTask = {
        id: `optimistic-${crypto.randomUUID()}`,
        name: newBody.name,
        done: Boolean(newBody.done),
        userId: currentUserId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueriesData<GetApiV1Tasks200>({ queryKey: ["/api/v1/tasks"] }, (old) => {
        if (!old) {
          return {
            data: [optimisticTask],
            meta: { nextCursor: null, hasMore: false },
          };
        }
        return {
          ...old,
          data: [optimisticTask, ...old.data],
        };
      });

      return { previousQueries, optimisticId: optimisticTask.id };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        for (const [qKey, data] of context.previousQueries) {
          queryClient.setQueryData(qKey, data);
        }
      }
    },
    onSuccess: (serverTask: PostApiV1Tasks201, _variables, context) => {
      if (context?.optimisticId) {
        queryClient.setQueriesData<GetApiV1Tasks200>({ queryKey: ["/api/v1/tasks"] }, (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) => (item.id === context.optimisticId ? serverTask : item)),
          };
        });
      }
    },
  });

  const toggleMutation = useMutation({
    mutationKey: ["tasks", "mutation", "toggle"],
    mutationFn: ({ id, done }: { id: string; done: boolean }) => patchApiV1TasksId(id, { done }),
    onMutate: async ({ id, done }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/v1/tasks"] });

      const previousQueries = queryClient.getQueriesData<GetApiV1Tasks200>({
        queryKey: ["/api/v1/tasks"],
      });

      queryClient.setQueriesData<GetApiV1Tasks200>({ queryKey: ["/api/v1/tasks"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((item) =>
            item.id === id ? { ...item, done, updatedAt: new Date().toISOString() } : item,
          ),
        };
      });

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        for (const [qKey, data] of context.previousQueries) {
          queryClient.setQueryData(qKey, data);
        }
      }
    },
  });

  const deleteMutation = useMutation({
    mutationKey: ["tasks", "mutation", "delete"],
    mutationFn: ({ id }: { id: string }) => deleteApiV1TasksId(id),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/v1/tasks"] });

      const previousQueries = queryClient.getQueriesData<GetApiV1Tasks200>({
        queryKey: ["/api/v1/tasks"],
      });

      queryClient.setQueriesData<GetApiV1Tasks200>({ queryKey: ["/api/v1/tasks"] }, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.filter((item) => item.id !== id),
        };
      });

      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousQueries) {
        for (const [qKey, data] of context.previousQueries) {
          queryClient.setQueryData(qKey, data);
        }
      }
    },
  });

  return {
    createTask: createMutation.mutate,
    createTaskAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    toggleTask: toggleMutation.mutate,
    toggleTaskAsync: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    deleteTask: deleteMutation.mutate,
    deleteTaskAsync: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
