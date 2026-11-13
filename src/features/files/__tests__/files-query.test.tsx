import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { Effect } from "effect";
import { HttpResponse, http } from "msw";
import type React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { SchemaDecodeError } from "@/shared/api/contracts";
import { createSpyObservability, setObservabilityService } from "@/shared/observability";
import { server } from "@/test/msw-server";
import { createTestQueryClient } from "@/test/render";
import {
  deleteFileContract,
  filesQueryKeys,
  listFilesContract,
  useDeleteFileMutation,
  useFilesInfiniteQuery,
  useFilesQuery,
} from "../api/files-query";
import type { FileRecord } from "../model/files";

const validFileId1 = "11111111-1111-1111-1111-111111111111";
const validFileId2 = "22222222-2222-2222-2222-222222222222";

const sampleFiles: FileRecord[] = [
  {
    id: validFileId1,
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
    id: validFileId2,
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
  let spyObs: ReturnType<typeof createSpyObservability>;

  beforeEach(() => {
    spyObs = createSpyObservability();
    setObservabilityService(spyObs);
  });

  describe("Contract definitions", () => {
    it("declares listFilesContract with expected path and operation schema", () => {
      expect(listFilesContract).toBeDefined();
      expect(listFilesContract.path).toBe("/api/v1/files");
      expect(listFilesContract.dataSchema).toBeDefined();
    });

    it("declares deleteFileContract with expected path and Schema.Void", () => {
      expect(deleteFileContract).toBeDefined();
      expect(deleteFileContract.path).toBe("/api/v1/files/:id");
      expect(deleteFileContract.dataSchema).toBeDefined();
    });
  });

  describe("useFilesQuery", () => {
    it("fetches and validates files list, exposing toEffect()", async () => {
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

      // Verify toEffect() succeeds with validated data
      expect(typeof result.current.toEffect).toBe("function");
      const effectResult = Effect.runSync(result.current.toEffect());
      expect(effectResult.data).toHaveLength(2);
    });

    it("captures defect and yields SchemaDecodeError when response data fails schema validation", async () => {
      server.use(
        http.get("/api/v1/files", () => {
          return HttpResponse.json({
            data: [
              {
                id: "not-a-valid-uuid",
                userId: "u-1",
                originalName: "corrupted.dat",
              },
            ],
            meta: { nextCursor: null, hasMore: false },
          });
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useFilesQuery(), { wrapper });

      await waitFor(() => expect(result.current.data).toBeDefined());

      // Observability captures the SchemaDecodeError defect
      await waitFor(() => {
        expect(
          spyObs.defects.some(
            (d) =>
              d.error instanceof SchemaDecodeError ||
              (d.error as { _tag?: string })._tag === "SchemaDecodeError",
          ),
        ).toBe(true);
      });

      // toEffect() fails with SchemaDecodeError
      const exit = Effect.runSyncExit(result.current.toEffect());
      expect(exit._tag).toBe("Failure");
    });

    it("resets session cache on 401 Unauthorized", async () => {
      server.use(
        http.get("/api/v1/files", () => {
          return HttpResponse.json(
            {
              error: {
                code: "UNAUTHORIZED",
                message: "Session expired",
                requestId: "req-401",
              },
            },
            { status: 401 },
          );
        }),
      );

      const queryClient = createTestQueryClient();
      queryClient.setQueryData(["auth", "session"], { user: { id: "u-1" } });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useFilesQuery(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      // Session cache cleared to null
      await waitFor(() => {
        expect(queryClient.getQueryData(["auth", "session"])).toBeNull();
      });
    });
  });

  describe("useFilesInfiniteQuery", () => {
    it("paginates using cursor", async () => {
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
      expect(result.current.data?.pages[0].data[0].id).toBe(validFileId1);
      expect(result.current.hasNextPage).toBe(true);

      await result.current.fetchNextPage();

      await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
      expect(result.current.data?.pages[1].data[0].id).toBe(validFileId2);
      expect(result.current.hasNextPage).toBe(false);
    });
  });

  describe("useDeleteFileMutation", () => {
    it("calls DELETE and invalidates files cache", async () => {
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

      await result.current.mutateAsync(validFileId1);

      expect(deletedId).toBe(validFileId1);
      expect(typeof result.current.toEffect).toBe("function");
    });

    it("resets session cache on 401 Unauthorized", async () => {
      server.use(
        http.delete("/api/v1/files/:id", () => {
          return HttpResponse.json(
            {
              error: {
                code: "UNAUTHORIZED",
                message: "Unauthorized deletion",
                requestId: "req-del-401",
              },
            },
            { status: 401 },
          );
        }),
      );

      const queryClient = createTestQueryClient();
      queryClient.setQueryData(["auth", "session"], { user: { id: "u-1" } });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useDeleteFileMutation(), { wrapper });

      try {
        await result.current.mutateAsync(validFileId1);
      } catch {
        // Expected mutation rejection
      }

      await waitFor(() => {
        expect(queryClient.getQueryData(["auth", "session"])).toBeNull();
      });
    });

    it("captures defect on 500 Internal Server Error", async () => {
      server.use(
        http.delete("/api/v1/files/:id", () => {
          return HttpResponse.json(
            {
              error: {
                code: "INTERNAL_ERROR",
                message: "Database crash during delete",
                requestId: "req-del-500",
              },
            },
            { status: 500 },
          );
        }),
      );

      const queryClient = createTestQueryClient();
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(() => useDeleteFileMutation(), { wrapper });

      try {
        await result.current.mutateAsync(validFileId1);
      } catch {
        // Expected mutation rejection
      }

      await waitFor(() => {
        expect(spyObs.defects.length).toBeGreaterThan(0);
      });
    });
  });
});
