import type * as React from "react";
import { cn } from "@/shared/lib/utils";

export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "border-outline-variant/60 bg-surface-container text-muted-foreground inline-flex h-5 items-center justify-center rounded-md border px-1.5 font-mono text-[10px] font-medium shadow-2xs select-none",
        className,
      )}
      data-slot="kbd"
      {...props}
    />
  );
}
