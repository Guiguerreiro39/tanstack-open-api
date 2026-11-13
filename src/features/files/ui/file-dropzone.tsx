import { UploadCloud } from "lucide-react";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

export function FileDropzone({
  onFilesSelected,
  disabled = false,
  accept,
  multiple = true,
  className,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      // Reset input value so re-selecting same file triggers change
      e.target.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === " ") && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    // biome-ignore lint/a11y/useSemanticElements: Dropzone container acts as accessible clickable zone
    <div
      data-testid="file-dropzone"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload files dropzone"
      aria-disabled={disabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center p-8 text-center transition-all duration-200",
        "border-outline-variant/60 bg-surface-container-low hover:border-primary rounded-2xl border-2 border-dashed",
        isDragging && "border-primary bg-primary/5 ring-primary/10 ring-4",
        disabled && "hover:border-outline-variant/60 cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
        <UploadCloud className="h-6 w-6" aria-hidden="true" />
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-foreground text-sm font-medium">
          Drag & drop files here, or <span className="text-primary underline">browse</span>
        </p>
        <p className="text-muted-foreground text-xs">
          Direct multipart upload up to 10 MB • Presigned storage up to 100 MB
        </p>
      </div>
    </div>
  );
}
