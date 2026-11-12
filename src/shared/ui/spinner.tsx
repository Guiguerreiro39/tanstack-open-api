import { Loader2 } from "lucide-react";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

export interface SpinnerProps extends React.ComponentProps<"svg"> {
  size?: "sm" | "default" | "lg";
}

const sizeClasses = {
  sm: "size-4",
  default: "size-5",
  lg: "size-8",
};

export function Spinner({ className, size = "default", ...props }: SpinnerProps) {
  return (
    <Loader2
      className={cn("text-primary animate-spin", sizeClasses[size], className)}
      data-slot="spinner"
      role="status"
      aria-label="Loading"
      {...props}
    />
  );
}
