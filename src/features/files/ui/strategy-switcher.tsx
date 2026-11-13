import { cn } from "@/shared/lib/utils";
import type { UploadStrategy } from "../model/files";

export interface StrategySwitcherProps {
  strategy: UploadStrategy;
  onChange: (strategy: UploadStrategy) => void;
  disabled?: boolean;
  className?: string;
}

const STRATEGIES: Array<{
  id: UploadStrategy;
  title: string;
  description: string;
}> = [
  {
    id: "auto",
    title: "Auto",
    description: "Direct (<= 10MB) or Presigned (> 10MB)",
  },
  {
    id: "direct",
    title: "Direct Multipart",
    description: "Streamed directly through backend proxy (max 10MB)",
  },
  {
    id: "presigned",
    title: "Presigned Storage",
    description: "Direct 3-step upload to object storage (max 100MB)",
  },
];

export function StrategySwitcher({
  strategy,
  onChange,
  disabled = false,
  className,
}: StrategySwitcherProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Upload Strategy"
      className={cn("grid grid-cols-1 gap-2 sm:grid-cols-3", className)}
    >
      {STRATEGIES.map((item) => {
        const isSelected = strategy === item.id;
        return (
          // biome-ignore lint/a11y/useSemanticElements: Segmented switcher button group
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-label={item.title}
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "flex flex-col items-start justify-center rounded-xl border p-3 text-left transition-all",
              "border-outline-variant/50 bg-surface-container-low hover:border-primary/50",
              isSelected && "border-primary bg-primary/10 ring-primary/30 shadow-sm ring-1",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-foreground text-sm font-semibold">{item.title}</span>
              <span
                className={cn(
                  "border-primary/50 flex h-4 w-4 items-center justify-center rounded-full border",
                  isSelected && "border-primary bg-primary",
                )}
                aria-hidden="true"
              >
                {isSelected && <span className="bg-primary-foreground h-1.5 w-1.5 rounded-full" />}
              </span>
            </div>
            <span className="text-muted-foreground mt-1 text-xs">{item.description}</span>
          </button>
        );
      })}
    </div>
  );
}
