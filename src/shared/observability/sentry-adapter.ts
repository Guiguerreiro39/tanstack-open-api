import * as SentrySdk from "@sentry/react";
import type { AnyRouter } from "@tanstack/react-router";
import type { ErrorInfo } from "react";
import type { BreadcrumbEntry, DefectContext, ObservabilityService, TelemetryUser } from "./port";

export interface SentryAdapterConfig {
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  replaysSessionSampleRate?: number;
  isDatadogRumActive?: boolean;
  router?: AnyRouter;
  apiOrigins?: Array<string | RegExp>;
}

export type SentryModule = typeof SentrySdk;

export class SentryObservabilityAdapter implements ObservabilityService {
  private readonly sdk: SentryModule;

  constructor(config: SentryAdapterConfig, sdk: SentryModule = SentrySdk) {
    this.sdk = sdk;

    if (config.dsn && typeof window !== "undefined") {
      try {
        const integrations = [];
        const sdkRecord = this.sdk as unknown as Record<string, unknown>;

        if (
          config.router &&
          typeof sdkRecord.tanstackRouterBrowserTracingIntegration === "function"
        ) {
          const routerTracing = sdkRecord.tanstackRouterBrowserTracingIntegration as (
            router: unknown,
          ) => unknown;
          integrations.push(routerTracing(config.router));
        }

        if (typeof sdkRecord.replayIntegration === "function") {
          const replay = sdkRecord.replayIntegration as (opts: unknown) => unknown;
          integrations.push(
            replay({
              maskAllText: true,
              maskAllInputs: true,
              blockAllMedia: true,
            }),
          );
        }

        this.sdk.init({
          dsn: config.dsn,
          environment: config.environment,
          release: config.release,
          integrations: integrations as never,
          tracesSampleRate: config.tracesSampleRate ?? 0.2,
          replaysSessionSampleRate: config.replaysSessionSampleRate ?? 0.1,
          replaysOnErrorSampleRate: 1.0,
          tracePropagationTargets: ["localhost", /^\//, ...(config.apiOrigins ?? [])],
          propagateTraceparent: !config.isDatadogRumActive,
        } as Parameters<typeof this.sdk.init>[0]);
      } catch (err) {
        if (typeof console !== "undefined" && console.warn) {
          console.warn("[SentryObservabilityAdapter] Failed to initialize Sentry:", err);
        }
      }
    }
  }

  captureDefect(error: unknown, context?: DefectContext): void {
    if (typeof this.sdk.withScope === "function") {
      this.sdk.withScope((scope) => {
        if (context?.requestId) {
          scope.setTag("request_id", context.requestId);
        }
        if (context?.traceId) {
          scope.setTag("trace_id", context.traceId);
        }
        if (context?.source) {
          scope.setTag("defect_source", context.source);
        }
        if (context?.status !== undefined) {
          scope.setTag("status_code", String(context.status));
        }
        if (context?.extra) {
          scope.setExtras(context.extra);
        }
        this.sdk.captureException(error);
      });
    } else {
      this.sdk.captureException(error);
    }
  }

  captureReactError(
    error: unknown,
    errorInfo?: ErrorInfo | { componentStack?: string | null },
  ): void {
    this.sdk.captureException(error, {
      extra: {
        componentStack: errorInfo?.componentStack,
      },
    });
  }

  recordBreadcrumb(entry: BreadcrumbEntry): void {
    if (typeof this.sdk.addBreadcrumb === "function") {
      this.sdk.addBreadcrumb({
        category: entry.category,
        message: entry.message,
        level: entry.level,
        data: entry.data,
      });
    }
  }

  setUserContext(user: TelemetryUser | null): void {
    if (typeof this.sdk.setUser === "function") {
      if (!user) {
        this.sdk.setUser(null);
      } else {
        this.sdk.setUser({
          id: user.id,
          email: user.email ?? undefined,
          username: (user.name as string | undefined) ?? undefined,
        });
      }
    }
  }

  clearUserContext(): void {
    if (typeof this.sdk.setUser === "function") {
      this.sdk.setUser(null);
    }
  }

  setUser(user: TelemetryUser | null): void {
    this.setUserContext(user);
  }

  initRouter(_router: AnyRouter): void {}
}

export function createSentryAdapter(
  config: SentryAdapterConfig,
  sdk?: SentryModule,
): SentryObservabilityAdapter {
  return new SentryObservabilityAdapter(config, sdk);
}
