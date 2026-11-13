import { describe, expect, it } from "vitest";
import {
  calculateProgress,
  formatFileSize,
  MAX_MULTIPART_BYTES,
  MAX_PRESIGNED_BYTES,
  resolveUploadStrategy,
  validateUploadFile,
} from "../model/files";

describe("Files Model & Helpers", () => {
  describe("formatFileSize", () => {
    it("formats 0 bytes as 0 B", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("formats bytes, kilobytes, megabytes, and gigabytes correctly", () => {
      expect(formatFileSize(512)).toBe("512 B");
      expect(formatFileSize(1024)).toBe("1 KB");
      expect(formatFileSize(1024 * 1.5)).toBe("1.5 KB");
      expect(formatFileSize(1024 * 1024)).toBe("1 MB");
      expect(formatFileSize(1024 * 1024 * 5.25)).toBe("5.25 MB");
      expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
    });
  });

  describe("calculateProgress", () => {
    it("returns 0 when total is 0 or negative", () => {
      expect(calculateProgress(0, 0)).toBe(0);
      expect(calculateProgress(50, 0)).toBe(0);
    });

    it("calculates percentage clamped to [0, 100]", () => {
      expect(calculateProgress(25, 100)).toBe(25);
      expect(calculateProgress(50, 100)).toBe(50);
      expect(calculateProgress(100, 100)).toBe(100);
      expect(calculateProgress(150, 100)).toBe(100);
      expect(calculateProgress(-10, 100)).toBe(0);
    });

    it("rounds percentage to nearest integer", () => {
      expect(calculateProgress(1, 3)).toBe(33);
      expect(calculateProgress(2, 3)).toBe(67);
    });
  });

  describe("resolveUploadStrategy", () => {
    it("respects explicit strategy direct and presigned", () => {
      const file = new File(["test"], "test.txt", { type: "text/plain" });
      expect(resolveUploadStrategy(file, "direct")).toBe("direct");
      expect(resolveUploadStrategy(file, "presigned")).toBe("presigned");
    });

    it("resolves auto based on 10MB boundary", () => {
      const smallFile = { size: 5 * 1024 * 1024 } as File;
      const exact10Mb = { size: 10 * 1024 * 1024 } as File;
      const largeFile = { size: 10 * 1024 * 1024 + 1 } as File;

      expect(resolveUploadStrategy(smallFile, "auto")).toBe("direct");
      expect(resolveUploadStrategy(exact10Mb, "auto")).toBe("direct");
      expect(resolveUploadStrategy(largeFile, "auto")).toBe("presigned");
    });
  });

  describe("validateUploadFile", () => {
    it("rejects empty files", () => {
      const emptyFile = new File([], "empty.txt", { type: "text/plain" });
      expect(validateUploadFile(emptyFile, "auto")).toBe("File cannot be empty");
    });

    it("rejects files exceeding 10MB in direct mode", () => {
      const bigFile = { size: MAX_MULTIPART_BYTES + 1, name: "big.bin" } as File;
      expect(validateUploadFile(bigFile, "direct")).toBe("File exceeds 10 MB direct upload limit");
    });

    it("rejects files exceeding 100MB in presigned and auto mode", () => {
      const hugeFile = { size: MAX_PRESIGNED_BYTES + 1, name: "huge.bin" } as File;
      expect(validateUploadFile(hugeFile, "presigned")).toBe(
        "File exceeds 100 MB maximum size limit",
      );
      expect(validateUploadFile(hugeFile, "auto")).toBe("File exceeds 100 MB maximum size limit");
    });

    it("accepts valid files", () => {
      const validFile = new File(["valid-content"], "doc.pdf", { type: "application/pdf" });
      expect(validateUploadFile(validFile, "auto")).toBeNull();
      expect(validateUploadFile(validFile, "direct")).toBeNull();
      expect(validateUploadFile(validFile, "presigned")).toBeNull();
    });
  });
});
