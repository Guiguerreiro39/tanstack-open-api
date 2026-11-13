import { Radio } from "lucide-react";
import type { LiveConnectionStatus } from "@/shared/lib/hooks/use-live-query";
import { cn } from "@/shared/lib/utils";
import { Badge } from "@/shared/ui/badge";

export interface LiveIndicatorProps {
  status: LiveConnectionStatus;
  lastPingAt?: number | null;
  className?: string;
}

export function LiveIndicator({ status, lastPingAt, className }: LiveIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "connected":
        return {
          label: "Live Connected",
          badgeVariant: "default" as const,
          dotColor: "bg-emerald-500",
          pulse: true,
        };
      case "connecting":
        return {
          label: "Connecting...",
          badgeVariant: "secondary" as const,
          dotColor: "bg-amber-500",
          pulse: true,
        };
      case "reconnecting":
        return {
          label: "Reconnecting...",
          badgeVariant: "outline" as const,
          dotColor: "bg-amber-500",
          pulse: true,
        };
      case "error":
        return {
          label: "Disconnected",
          badgeVariant: "destructive" as const,
          dotColor: "bg-rose-500",
          pulse: false,
        };
      default:
        return {
          label: "Idle",
          badgeVariant: "outline" as const,
          dotColor: "bg-muted-foreground",
          pulse: false,
        };
    }
  };

  const { label, badgeVariant, dotColor, pulse } = getStatusConfig();
  const pingTitle = lastPingAt
    ? `Last ping: ${new Date(lastPingAt).toLocaleTimeString()}`
    : undefined;

  return (
    <div className={cn("inline-flex items-center gap-2", className)} title={pingTitle}>
      <Badge
        className="shadow-tactile inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold"
        variant={badgeVariant}
      >
        <span className={cn("size-2 rounded-full", dotColor, pulse && "animate-pulse")} />
        <Radio className="size-3" />
        <span>{label}</span>
      </Badge>
    </div>
  );
}
