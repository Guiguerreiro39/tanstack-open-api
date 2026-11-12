import type * as React from "react";
import { cn } from "@/shared/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "border-input bg-surface-container-lowest text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25 aria-invalid:border-destructive aria-invalid:ring-destructive/25 flex h-10 w-full rounded-xl border px-3 py-2 text-sm shadow-(--inset-shadow-input) transition-colors file:border-0 file:bg-transparent file:text-sm file:font-semibold focus-visible:ring-3 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}
