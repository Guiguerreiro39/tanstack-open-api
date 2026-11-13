import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

const alertVariants = cva(
  "[&>svg]:text-foreground relative w-full rounded-2xl border p-4 text-sm shadow-sm [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg+div]:translate-y-[-3px] [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        default: "bg-surface-container-low text-foreground border-outline-variant/40",
        destructive:
          "bg-destructive-container text-on-destructive-container border-destructive/20 [&>svg]:text-on-destructive-container",
        success:
          "bg-success-container text-on-success-container border-success/20 [&>svg]:text-on-success-container",
        warning:
          "bg-warning-container text-on-warning-container border-warning/20 [&>svg]:text-on-warning-container",
        info: "bg-info-container text-on-info-container border-info/20 [&>svg]:text-on-info-container",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      data-slot="alert"
      role="alert"
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mb-1 text-base leading-none font-bold tracking-tight", className)}
      data-slot="alert-title"
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)}
      data-slot="alert-description"
      {...props}
    />
  );
}
