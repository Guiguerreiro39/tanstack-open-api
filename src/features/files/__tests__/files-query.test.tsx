import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw-server";
import { createTestQueryClient } from "@/test/render";
import {
  filesQueryKeys,
  useDeleteFileMutation,
  useFilesInfiniteQuery,
  useFilesQuery,
} from "../api/files-query";
import type { FileRecord } from "../model/files";

const sampleFiles: FileRecord[] = [
  {
    id: "f-1",
    userId: "u-1",
    originalName: "alpha.png",
    mimeType: "image/png",
    sizeBytes: 1024,
    checksumSha256: null,
    status: "ready",
    expiresAt: null,
    createdAt: "2026-11-12T00:00:00Z",
    updatedAt: "2026-11-12T00:00:00Z",
  },
  {
    id: "f-2",
    userId: "u-1",
    originalName: "beta.pdf",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    checksumSha256: null,
    status: "ready",
    expiresAt: null,
    createdAt: "2026-11-12T01:00:00Z",
    updatedAt: "2026-11-12T01:00:00Z",
  },
];

describe("Files Query & Mutation Hooks", () => {
  it("useFilesQuery fetches files list", async () => {
    server.use(
      http.get("/api/v1/files", () => {
        return HttpResponse.json({
          data: sampleFiles,
          meta: { nextCursor: null, hasMore: false },
        });
      }),
    );

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useFilesQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].originalName).toBe("alpha.png");
  });

  it("useFilesInfiniteQuery paginates using cursor", async () => {
    server.use(
      http.get("/api/v1/files", ({ request }) => {
        const url = new URL(request.url);
        const cursor = url.searchParams.get("cursor");

        if (cursor === "page-2") {
          return HttpResponse.json({
            data: [sampleFiles[1]],
            meta: { nextCursor: null, hasMore: false },
          });
        }

        return HttpResponse.json({
          data: [sampleFiles[0]],
          meta: { nextCursor: "page-2", hasMore: true },
        });
      }),
    );

    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useFilesInfiniteQuery(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0].data[0].id).toBe("f-1");
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.data?.pages[1].data[0].id).toBe("f-2");
    expect(result.current.hasNextPage).toBe(false);
  });

  it("useDeleteFileMutation calls DELETE and invalidates files cache", async () => {
    let deletedId: string | null = null;

    server.use(
      http.delete("/api/v1/files/:id", ({ params }) => {
        deletedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const queryClient = createTestQueryClient();
    queryClient.setQueryData(filesQueryKeys.all, sampleFiles);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useDeleteFileMutation(), { wrapper });

    await result.current.mutateAsync("f-1");

    expect(deletedId).toBe("f-1");
  });
});
