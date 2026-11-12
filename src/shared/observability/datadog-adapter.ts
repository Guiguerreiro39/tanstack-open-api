import { datadogLogs as defaultLogs } from "@datadog/browser-logs";
import { datadogRum as defaultRum } from "@datadog/browser-rum";
import type { AnyRouter } from "@tanstack/react-router";
import type { ErrorInfo } from "react";
import type { BreadcrumbEntry, DefectContext, ObservabilityService, TelemetryUser } from "./port";

export interface DatadogAdapterConfig {
  clientToken?: string;
  applicationId?: string;
  site?: string;
  service?: string;
  env?: string;
  version?: string;
  sessionSampleRate?: number;
  sessionReplaySampleRate?: number;
  traceSampleRate?: number;
  apiOrigins?: Array<string | RegExp>;
  router?: AnyRouter;
}

export interface DatadogSdks {
  rum?: typeof defaultRum;
  logs?: typeof defaultLogs;
}

export class DatadogObservabilityAdapter implements ObservabilityService {
  private readonly rum?: typeof defaultRum;
  private readonly logs?: typeof defaultLogs;

  constructor(
    config: DatadogAdapterConfig,
    sdks: DatadogSdks = { rum: defaultRum, logs: defaultLogs },
  ) {
    this.rum = sdks.rum;
    this.logs = sdks.logs;

    if (typeof window !== "undefined") {
      const clientToken = config.clientToken;
      const applicationId = config.applicationId;

      const sharedConfig = {
        clientToken: clientToken || "",
        site: config.site ?? "datadoghq.com",
        service: config.service ?? "tanstack-open-api-web",
        env: config.env ?? "development",
        version: config.version ?? "0.0.0",
      };

      if (applicationId && clientToken && this.rum) {
        try {
          const replaySampleRate =
            typeof Worker !== "undefined" ? (config.sessionReplaySampleRate ?? 20) : 0;
          this.rum.init({
            ...sharedConfig,
            applicationId,
            sessionSampleRate: config.sessionSampleRate ?? 100,
            sessionReplaySampleRate: replaySampleRate,
            trackUserInteractions: true,
            trackResources: true,
            trackLongTasks: true,
            defaultPrivacyLevel: "mask-user-input",
            allowedTracingUrls: (config.apiOrigins ?? []).map((match) => ({
              match,
              propagatorTypes: ["tracecontext"],
            })),
            traceSampleRate: config.traceSampleRate ?? 100,
          });

          if (config.router) {
            this.initRouter(config.router);
          }
        } catch (err) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[DatadogObservabilityAdapter] Failed to initialize RUM:", err);
          }
        }
      }

      if (clientToken && this.logs) {
        try {
          this.logs.init({
            ...sharedConfig,
            sessionSampleRate: 100,
            forwardErrorsToLogs: true,
            forwardConsoleLogs: ["error"],
          });
        } catch (err) {
          if (typeof console !== "undefined" && console.warn) {
            console.warn("[DatadogObservabilityAdapter] Failed to initialize Logs:", err);
          }
        }
      }
    }
  }

  captureDefect(error: unknown, context?: DefectContext): void {
    if (this.rum && typeof this.rum.addError === "function") {
      this.rum.addError(error, context as Record<string, unknown>);
    }

    if (this.logs?.logger && typeof this.logs.logger.error === "function") {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : JSON.stringify(error);
      this.logs.logger.error(
        message,
        context as Record<string, unknown>,
        error instanceof Error ? error : undefined,
      );
    }
  }

  captureReactError(
    error: unknown,
    errorInfo?: ErrorInfo | { componentStack?: string | null },
  ): void {
    if (this.rum && typeof this.rum.addError === "function") {
      this.rum.addError(error, {
        source: "react",
        componentStack: errorInfo?.componentStack,
      });
    }

    if (this.logs?.logger && typeof this.logs.logger.error === "function") {
      const message = error instanceof Error ? error.message : "React render error";
      this.logs.logger.error(
        message,
        { componentStack: errorInfo?.componentStack },
        error instanceof Error ? error : undefined,
      );
    }
  }

  recordBreadcrumb(entry: BreadcrumbEntry): void {
    if (this.rum && typeof this.rum.addAction === "function") {
      this.rum.addAction(entry.message, {
        category: entry.category,
        ...(entry.data ?? {}),
      });
    }

    if (this.logs?.logger && typeof this.logs.logger.log === "function") {
      const ddStatus: "debug" | "info" | "warn" | "error" =
        entry.level === "warning" ? "warn" : (entry.level ?? "info");
      this.logs.logger.log(
        entry.message,
        { category: entry.category, ...(entry.data ?? {}) },
        ddStatus,
      );
    }
  }

  setUserContext(user: TelemetryUser | null): void {
    if (user) {
      const userData = {
        id: user.id,
        email: user.email ?? undefined,
        name: (user.name as string | undefined) ?? undefined,
      };

      if (this.rum && typeof this.rum.setUser === "function") {
        this.rum.setUser(userData);
      }
      if (this.logs && typeof this.logs.setUser === "function") {
        this.logs.setUser(userData);
      }
    } else {
      this.clearUserContext();
    }
  }

  clearUserContext(): void {
    if (this.rum && typeof this.rum.clearUser === "function") {
      this.rum.clearUser();
    }
    if (this.logs && typeof this.logs.clearUser === "function") {
      this.logs.clearUser();
    }
  }

  setUser(user: TelemetryUser | null): void {
    this.setUserContext(user);
  }

  initRouter(router: AnyRouter): void {
    if (
      this.rum &&
      typeof this.rum.startView === "function" &&
      typeof router?.subscribe === "function"
    ) {
      router.subscribe(
        "onResolved",
        (event: {
          pathChanged?: boolean;
          matches?: Array<{ routeId?: string; pathname?: string }>;
          toLocation?: { pathname?: string };
        }) => {
          if (event?.pathChanged) {
            const leafMatch = event.matches?.[event.matches.length - 1];
            const viewPath =
              leafMatch?.routeId || leafMatch?.pathname || event.toLocation?.pathname;
            if (viewPath) {
              this.rum?.startView({ name: viewPath });
            }
          }
        },
      );
    }
  }
}

export function createDatadogAdapter(
  config: DatadogAdapterConfig,
  sdks?: DatadogSdks,
): DatadogObservabilityAdapter {
  return new DatadogObservabilityAdapter(config, sdks);
}
