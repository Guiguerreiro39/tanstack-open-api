import type * as React from "react";
import { cn } from "@/shared/lib/utils";

export function ButtonGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: ARIA group role for button toolbar
    <div
      className={cn(
        "inline-flex rounded-xl shadow-2xs",
        orientation === "horizontal"
          ? "flex-row *:rounded-none *:not-first:-ml-px *:first:rounded-l-xl *:last:rounded-r-xl"
          : "flex-col *:rounded-none *:not-first:-mt-px *:first:rounded-t-xl *:last:rounded-b-xl",
        className,
      )}
      data-orientation={orientation}
      data-slot="button-group"
      role="group"
      {...props}
    />
  );
}
