import {
  Download,
  ExternalLink,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  FileVideo,
  Trash2,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Can } from "@/shared/ui/can";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { type FileRecord, formatFileSize } from "../model/files";

export interface FileListProps {
  files: readonly FileRecord[];
  onDirectDownload: (id: string, fileName?: string) => void;
  onPresignedDownload: (id: string) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType === "application/pdf" || mimeType.startsWith("text/plain")) return FileText;
  if (
    mimeType.includes("zip") ||
    mimeType.includes("tar") ||
    mimeType.includes("gzip") ||
    mimeType.includes("compressed")
  )
    return FileArchive;
  if (
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("typescript") ||
    mimeType.includes("html") ||
    mimeType.includes("css")
  )
    return FileCode;
  return File;
}

export function FileList({
  files,
  onDirectDownload,
  onPresignedDownload,
  onDelete,
  isLoading = false,
  className,
}: FileListProps) {
  if (files.length === 0 && !isLoading) {
    return (
      <div
        className={cn(
          "border-outline-variant/60 flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center",
          className,
        )}
      >
        <File className="text-muted-foreground/60 h-10 w-10" aria-hidden="true" />
        <h3 className="text-foreground mt-3 text-sm font-semibold">No files uploaded yet</h3>
        <p className="text-muted-foreground mt-1 text-xs">
          Use the dropzone above to upload files.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead>Size</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            const dateStr = new Date(file.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <TableRow key={file.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-medium">{file.originalName}</p>
                      <p className="text-muted-foreground text-xs">{file.mimeType}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatFileSize(file.sizeBytes)}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={file.status === "ready" ? "outline" : "secondary"}
                    className={
                      file.status === "ready"
                        ? "border-green-500/40 text-green-600 dark:text-green-400"
                        : ""
                    }
                  >
                    {file.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {dateStr}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      aria-label={`Download ${file.originalName}`}
                      title="Direct Stream Download"
                      onClick={() => onDirectDownload(file.id, file.originalName)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground h-8 w-8"
                      aria-label={`Signed URL ${file.originalName}`}
                      title="Presigned Download URL"
                      onClick={() => onPresignedDownload(file.id)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>

                    {/* biome-ignore lint/a11y/useValidAriaRole: Application RBAC role prop */}
                    <Can role="member" action="files:delete" resource={file}>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive/80 hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                        aria-label={`Delete ${file.originalName}`}
                        title="Delete File"
                        onClick={() => onDelete(file.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Can>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
