import { Toaster as Sonner, toast } from "sonner";
import { useTheme } from "@/shared/lib/theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { resolvedMode } = useTheme();

  return (
    <Sonner
      className="toaster group"
      theme={resolvedMode}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-outline-variant/40 group-[.toaster]:shadow-tactile group-[.toaster]:rounded-xl font-sans",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-surface-container group-[.toast]:text-foreground group-[.toast]:rounded-lg",
        },
      }}
      {...props}
    />
  );
}

export { toast };
