import { createW3CTraceparent, customFetch } from "@/shared/api/fetch";
import type { PostApiV1FilesPresign201 } from "@/shared/api/generated/models/postApiV1FilesPresign201";
import { resolveApiUrl } from "@/shared/config/env";
import {
  calculateProgress,
  type FileRecord,
  resolveUploadStrategy,
  type UploadProgressEvent,
  type UploadStrategy,
  validateUploadFile,
} from "../model/files";

export interface UploadOptions {
  onProgress?: (event: UploadProgressEvent) => void;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export function uploadDirectMultipart(
  file: File,
  options: UploadOptions = {},
): Promise<FileRecord> {
  return new Promise((resolve, reject) => {
    const validationError = validateUploadFile(file, "direct");
    if (validationError) {
      reject(new Error(validationError));
      return;
    }

    if (options.signal?.aborted) {
      reject(new DOMException("Upload aborted", "AbortError"));
      return;
    }

    const xhr = new XMLHttpRequest();
    const url = resolveApiUrl("/api/v1/files");
    const formData = new FormData();
    formData.append("file", file);

    xhr.open("POST", url);
    xhr.withCredentials = true;

    // Attach tracing and correlation headers
    const requestId = options.headers?.["X-Request-Id"] ?? `req_${crypto.randomUUID()}`;
    xhr.setRequestHeader("X-Request-Id", requestId);

    if (options.headers?.traceparent) {
      xhr.setRequestHeader("traceparent", options.headers.traceparent);
    } else {
      const trace = createW3CTraceparent();
      xhr.setRequestHeader("traceparent", trace.traceparent);
    }

    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        if (key.toLowerCase() !== "x-request-id" && key.toLowerCase() !== "traceparent") {
          xhr.setRequestHeader(key, value);
        }
      }
    }

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: calculateProgress(event.loaded, event.total),
        });
      }
    };

    const abortHandler = () => {
      xhr.abort();
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    if (options.signal) {
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }

    xhr.onload = () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const parsed = JSON.parse(xhr.responseText) as FileRecord;
          resolve(parsed);
        } catch {
          reject(new Error("Failed to parse file upload response"));
        }
      } else {
        let errorMessage = `Upload failed with HTTP ${xhr.status}`;
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData?.error?.message ?? errorData?.message ?? errorMessage;
        } catch {
          // Keep default message
        }
        reject(new Error(errorMessage));
      }
    };

    xhr.onerror = () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }
      reject(new Error("Network error during file upload"));
    };

    xhr.onabort = () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    xhr.send(formData);
  });
}

export async function uploadPresigned(
  file: File,
  options: UploadOptions = {},
): Promise<FileRecord> {
  const validationError = validateUploadFile(file, "presigned");
  if (validationError) {
    throw new Error(validationError);
  }

  if (options.signal?.aborted) {
    throw new DOMException("Upload aborted", "AbortError");
  }

  // Step 1: Request presigned upload URL from API
  const presignResponse = await customFetch<PostApiV1FilesPresign201>("/api/v1/files/presign", {
    method: "POST",
    headers: options.headers,
    signal: options.signal,
    body: JSON.stringify({
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });

  const { file: pendingFile, uploadUrl } = presignResponse;

  if (options.signal?.aborted) {
    throw new DOMException("Upload aborted", "AbortError");
  }

  // Step 2: Direct PUT of raw binary bytes to presigned storage URL
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    // ADR-0007: withCredentials = false for direct storage upload
    xhr.withCredentials = false;
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: calculateProgress(event.loaded, event.total),
        });
      }
    };

    const abortHandler = () => {
      xhr.abort();
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    if (options.signal) {
      options.signal.addEventListener("abort", abortHandler, { once: true });
    }

    xhr.onload = () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let msg = `Storage upload failed with HTTP ${xhr.status}`;
        try {
          const err = JSON.parse(xhr.responseText);
          msg = err?.error?.message ?? err?.message ?? msg;
        } catch {
          // ignore
        }
        reject(new Error(msg));
      }
    };

    xhr.onerror = () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }
      reject(new Error("Storage upload network failure"));
    };

    xhr.onabort = () => {
      if (options.signal) {
        options.signal.removeEventListener("abort", abortHandler);
      }
      reject(new DOMException("Upload aborted", "AbortError"));
    };

    xhr.send(file);
  });

  if (options.signal?.aborted) {
    throw new DOMException("Upload aborted", "AbortError");
  }

  // Step 3: Complete upload and promote status to ready
  const completedFile = await customFetch<FileRecord>(`/api/v1/files/${pendingFile.id}/complete`, {
    method: "POST",
    headers: options.headers,
    signal: options.signal,
  });

  return completedFile;
}

export async function uploadFile(
  file: File,
  options: UploadOptions & { strategy?: UploadStrategy } = {},
): Promise<FileRecord> {
  const resolved = resolveUploadStrategy(file, options.strategy ?? "auto");
  if (resolved === "direct") {
    return uploadDirectMultipart(file, options);
  }
  return uploadPresigned(file, options);
}

export async function uploadFilesBatch(
  files: File[],
  options: {
    strategy?: UploadStrategy;
    onFileProgress?: (fileIndex: number, event: UploadProgressEvent) => void;
    signal?: AbortSignal;
  } = {},
): Promise<FileRecord[]> {
  const results: FileRecord[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const record = await uploadFile(file, {
      strategy: options.strategy,
      signal: options.signal,
      onProgress: (evt) => options.onFileProgress?.(i, evt),
    });
    results.push(record);
  }
  return results;
}
