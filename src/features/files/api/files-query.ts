import {
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseMutationOptions,
  type UseQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { deleteApiV1FilesId, getApiV1Files } from "@/shared/api/generated/endpoints";
import type { GetApiV1Files200 } from "@/shared/api/generated/models/getApiV1Files200";
import type { GetApiV1FilesParams } from "@/shared/api/generated/models/getApiV1FilesParams";

export const filesQueryKeys = {
  all: ["files"] as const,
  lists: () => [...filesQueryKeys.all, "list"] as const,
  list: (params?: GetApiV1FilesParams) => [...filesQueryKeys.lists(), params] as const,
  detail: (id: string) => [...filesQueryKeys.all, "detail", id] as const,
};

export function useFilesQuery(
  params?: GetApiV1FilesParams,
  options?: Omit<UseQueryOptions<GetApiV1Files200>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: filesQueryKeys.list(params),
    queryFn: () => getApiV1Files(params),
    ...options,
  });
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

export function useDeleteFileMutation(options?: UseMutationOptions<void, Error, string>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApiV1FilesId(id),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      options?.onSuccess?.(...args);
    },
    ...options,
  });
}
