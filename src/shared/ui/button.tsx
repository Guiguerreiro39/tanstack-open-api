import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

const buttonVariants = cva(
  "focus-visible:ring-ring inline-flex items-center justify-center gap-2 text-sm font-semibold whitespace-nowrap transition-colors select-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground interactive-tactile hover:bg-primary-container rounded-xl font-bold",
        secondary:
          "bg-secondary-container text-on-secondary-container hover:bg-secondary-container/80 rounded-xl font-semibold",
        outline:
          "border-outline-variant/60 bg-surface-container-lowest text-foreground interactive-tactile hover:bg-surface-container rounded-xl border",
        destructive:
          "bg-destructive text-destructive-foreground interactive-tactile hover:bg-destructive/90 rounded-xl font-bold",
        ghost: "text-foreground hover:bg-surface-container hover:text-foreground rounded-xl",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-2xl px-6 text-base",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { buttonVariants };
