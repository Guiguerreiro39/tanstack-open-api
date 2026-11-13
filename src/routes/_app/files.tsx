import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { toast } from "sonner";
import { downloadFileDirect, downloadFilePresigned } from "@/features/files/api/download";
import {
  filesQueryKeys,
  useDeleteFileMutation,
  useFilesQuery,
} from "@/features/files/api/files-query";
import { uploadFile } from "@/features/files/api/upload";
import {
  type FileRecord,
  resolveUploadStrategy,
  type UploadItem,
  type UploadProgressEvent,
  type UploadStrategy,
  validateUploadFile,
} from "@/features/files/model/files";
import { FileDropzone } from "@/features/files/ui/file-dropzone";
import { FileList } from "@/features/files/ui/file-list";
import { StrategySwitcher } from "@/features/files/ui/strategy-switcher";
import { UploadProgressList } from "@/features/files/ui/upload-progress";

export const Route = createFileRoute("/_app/files")({
  component: FilesPage,
});

function FilesPage() {
  const queryClient = useQueryClient();
  const [strategy, setStrategy] = React.useState<UploadStrategy>("auto");
  const [uploadQueue, setUploadQueue] = React.useState<UploadItem[]>([]);

  const { data: filesData, isLoading } = useFilesQuery();
  const deleteMutation = useDeleteFileMutation({
    onSuccess: () => {
      toast.success("File deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete file");
    },
  });

  const files: FileRecord[] = filesData?.data ?? [];

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newItems: UploadItem[] = selectedFiles.map((file) => {
      const id = `upload-${crypto.randomUUID()}`;
      const resolved = resolveUploadStrategy(file, strategy);
      const validationError = validateUploadFile(file, strategy);
      const abortController = new AbortController();

      return {
        id,
        file,
        strategy,
        resolvedStrategy: resolved,
        status: validationError ? "error" : "uploading",
        progress: 0,
        loadedBytes: 0,
        totalBytes: file.size,
        error: validationError ?? undefined,
        abortController,
      };
    });

    setUploadQueue((prev) => [...newItems, ...prev]);

    for (const item of newItems) {
      if (item.status === "error") continue;
      startUpload(item);
    }
  };

  const startUpload = async (item: UploadItem) => {
    try {
      const uploaded = await uploadFile(item.file, {
        strategy: item.strategy,
        signal: item.abortController?.signal,
        onProgress: (evt: UploadProgressEvent) => {
          setUploadQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? {
                    ...q,
                    progress: evt.percentage,
                    loadedBytes: evt.loaded,
                    totalBytes: evt.total,
                  }
                : q,
            ),
          );
        },
      });

      setUploadQueue((prev) =>
        prev.map((q) =>
          q.id === item.id
            ? {
                ...q,
                status: "completed",
                progress: 100,
                uploadedFile: uploaded,
              }
            : q,
        ),
      );

      queryClient.invalidateQueries({ queryKey: filesQueryKeys.all });
      toast.success(`Uploaded ${item.file.name}`);
    } catch (err: unknown) {
      const error = err as Error;
      if (item.abortController?.signal.aborted || error?.name === "AbortError") {
        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "aborted" } : q)),
        );
      } else {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "error",
                  error: error?.message || "Upload failed",
                }
              : q,
          ),
        );
        toast.error(`Failed to upload ${item.file.name}: ${error?.message || "Unknown error"}`);
      }
    }
  };

  const handleAbort = (id: string) => {
    setUploadQueue((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          item.abortController?.abort();
          return { ...item, status: "aborted" };
        }
        return item;
      }),
    );
  };

  const handleRetry = (id: string) => {
    const item = uploadQueue.find((q) => q.id === id);
    if (!item) return;

    const newController = new AbortController();
    const updatedItem: UploadItem = {
      ...item,
      status: "uploading",
      progress: 0,
      loadedBytes: 0,
      error: undefined,
      abortController: newController,
    };

    setUploadQueue((prev) => prev.map((q) => (q.id === id ? updatedItem : q)));
    startUpload(updatedItem);
  };

  const handleDirectDownload = async (id: string, fileName?: string) => {
    try {
      toast.loading("Starting download...", { id: `download-${id}` });
      await downloadFileDirect(id, { fileName });
      toast.success("Download started", { id: `download-${id}` });
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(`Download failed: ${error.message || "Unknown error"}`, {
        id: `download-${id}`,
      });
    }
  };

  const handlePresignedDownload = async (id: string) => {
    try {
      toast.loading("Generating download URL...", { id: `url-${id}` });
      await downloadFilePresigned(id, { openInNewTab: true });
      toast.success("Download URL opened", { id: `url-${id}` });
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(`Failed to get download URL: ${error.message || "Unknown error"}`, {
        id: `url-${id}`,
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-foreground text-3xl font-bold tracking-tight">Files</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Upload and manage files with dual direct multipart and presigned S3 storage strategies.
        </p>
      </div>

      <div className="space-y-6">
        {/* Strategy Switcher */}
        <div className="space-y-2">
          <span className="text-muted-foreground block text-xs font-semibold tracking-wider uppercase">
            Upload Strategy
          </span>
          <StrategySwitcher strategy={strategy} onChange={setStrategy} />
        </div>

        {/* Dropzone */}
        <FileDropzone onFilesSelected={handleFilesSelected} />

        {/* Upload Progress Queue */}
        <UploadProgressList items={uploadQueue} onAbort={handleAbort} onRetry={handleRetry} />

        {/* File List */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-foreground text-lg font-semibold">Uploaded Files</h2>
            <span className="text-muted-foreground text-xs">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          </div>

          <FileList
            files={files}
            isLoading={isLoading}
            onDirectDownload={handleDirectDownload}
            onPresignedDownload={handlePresignedDownload}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
