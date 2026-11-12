import type { AnyRouter } from "@tanstack/react-router";
import type { ErrorInfo } from "react";
import type { BreadcrumbEntry, DefectContext, ObservabilityService, TelemetryUser } from "./port";

export interface CapturedDefect {
  error: unknown;
  context?: DefectContext;
}

export interface CapturedReactError {
  error: unknown;
  errorInfo?: ErrorInfo | { componentStack?: string | null };
}

export class SpyObservabilityAdapter implements ObservabilityService {
  defects: CapturedDefect[] = [];
  reactErrors: CapturedReactError[] = [];
  breadcrumbs: BreadcrumbEntry[] = [];
  userHistory: Array<TelemetryUser | null> = [];
  currentUser: TelemetryUser | null = null;
  instrumentedRouters: AnyRouter[] = [];

  captureDefect(error: unknown, context?: DefectContext): void {
    this.defects.push({ error, context });
  }

  captureReactError(
    error: unknown,
    errorInfo?: ErrorInfo | { componentStack?: string | null },
  ): void {
    this.reactErrors.push({ error, errorInfo });
  }

  recordBreadcrumb(entry: BreadcrumbEntry): void {
    this.breadcrumbs.push(entry);
  }

  setUserContext(user: TelemetryUser | null): void {
    this.currentUser = user;
    this.userHistory.push(user);
  }

  clearUserContext(): void {
    this.currentUser = null;
    this.userHistory.push(null);
  }

  setUser(user: TelemetryUser | null): void {
    this.setUserContext(user);
  }

  initRouter(router: AnyRouter): void {
    this.instrumentedRouters.push(router);
  }

  reset(): void {
    this.defects = [];
    this.reactErrors = [];
    this.breadcrumbs = [];
    this.userHistory = [];
    this.currentUser = null;
    this.instrumentedRouters = [];
  }
}

export function createSpyObservability(): SpyObservabilityAdapter {
  return new SpyObservabilityAdapter();
}
