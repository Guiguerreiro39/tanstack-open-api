import type { AnyRouter } from "@tanstack/react-router";
import { Context } from "effect";
import type { ErrorInfo } from "react";
import { FetchError } from "@/shared/api/fetch";

export interface TelemetryUser {
  readonly id: string;
  readonly email?: string | null;
  readonly name?: string | null;
  readonly [key: string]: unknown;
}

export interface DefectContext {
  readonly source?: "api" | "schema_decode" | "react_boundary" | "unhandled" | string;
  readonly path?: string;
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly traceId?: string;
  readonly componentStack?: string | null;
  readonly extra?: Record<string, unknown>;
}

export interface BreadcrumbEntry {
  readonly category: string;
  readonly message: string;
  readonly level?: "debug" | "info" | "warning" | "error";
  readonly data?: Record<string, unknown>;
}

export interface ObservabilityService {
  readonly captureDefect: (error: unknown, context?: DefectContext) => void;
  readonly captureReactError: (
    error: unknown,
    errorInfo?: ErrorInfo | { componentStack?: string | null },
  ) => void;
  readonly recordBreadcrumb: (entry: BreadcrumbEntry) => void;
  readonly setUserContext: (user: TelemetryUser | null) => void;
  readonly clearUserContext: () => void;
  readonly setUser?: (user: TelemetryUser | null) => void;
  readonly initRouter?: (router: AnyRouter) => void;
}

export class ObservabilityPort extends Context.Tag("ObservabilityPort")<
  ObservabilityPort,
  ObservabilityService
>() {}

const EXPECTED_DOMAIN_TAGS = new Set([
  "BadRequestError",
  "UnauthorizedError",
  "ForbiddenError",
  "NotFoundError",
  "RequestTimeoutError",
  "ConflictError",
  "PayloadTooLargeError",
  "ValidationError",
  "RateLimitError",
]);

export function isExpectedDomainError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const err = error as Record<string, unknown>;

  if (typeof err.status === "number") {
    return err.status >= 400 && err.status < 500;
  }

  if (typeof err._tag === "string") {
    return EXPECTED_DOMAIN_TAGS.has(err._tag);
  }

  return false;
}

export function isDefect(error: unknown): boolean {
  if (isExpectedDomainError(error)) {
    return false;
  }

  if (typeof error === "object" && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.status === "number" && err.status < 400) {
      return false;
    }
  }

  return true;
}

export function extractDefectContext(error: unknown): DefectContext {
  if (typeof error !== "object" || error === null) {
    return { source: "unhandled" };
  }

  const err = error as Record<string, unknown>;

  if (error instanceof FetchError || typeof err.status === "number") {
    return {
      source: "api",
      status: err.status as number | undefined,
      code: err.code as string | undefined,
      requestId: err.requestId as string | undefined,
      traceId: err.traceId as string | undefined,
    };
  }

  if (err._tag === "SchemaDecodeError" || err.name === "SchemaDecodeError") {
    return {
      source: "schema_decode",
      path: (err.path as string | undefined) ?? undefined,
    };
  }

  return {
    source: "unhandled",
  };
}

function sanitizeBreadcrumbData(
  data?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!data) return undefined;

  const redactKeys = new Set([
    "password",
    "rawinput",
    "token",
    "secret",
    "authorization",
    "cookie",
  ]);

  function sanitizeValue(val: unknown): unknown {
    if (val === null || val === undefined) return val;
    if (Array.isArray(val)) {
      return val.map(sanitizeValue);
    }
    if (typeof val === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
        if (redactKeys.has(k.toLowerCase())) {
          sanitized[k] = "[REDACTED]";
        } else {
          sanitized[k] = sanitizeValue(v);
        }
      }
      return sanitized;
    }
    return val;
  }

  return sanitizeValue(data) as Record<string, unknown>;
}

export function recordErrorOrDefect(
  observability: ObservabilityService,
  error: unknown,
  context?: DefectContext,
): void {
  if (isDefect(error)) {
    observability.captureDefect(error, {
      ...extractDefectContext(error),
      ...context,
    });
    return;
  }

  const err = error as Record<string, unknown>;
  const status = typeof err.status === "number" ? err.status : undefined;
  const requestId = typeof err.requestId === "string" ? err.requestId : undefined;
  const message =
    typeof err.message === "string"
      ? err.message
      : error instanceof Error
        ? error.message
        : String(error);

  let rawData: Record<string, unknown> | undefined;
  if (err.data && typeof err.data === "object") {
    rawData = err.data as Record<string, unknown>;
  } else if (err.details && typeof err.details === "object") {
    rawData = { details: err.details };
  }

  observability.recordBreadcrumb({
    category: "api.expected_error",
    level: "warning",
    message: `[${status ?? "domain_error"}] ${message}`,
    data: sanitizeBreadcrumbData({
      status,
      code: err.code,
      requestId,
      ...rawData,
    }),
  });
}
