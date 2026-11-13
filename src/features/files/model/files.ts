import type { GetApiV1Files200DataItem } from "@/shared/api/generated/models/getApiV1Files200DataItem";

export type FileRecord = GetApiV1Files200DataItem;
export type FileStatus = FileRecord["status"];

export type UploadStatus = "idle" | "uploading" | "completed" | "error" | "aborted";
export type UploadStrategy = "auto" | "direct" | "presigned";
export type ResolvedUploadStrategy = "direct" | "presigned";

export interface UploadProgressEvent {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadItem {
  id: string;
  file: File;
  strategy: UploadStrategy;
  resolvedStrategy: ResolvedUploadStrategy;
  status: UploadStatus;
  progress: number;
  loadedBytes: number;
  totalBytes: number;
  error?: string;
  abortController?: AbortController;
  uploadedFile?: FileRecord;
}

export const MAX_MULTIPART_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PRESIGNED_BYTES = 100 * 1024 * 1024; // 100 MB

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const normalizedIndex = Math.min(i, units.length - 1);
  const size = bytes / 1024 ** normalizedIndex;
  const rounded = Number.isInteger(size) ? size.toString() : size.toFixed(2).replace(/\.?0+$/, "");
  return `${rounded} ${units[normalizedIndex]}`;
}

export function calculateProgress(loaded: number, total: number): number {
  if (total <= 0 || loaded <= 0) return 0;
  if (loaded >= total) return 100;
  return Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
}

export function resolveUploadStrategy(
  file: File,
  strategy: UploadStrategy,
): ResolvedUploadStrategy {
  if (strategy === "direct") return "direct";
  if (strategy === "presigned") return "presigned";
  return file.size <= MAX_MULTIPART_BYTES ? "direct" : "presigned";
}

export function validateUploadFile(file: File, strategy: UploadStrategy): string | null {
  if (file.size <= 0) {
    return "File cannot be empty";
  }

  const resolved = resolveUploadStrategy(file, strategy);
  if (resolved === "direct" && file.size > MAX_MULTIPART_BYTES) {
    return "File exceeds 10 MB direct upload limit";
  }

  if (file.size > MAX_PRESIGNED_BYTES) {
    return "File exceeds 100 MB maximum size limit";
  }

  return null;
}
