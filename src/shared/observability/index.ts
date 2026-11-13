import type { AnyRouter } from "@tanstack/react-router";
import { parseEnv } from "@/shared/config/env";
import { createCompositeAdapter } from "./composite-adapter";
import { consoleObservabilityAdapter } from "./console-adapter";
import { createDatadogAdapter } from "./datadog-adapter";
import { noopObservabilityAdapter } from "./noop-adapter";
import type { ObservabilityService } from "./port";
import { createSentryAdapter } from "./sentry-adapter";
import { createSpyObservability } from "./spy-adapter";

export * from "./composite-adapter";
export * from "./console-adapter";
export * from "./datadog-adapter";
export * from "./noop-adapter";
export * from "./port";
export * from "./sentry-adapter";
export * from "./spy-adapter";

export interface ObservabilityEnv {
  MODE?: string;
  DEV?: boolean;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_TRACES_SAMPLE_RATE?: number;
  VITE_SENTRY_REPLAY_SAMPLE_RATE?: number;
  VITE_DD_APPLICATION_ID?: string;
  VITE_DD_CLIENT_TOKEN?: string;
  VITE_DATADOG_CLIENT_TOKEN?: string;
  VITE_DD_SITE?: string;
  VITE_DD_SERVICE?: string;
  VITE_DD_SESSION_SAMPLE_RATE?: number;
  VITE_DD_REPLAY_SAMPLE_RATE?: number;
  VITE_DD_TRACE_SAMPLE_RATE?: number;
  VITE_APP_VERSION?: string;
  VITE_API_URL?: string;
}

export function createObservabilityService(
  rawEnv?: ObservabilityEnv,
  options: { router?: AnyRouter } = {},
): ObservabilityService {
  const parsed = parseEnv();
  const env: ObservabilityEnv = {
    ...parsed.client,
    MODE: parsed.server?.NODE_ENV,
    ...rawEnv,
  };

  const mode =
    env.MODE ??
    (typeof import.meta !== "undefined" && import.meta.env ? import.meta.env.MODE : undefined);
  const isDev = mode === "development" || Boolean(env.DEV);

  if (mode === "test") {
    return createSpyObservability();
  }

  const adapters: ObservabilityService[] = [];

  const sentryDsn = env.VITE_SENTRY_DSN;
  const datadogClientToken = env.VITE_DD_CLIENT_TOKEN || env.VITE_DATADOG_CLIENT_TOKEN;
  const datadogAppId = env.VITE_DD_APPLICATION_ID;

  const isDatadogActive = Boolean(datadogClientToken);

  if (sentryDsn) {
    adapters.push(
      createSentryAdapter({
        dsn: sentryDsn,
        environment: mode,
        release: env.VITE_APP_VERSION,
        tracesSampleRate: env.VITE_SENTRY_TRACES_SAMPLE_RATE,
        replaysSessionSampleRate: env.VITE_SENTRY_REPLAY_SAMPLE_RATE,
        isDatadogRumActive: isDatadogActive,
        router: options.router,
        apiOrigins: env.VITE_API_URL ? [env.VITE_API_URL] : [],
      }),
    );
  }

  if (datadogClientToken) {
    adapters.push(
      createDatadogAdapter({
        clientToken: datadogClientToken,
        applicationId: datadogAppId,
        site: env.VITE_DD_SITE,
        service: env.VITE_DD_SERVICE,
        env: mode,
        version: env.VITE_APP_VERSION,
        sessionSampleRate: env.VITE_DD_SESSION_SAMPLE_RATE,
        sessionReplaySampleRate: env.VITE_DD_REPLAY_SAMPLE_RATE,
        traceSampleRate: env.VITE_DD_TRACE_SAMPLE_RATE,
        apiOrigins: env.VITE_API_URL ? [env.VITE_API_URL] : [],
        router: options.router,
      }),
    );
  }

  if (adapters.length === 0) {
    return isDev ? consoleObservabilityAdapter : noopObservabilityAdapter;
  }

  if (adapters.length === 1) {
    activeObservabilityService = adapters[0];
    return adapters[0];
  }

  const composite = createCompositeAdapter(adapters);
  activeObservabilityService = composite;
  return composite;
}

let activeObservabilityService: ObservabilityService | undefined;

export function getObservabilityService(): ObservabilityService {
  if (!activeObservabilityService) {
    activeObservabilityService = createObservabilityService();
  }
  return activeObservabilityService;
}

export function setObservabilityService(service: ObservabilityService | undefined): void {
  activeObservabilityService = service;
}
