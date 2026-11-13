import { AlertCircle, CheckCircle2, File as FileIcon, RotateCcw, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Progress } from "@/shared/ui/progress";
import { formatFileSize, type UploadItem } from "../model/files";

export interface UploadProgressListProps {
  items: UploadItem[];
  onAbort?: (id: string) => void;
  onRetry?: (id: string) => void;
  className?: string;
}

export function UploadProgressList({
  items,
  onAbort,
  onRetry,
  className,
}: UploadProgressListProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <h3 className="text-foreground text-sm font-semibold">Uploads</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <UploadProgressItem key={item.id} item={item} onAbort={onAbort} onRetry={onRetry} />
        ))}
      </div>
    </div>
  );
}

interface UploadProgressItemProps {
  item: UploadItem;
  onAbort?: (id: string) => void;
  onRetry?: (id: string) => void;
}

function UploadProgressItem({ item, onAbort, onRetry }: UploadProgressItemProps) {
  const isUploading = item.status === "uploading";
  const isCompleted = item.status === "completed";
  const isError = item.status === "error";
  const isAborted = item.status === "aborted";

  return (
    <div
      data-testid={`upload-item-${item.id}`}
      className="border-outline-variant/50 bg-surface-container-low flex flex-col gap-2 rounded-xl border p-3 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <FileIcon className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-foreground truncate text-sm font-medium">{item.file.name}</p>
            <p className="text-muted-foreground text-xs">
              {formatFileSize(item.loadedBytes)} of{" "}
              {formatFileSize(item.totalBytes || item.file.size)} • {item.resolvedStrategy}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCompleted && (
            <Badge
              variant="outline"
              className="border-green-500/40 text-green-600 dark:text-green-400"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Completed
            </Badge>
          )}

          {isUploading && (
            <span className="text-primary text-xs font-semibold tabular-nums">
              {item.progress}%
            </span>
          )}

          {isError && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Error
            </Badge>
          )}

          {isAborted && (
            <Badge variant="outline" className="text-muted-foreground">
              Canceled
            </Badge>
          )}

          {isUploading && onAbort && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-7 w-7"
              aria-label={`Cancel upload ${item.file.name}`}
              onClick={() => onAbort(item.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}

          {(isError || isAborted) && onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground h-7 w-7"
              aria-label={`Retry upload ${item.file.name}`}
              onClick={() => onRetry(item.id)}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {isUploading && <Progress value={item.progress} className="h-1.5" />}

      {isError && item.error && <p className="text-destructive text-xs">{item.error}</p>}
    </div>
  );
}
