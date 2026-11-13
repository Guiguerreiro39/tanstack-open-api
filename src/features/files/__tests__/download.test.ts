import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { server } from "@/test/msw-server";
import { downloadFileDirect, downloadFilePresigned } from "../api/download";

describe("Files Slice - Download API", () => {
  let createdObjectUrls: string[] = [];
  let revokedObjectUrls: string[] = [];
  let clickedAnchors: Array<{ href: string; download?: string; target?: string }> = [];

  beforeEach(() => {
    createdObjectUrls = [];
    revokedObjectUrls = [];
    clickedAnchors = [];

    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.spyOn(window.URL, "createObjectURL").mockImplementation((_blob) => {
      const url = `blob:http://localhost/${Math.random().toString(36).substring(7)}`;
      createdObjectUrls.push(url);
      return url;
    });

    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation((url) => {
      revokedObjectUrls.push(url);
    });

    // Mock HTMLAnchorElement.prototype.click
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clickedAnchors.push({
        href: this.href,
        download: this.download,
        target: this.target,
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("downloadFileDirect", () => {
    it("fetches binary stream, creates object URL, triggers download anchor, and revokes URL", async () => {
      const binaryContent = new Uint8Array([10, 20, 30, 40]);

      server.use(
        http.get("/api/v1/files/f-101/download", () => {
          return new HttpResponse(binaryContent, {
            status: 200,
            headers: {
              "Content-Type": "application/octet-stream",
              "Content-Disposition": 'attachment; filename="report.pdf"',
            },
          });
        }),
      );

      const blob = await downloadFileDirect("f-101", { fileName: "report.pdf" });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(4);
      expect(createdObjectUrls.length).toBe(1);
      expect(clickedAnchors.length).toBe(1);
      expect(clickedAnchors[0].href).toBe(createdObjectUrls[0]);
      expect(clickedAnchors[0].download).toBe("report.pdf");
      expect(revokedObjectUrls).toContain(createdObjectUrls[0]);
    });

    it("retries on 409 FILE_PENDING with backoff until ready", async () => {
      let attempts = 0;
      const binaryContent = new Uint8Array([1, 2, 3]);

      server.use(
        http.get("/api/v1/files/f-102/download", () => {
          attempts++;
          if (attempts < 3) {
            return HttpResponse.json(
              {
                error: {
                  code: "FILE_PENDING",
                  message: "File processing is pending",
                },
              },
              { status: 409 },
            );
          }
          return new HttpResponse(binaryContent, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }),
      );

      const blob = await downloadFileDirect("f-102", {
        fileName: "file.txt",
        backoffMs: 10,
        maxRetries: 3,
      });

      expect(attempts).toBe(3);
      expect(blob.size).toBe(3);
      expect(clickedAnchors.length).toBe(1);
    });

    it("throws error when file is not found (404)", async () => {
      server.use(
        http.get("/api/v1/files/f-missing/download", () => {
          return HttpResponse.json(
            {
              error: {
                code: "NOT_FOUND",
                message: "File not found",
              },
            },
            { status: 404 },
          );
        }),
      );

      await expect(downloadFileDirect("f-missing")).rejects.toThrow(/not found/i);
    });
  });

  describe("downloadFilePresigned", () => {
    it("fetches signed download URL and triggers anchor navigation", async () => {
      server.use(
        http.get("/api/v1/files/f-202/url", () => {
          return HttpResponse.json({
            url: "https://storage.example.com/downloads/f-202?token=abc",
            expiresInSeconds: 300,
          });
        }),
      );

      const targetUrl = await downloadFilePresigned("f-202");

      expect(targetUrl).toBe("https://storage.example.com/downloads/f-202?token=abc");
      expect(clickedAnchors.length).toBe(1);
      expect(clickedAnchors[0].href).toBe("https://storage.example.com/downloads/f-202?token=abc");
    });
  });
});
