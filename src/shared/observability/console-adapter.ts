import type { AnyRouter } from "@tanstack/react-router";
import type { ErrorInfo } from "react";
import type { BreadcrumbEntry, DefectContext, ObservabilityService, TelemetryUser } from "./port";

export class ConsoleObservabilityAdapter implements ObservabilityService {
  captureDefect(error: unknown, context?: DefectContext): void {
    if (typeof console !== "undefined" && console.error) {
      console.error("[telemetry:defect]", error, context);
    }
  }

  captureReactError(
    error: unknown,
    errorInfo?: ErrorInfo | { componentStack?: string | null },
  ): void {
    if (typeof console !== "undefined" && console.error) {
      console.error("[telemetry:react-error]", error, errorInfo);
    }
  }

  recordBreadcrumb(entry: BreadcrumbEntry): void {
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[telemetry:breadcrumb]", entry);
    }
  }

  setUserContext(user: TelemetryUser | null): void {
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[telemetry:user]", user);
    }
  }

  clearUserContext(): void {
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[telemetry:user]", null);
    }
  }

  setUser(user: TelemetryUser | null): void {
    this.setUserContext(user);
  }

  initRouter(_router: AnyRouter): void {}
}

export const consoleObservabilityAdapter = new ConsoleObservabilityAdapter();
