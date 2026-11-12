import type * as React from "react";
import { cn } from "@/shared/lib/utils";

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("bg-surface-container-high/80 animate-pulse rounded-xl", className)}
      data-slot="skeleton"
      {...props}
    />
  );
}
