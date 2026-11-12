import type * as React from "react";
import { cn } from "@/shared/lib/utils";

export function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      className={cn("m-0 grid gap-4 border-0 p-0", className)}
      data-slot="fieldset"
      {...props}
    />
  );
}

export function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return (
    <legend
      className={cn("text-foreground mb-2 text-base font-bold", className)}
      data-slot="field-legend"
      {...props}
    />
  );
}

export function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-4", className)} data-slot="field-group" {...props} />;
}

export function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("grid gap-2", className)} data-slot="field" {...props} />;
}

export function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Base FieldLabel primitive
    <label
      className={cn(
        "text-foreground text-sm leading-none font-semibold peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      data-slot="field-label"
      {...props}
    />
  );
}

export function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-muted-foreground text-xs", className)}
      data-slot="field-description"
      {...props}
    />
  );
}

export function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null;
  return (
    <p
      className={cn("text-destructive text-xs font-medium", className)}
      data-slot="field-error"
      {...props}
    >
      {children}
    </p>
  );
}
