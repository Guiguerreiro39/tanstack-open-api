import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FileRecord, UploadItem } from "../model/files";
import { FileDropzone } from "../ui/file-dropzone";
import { FileList } from "../ui/file-list";
import { StrategySwitcher } from "../ui/strategy-switcher";
import { UploadProgressList } from "../ui/upload-progress";

describe("Files UI Primitives", () => {
  describe("<FileDropzone />", () => {
    it("renders dropzone with styling and handles dropped files", async () => {
      const onFilesSelected = vi.fn();
      render(<FileDropzone onFilesSelected={onFilesSelected} />);

      expect(screen.getByText(/drag & drop files here/i)).toBeInTheDocument();

      const dropzone = screen.getByTestId("file-dropzone");
      expect(dropzone.className).toContain("rounded-2xl");
      expect(dropzone.className).toContain("border-dashed");

      const file = new File(["test-content"], "test.txt", { type: "text/plain" });
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file],
        },
      });

      expect(onFilesSelected).toHaveBeenCalledWith([file]);
    });
  });

  describe("<StrategySwitcher />", () => {
    it("renders strategies and invokes onChange on selection", async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();

      render(<StrategySwitcher onChange={onChange} strategy="auto" />);

      expect(screen.getByRole("radio", { name: /auto/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /direct/i })).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /presigned/i })).toBeInTheDocument();

      await user.click(screen.getByRole("radio", { name: /presigned/i }));
      expect(onChange).toHaveBeenCalledWith("presigned");
    });
  });

  describe("<UploadProgressList />", () => {
    it("renders upload items with progress bars, abort, and retry buttons", async () => {
      const user = userEvent.setup();
      const onAbort = vi.fn();
      const onRetry = vi.fn();

      const items: UploadItem[] = [
        {
          id: "item-1",
          file: new File(["data"], "doc.pdf", { type: "application/pdf" }),
          strategy: "auto",
          resolvedStrategy: "direct",
          status: "uploading",
          progress: 45,
          loadedBytes: 450,
          totalBytes: 1000,
        },
        {
          id: "item-2",
          file: new File(["data"], "failed.zip", { type: "application/zip" }),
          strategy: "presigned",
          resolvedStrategy: "presigned",
          status: "error",
          progress: 20,
          loadedBytes: 200,
          totalBytes: 1000,
          error: "Upload failed: network error",
        },
      ];

      render(<UploadProgressList items={items} onAbort={onAbort} onRetry={onRetry} />);

      expect(screen.getByText("doc.pdf")).toBeInTheDocument();
      expect(screen.getByText("45%")).toBeInTheDocument();
      expect(screen.getByText("failed.zip")).toBeInTheDocument();
      expect(screen.getByText(/upload failed: network error/i)).toBeInTheDocument();

      // Cancel button on in-progress upload
      const cancelButton = screen.getByRole("button", { name: /cancel upload doc\.pdf/i });
      await user.click(cancelButton);
      expect(onAbort).toHaveBeenCalledWith("item-1");

      // Retry button on failed upload
      const retryButton = screen.getByRole("button", { name: /retry upload failed\.zip/i });
      await user.click(retryButton);
      expect(onRetry).toHaveBeenCalledWith("item-2");
    });
  });

  describe("<FileList />", () => {
    const mockFiles: FileRecord[] = [
      {
        id: "f-1",
        userId: "u-member",
        originalName: "invoice.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024 * 50,
        checksumSha256: null,
        status: "ready",
        expiresAt: null,
        createdAt: "2026-11-12T00:00:00Z",
        updatedAt: "2026-11-12T00:00:00Z",
      },
    ];

    function renderFileList(props: Partial<React.ComponentProps<typeof FileList>> = {}) {
      const queryClient = new QueryClient();
      queryClient.setQueryData(["auth", "session"], {
        user: { id: "u-member", role: "member" },
      });

      return render(
        <QueryClientProvider client={queryClient}>
          <FileList
            files={mockFiles}
            onDelete={vi.fn()}
            onDirectDownload={vi.fn()}
            onPresignedDownload={vi.fn()}
            {...props}
          />
        </QueryClientProvider>,
      );
    }

    it("renders files with mime icons, size, and triggers download/delete actions", async () => {
      const user = userEvent.setup();
      const onDirectDownload = vi.fn();
      const onPresignedDownload = vi.fn();
      const onDelete = vi.fn();

      renderFileList({
        onDirectDownload,
        onPresignedDownload,
        onDelete,
      });

      expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
      expect(screen.getByText("50 KB")).toBeInTheDocument();

      const directBtn = screen.getByRole("button", { name: /download invoice\.pdf/i });
      await user.click(directBtn);
      expect(onDirectDownload).toHaveBeenCalledWith("f-1", "invoice.pdf");

      const presignedBtn = screen.getByRole("button", { name: /signed url invoice\.pdf/i });
      await user.click(presignedBtn);
      expect(onPresignedDownload).toHaveBeenCalledWith("f-1");

      const deleteBtn = screen.getByRole("button", { name: /delete invoice\.pdf/i });
      await user.click(deleteBtn);
      expect(onDelete).toHaveBeenCalledWith("f-1");
    });
  });
});
