import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockXMLHttpRequest } from "@/test/mock-xml-http-request";
import { server } from "@/test/msw-server";
import { renderAppRoutes } from "@/test/render";
import type { FileRecord } from "../model/files";

const validFileDocId = "11111111-1111-1111-1111-111111111111";

const initialFiles: FileRecord[] = [
  {
    id: validFileDocId,
    userId: "u-test",
    originalName: "contract.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024 * 100,
    checksumSha256: null,
    status: "ready",
    expiresAt: null,
    createdAt: "2026-11-12T00:00:00Z",
    updatedAt: "2026-11-12T00:00:00Z",
  },
];

const testUser = {
  id: "u-test",
  role: "member" as const,
  name: "Tester",
  email: "tester@example.com",
};

describe("Files Page & Route Integration (/_app/files)", () => {
  beforeEach(() => {
    MockXMLHttpRequest.install();
  });

  afterEach(() => {
    MockXMLHttpRequest.restore();
    MockXMLHttpRequest.reset();
    vi.restoreAllMocks();
  });

  it("renders files route with title, strategy switcher, dropzone, and existing files", async () => {
    server.use(
      http.get("/api/v1/files", () => {
        return HttpResponse.json({
          data: initialFiles,
          meta: { nextCursor: null, hasMore: false },
        });
      }),
    );

    await renderAppRoutes({
      initialEntries: ["/files"],
      user: testUser,
    });

    expect(await screen.findByRole("heading", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: /upload strategy/i })).toBeInTheDocument();
    expect(screen.getByTestId("file-dropzone")).toBeInTheDocument();
    expect(await screen.findByText("contract.pdf")).toBeInTheDocument();
    expect(screen.getByText("100 KB")).toBeInTheDocument();
  });

  it("uploads dropped file and adds it to upload queue", async () => {
    let uploadCalled = false;

    server.use(
      http.get("/api/v1/files", () => {
        return HttpResponse.json({
          data: initialFiles,
          meta: { nextCursor: null, hasMore: false },
        });
      }),
    );

    MockXMLHttpRequest.onSendHandler = (xhr) => {
      uploadCalled = true;
      xhr.simulateProgress(50, 100);
      xhr.simulateResponse(201, {
        id: "f-new",
        userId: "u-test",
        originalName: "upload.png",
        mimeType: "image/png",
        sizeBytes: 500,
        checksumSha256: null,
        status: "ready",
        expiresAt: null,
        createdAt: "2026-11-12T02:00:00Z",
        updatedAt: "2026-11-12T02:00:00Z",
      });
    };

    await renderAppRoutes({
      initialEntries: ["/files"],
      user: testUser,
    });

    const dropzone = await screen.findByTestId("file-dropzone");
    const newFile = new File(["dummy png content"], "upload.png", { type: "image/png" });

    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [newFile],
      },
    });

    await waitFor(() => {
      expect(uploadCalled).toBe(true);
    });

    expect(await screen.findByText("upload.png")).toBeInTheDocument();
  });

  it("deletes a file when delete button is clicked", async () => {
    const user = userEvent.setup();
    let deletedId: string | null = null;

    server.use(
      http.get("/api/v1/files", () => {
        return HttpResponse.json({
          data: initialFiles,
          meta: { nextCursor: null, hasMore: false },
        });
      }),
      http.delete("/api/v1/files/:id", ({ params }) => {
        deletedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    await renderAppRoutes({
      initialEntries: ["/files"],
      user: testUser,
    });

    expect(await screen.findByText("contract.pdf")).toBeInTheDocument();

    const deleteBtn = screen.getByRole("button", { name: /delete contract\.pdf/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(deletedId).toBe(validFileDocId);
    });
  });

  it("triggers direct download and presigned URL download actions", async () => {
    const user = userEvent.setup();
    let downloadRequested = false;
    let urlRequested = false;

    // Spy on URL methods and anchor click to prevent happy-dom navigation
    vi.spyOn(window.URL, "createObjectURL").mockReturnValue("blob:http://localhost/test");
    vi.spyOn(window.URL, "revokeObjectURL").mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    server.use(
      http.get("/api/v1/files", () => {
        return HttpResponse.json({
          data: initialFiles,
          meta: { nextCursor: null, hasMore: false },
        });
      }),
      http.get(`/api/v1/files/${validFileDocId}/download`, () => {
        downloadRequested = true;
        return new HttpResponse(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: { "Content-Type": "application/pdf" },
        });
      }),
      http.get(`/api/v1/files/${validFileDocId}/url`, () => {
        urlRequested = true;
        return HttpResponse.json({
          url: "https://storage.example.com/download/contract.pdf",
          expiresInSeconds: 300,
        });
      }),
    );

    await renderAppRoutes({
      initialEntries: ["/files"],
      user: testUser,
    });

    expect(await screen.findByText("contract.pdf")).toBeInTheDocument();

    // Trigger direct stream download
    const downloadBtn = screen.getByRole("button", { name: /download contract\.pdf/i });
    await user.click(downloadBtn);

    await waitFor(() => {
      expect(downloadRequested).toBe(true);
    });

    // Trigger presigned download URL
    const presignedBtn = screen.getByRole("button", { name: /signed url contract\.pdf/i });
    await user.click(presignedBtn);

    await waitFor(() => {
      expect(urlRequested).toBe(true);
    });
  });

  it("renders loading skeletons while files query is pending", async () => {
    server.use(
      http.get("/api/v1/files", async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json({
          data: initialFiles,
          meta: { nextCursor: null, hasMore: false },
        });
      }),
    );

    await renderAppRoutes({
      initialEntries: ["/files"],
      user: testUser,
    });

    expect(screen.getByTestId("files-loading-skeleton")).toBeInTheDocument();
  });

  it("renders 403 ForbiddenError banner via onTag when user lacks permission", async () => {
    server.use(
      http.get("/api/v1/files", () => {
        return HttpResponse.json(
          {
            error: {
              code: "FORBIDDEN",
              message: "You do not have access to view files.",
              requestId: "req-403",
            },
          },
          { status: 403 },
        );
      }),
    );

    await renderAppRoutes({
      initialEntries: ["/files"],
      user: testUser,
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/access denied/i);
    expect(alert).toHaveTextContent(/you do not have access to view files/i);
  });

  it("renders generic error banner via onFailure when server crashes with 500", async () => {
    server.use(
      http.get("/api/v1/files", () => {
        return HttpResponse.json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "Database failure fetching files",
              requestId: "req-500",
            },
          },
          { status: 500 },
        );
      }),
    );

    await renderAppRoutes({
      initialEntries: ["/files"],
      user: testUser,
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/database failure fetching files/i);
  });
});
