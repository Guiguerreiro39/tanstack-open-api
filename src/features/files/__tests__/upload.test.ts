import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockXMLHttpRequest } from "@/test/mock-xml-http-request";
import { server } from "@/test/msw-server";
import { uploadDirectMultipart, uploadFile, uploadPresigned } from "../api/upload";
import type { FileRecord } from "../model/files";

const mockPendingFile: FileRecord = {
  id: "f-123",
  userId: "user-1",
  originalName: "test.txt",
  mimeType: "text/plain",
  sizeBytes: 1024,
  checksumSha256: null,
  status: "pending",
  expiresAt: null,
  createdAt: "2026-11-12T00:00:00Z",
  updatedAt: "2026-11-12T00:00:00Z",
};

const mockReadyFile: FileRecord = {
  ...mockPendingFile,
  status: "ready",
};

describe("Files Slice - Multi-Strategy Upload API", () => {
  beforeEach(() => {
    MockXMLHttpRequest.install();
  });

  afterEach(() => {
    MockXMLHttpRequest.restore();
    MockXMLHttpRequest.reset();
  });

  describe("uploadDirectMultipart", () => {
    it("uploads file via multipart POST with progress tracking and W3C headers", async () => {
      const file = new File(["sample content"], "sample.txt", { type: "text/plain" });
      const progressSpy = vi.fn();

      MockXMLHttpRequest.onSendHandler = (xhr) => {
        expect(xhr.method).toBe("POST");
        expect(xhr.url).toContain("/api/v1/files");
        expect(xhr.withCredentials).toBe(true);
        expect(xhr.requestHeaders["x-request-id"]).toMatch(/^req_/);
        expect(xhr.requestHeaders.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);

        // Simulate progress events
        xhr.simulateProgress(500, 1000);
        xhr.simulateProgress(1000, 1000);

        // Complete response
        xhr.simulateResponse(201, mockReadyFile, { "Content-Type": "application/json" });
      };

      const result = await uploadDirectMultipart(file, { onProgress: progressSpy });

      expect(result).toEqual(mockReadyFile);
      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 500,
        total: 1000,
        percentage: 50,
      });
      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 1000,
        total: 1000,
        percentage: 100,
      });
    });

    it("aborts direct multipart upload when AbortSignal triggers", async () => {
      const file = new File(["abort content"], "abort.txt", { type: "text/plain" });
      const controller = new AbortController();

      MockXMLHttpRequest.onSendHandler = () => {
        // Trigger abort while request is in flight
        controller.abort();
      };

      await expect(uploadDirectMultipart(file, { signal: controller.signal })).rejects.toThrow(
        /abort/i,
      );
    });

    it("rejects when server returns error response", async () => {
      const file = new File(["error"], "err.txt", { type: "text/plain" });

      MockXMLHttpRequest.onSendHandler = (xhr) => {
        xhr.simulateResponse(
          413,
          {
            error: {
              code: "PAYLOAD_TOO_LARGE",
              message: "File exceeds 10 MB limit",
            },
          },
          { "Content-Type": "application/json" },
        );
      };

      await expect(uploadDirectMultipart(file)).rejects.toThrow("File exceeds 10 MB limit");
    });
  });

  describe("uploadPresigned (3-step lifecycle)", () => {
    it("completes 3-step presigned upload: presign -> PUT to storage URL -> complete", async () => {
      const file = new File(["presigned content"], "large.zip", { type: "application/zip" });
      const progressSpy = vi.fn();
      let presignCalled = false;
      let completeCalled = false;

      server.use(
        http.post("/api/v1/files/presign", async ({ request }) => {
          presignCalled = true;
          const body = (await request.json()) as {
            originalName: string;
            sizeBytes: number;
            mimeType: string;
          };
          expect(body.originalName).toBe("large.zip");
          return HttpResponse.json({
            file: mockPendingFile,
            uploadUrl: "https://storage.example.com/uploads/f-123",
          });
        }),
        http.post("/api/v1/files/f-123/complete", () => {
          completeCalled = true;
          return HttpResponse.json(mockReadyFile);
        }),
      );

      MockXMLHttpRequest.onSendHandler = (xhr) => {
        // Step 2 is the PUT to presigned uploadUrl
        expect(xhr.method).toBe("PUT");
        expect(xhr.url).toBe("https://storage.example.com/uploads/f-123");
        // ADR-0007: withCredentials = false for direct storage upload
        expect(xhr.withCredentials).toBe(false);
        expect(xhr.requestHeaders["content-type"]).toBe("application/zip");

        xhr.simulateProgress(500, 1000);
        xhr.simulateProgress(1000, 1000);
        xhr.simulateResponse(200);
      };

      const result = await uploadPresigned(file, { onProgress: progressSpy });

      expect(presignCalled).toBe(true);
      expect(completeCalled).toBe(true);
      expect(result).toEqual(mockReadyFile);
      expect(progressSpy).toHaveBeenCalledWith({
        loaded: 500,
        total: 1000,
        percentage: 50,
      });
    });

    it("aborts presigned upload when AbortSignal triggers during PUT", async () => {
      const file = new File(["cancel"], "cancel.bin", { type: "application/octet-stream" });
      const controller = new AbortController();

      server.use(
        http.post("/api/v1/files/presign", () => {
          return HttpResponse.json({
            file: mockPendingFile,
            uploadUrl: "https://storage.example.com/uploads/f-123",
          });
        }),
      );

      MockXMLHttpRequest.onSendHandler = () => {
        controller.abort();
      };

      await expect(uploadPresigned(file, { signal: controller.signal })).rejects.toThrow(/abort/i);
    });
  });

  describe("uploadFile unified dispatcher", () => {
    it("routes to direct strategy when strategy='direct'", async () => {
      const file = new File(["direct"], "direct.txt", { type: "text/plain" });

      MockXMLHttpRequest.onSendHandler = (xhr) => {
        expect(xhr.method).toBe("POST");
        xhr.simulateResponse(201, mockReadyFile, { "Content-Type": "application/json" });
      };

      const result = await uploadFile(file, { strategy: "direct" });
      expect(result).toEqual(mockReadyFile);
    });

    it("routes to presigned strategy when strategy='presigned'", async () => {
      const file = new File(["presigned"], "test.bin", { type: "application/octet-stream" });

      server.use(
        http.post("/api/v1/files/presign", () => {
          return HttpResponse.json({
            file: mockPendingFile,
            uploadUrl: "https://storage.example.com/uploads/f-123",
          });
        }),
        http.post("/api/v1/files/f-123/complete", () => {
          return HttpResponse.json(mockReadyFile);
        }),
      );

      MockXMLHttpRequest.onSendHandler = (xhr) => {
        expect(xhr.method).toBe("PUT");
        xhr.simulateResponse(200);
      };

      const result = await uploadFile(file, { strategy: "presigned" });
      expect(result).toEqual(mockReadyFile);
    });
  });
});
