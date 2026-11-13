import { customFetch, type FetchError } from "@/shared/api/fetch";
import type { GetApiV1FilesIdUrl200 } from "@/shared/api/generated/models/getApiV1FilesIdUrl200";

export interface DirectDownloadOptions {
  fileName?: string;
  maxRetries?: number;
  backoffMs?: number;
  signal?: AbortSignal;
}

export interface PresignedDownloadOptions {
  openInNewTab?: boolean;
  signal?: AbortSignal;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function triggerBrowserDownload(href: string, fileName?: string, openInNewTab = false): void {
  if (typeof document === "undefined") return;

  const anchor = document.createElement("a");
  anchor.href = href;
  if (fileName) {
    anchor.download = fileName;
  }
  if (openInNewTab) {
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
  }
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export async function downloadFileDirect(
  id: string,
  options: DirectDownloadOptions = {},
): Promise<Blob> {
  const maxRetries = options.maxRetries ?? 3;
  const backoffMs = options.backoffMs ?? 200;

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      const blob = await customFetch<Blob>(`/api/v1/files/${id}/download`, {
        method: "GET",
        signal: options.signal,
        responseType: "blob",
      });

      if (typeof window !== "undefined" && typeof window.URL?.createObjectURL === "function") {
        const objectUrl = window.URL.createObjectURL(blob);
        try {
          triggerBrowserDownload(objectUrl, options.fileName);
        } finally {
          window.URL.revokeObjectURL(objectUrl);
        }
      }

      return blob;
    } catch (err: unknown) {
      const fetchError = err as FetchError;
      const isPending =
        fetchError?.status === 409 ||
        fetchError?.code === "FILE_PENDING" ||
        fetchError?.data?.error?.code === "FILE_PENDING";

      if (isPending && attempt < maxRetries) {
        await delay(backoffMs * attempt);
        continue;
      }
      throw err;
    }
  }
}

export async function downloadFilePresigned(
  id: string,
  options: PresignedDownloadOptions = {},
): Promise<string> {
  const response = await customFetch<GetApiV1FilesIdUrl200>(`/api/v1/files/${id}/url`, {
    method: "GET",
    signal: options.signal,
  });

  const { url } = response;
  triggerBrowserDownload(url, undefined, options.openInNewTab ?? false);
  return url;
}
