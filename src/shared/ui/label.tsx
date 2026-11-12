import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      className={cn(
        "text-foreground text-sm leading-none font-semibold select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      data-slot="label"
      {...props}
    />
  );
}
