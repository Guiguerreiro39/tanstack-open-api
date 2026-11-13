import {
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Schema } from "effect";
import {
  type AnyApiError,
  defineContract,
  type OperationErrorStatuses,
  type StatusToEffectError,
  type UseEffectMutationResult,
  type UseEffectQueryResult,
  useEffectMutation,
  useEffectQuery,
} from "@/shared/api/contracts";
import {
  deleteApiV1FilesId,
  type GetApiV1FilesQueryError,
  getApiV1Files,
  getGetApiV1FilesQueryKey,
  getGetApiV1FilesQueryOptions,
} from "@/shared/api/generated/endpoints";
import type { GetApiV1Files200, GetApiV1FilesParams } from "@/shared/api/generated/models";
import { GetApiV1Files200Response } from "@/shared/api/generated/schemas";

export const listFilesContract = defineContract({
  operation: "GetApiV1Files",
  path: "/api/v1/files",
  dataSchema: GetApiV1Files200Response,
});

export const deleteFileContract = defineContract({
  operation: "DeleteApiV1FilesId",
  path: "/api/v1/files/:id",
  dataSchema: Schema.Void,
});

export type FileListResponse = Schema.Schema.Type<typeof GetApiV1Files200Response>;

export const filesQueryKeys = {
  all: ["/api/v1/files"] as const,
  lists: () => [...filesQueryKeys.all] as const,
  list: (params?: GetApiV1FilesParams) => getGetApiV1FilesQueryKey(params),
  detail: (id: string) => [...filesQueryKeys.all, id] as const,
};

export function useFilesQuery(
  params?: GetApiV1FilesParams,
  options?: {
    query?: Partial<UseQueryOptions<GetApiV1Files200, GetApiV1FilesQueryError, GetApiV1Files200>>;
  },
): UseEffectQueryResult<
  FileListResponse,
  StatusToEffectError<OperationErrorStatuses<"GetApiV1Files">>
> {
  return useEffectQuery(
    getGetApiV1FilesQueryOptions<GetApiV1Files200, GetApiV1FilesQueryError>(params, options),
    listFilesContract,
  );
}

export function useFilesInfiniteQuery(
  params?: Omit<GetApiV1FilesParams, "cursor">,
  options?: Omit<
    UseInfiniteQueryOptions<
      GetApiV1Files200,
      Error,
      InfiniteData<GetApiV1Files200>,
      readonly unknown[],
      string | undefined
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >,
) {
  return useInfiniteQuery({
    queryKey: filesQueryKeys.list(params),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      getApiV1Files({
        ...params,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage?.meta?.hasMore && lastPage.meta.nextCursor) {
        return lastPage.meta.nextCursor;
      }
      return undefined;
    },
    ...options,
  });
}

export function useDeleteFileMutation<TContext = unknown>(
  options?: UseMutationOptions<void, Error | AnyApiError, string, TContext>,
): UseEffectMutationResult<
  void,
  StatusToEffectError<OperationErrorStatuses<"DeleteApiV1FilesId">>,
  string,
  TContext
> {
  const queryClient = useQueryClient();

  return useEffectMutation(
    {
      mutationKey: ["files", "mutation", "delete"],
      mutationFn: (id: string) => deleteApiV1FilesId(id),
      ...options,
      onSuccess: (...args) => {
        queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
        queryClient.invalidateQueries({ queryKey: ["/api/v1/files"] });
        options?.onSuccess?.(...args);
      },
    },
    deleteFileContract,
  );
}
