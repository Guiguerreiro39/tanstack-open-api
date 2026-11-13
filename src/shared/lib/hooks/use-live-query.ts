import {
  type MutationKey,
  type QueryKey,
  type UseQueryOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { Schema } from "effect";
import { createParser } from "eventsource-parser";
import { useEffect, useRef, useState } from "react";
import {
  type AnyApiError,
  decodeApiError,
  type FunctionDescriptor,
  SchemaDecodeError,
  type UseEffectQueryResult,
  useEffectQuery,
} from "@/shared/api/contracts";
import { FetchError, type HonoErrorEnvelope } from "@/shared/api/fetch";
import { resolveApiUrl } from "@/shared/config/env";
import { getObservabilityService, recordErrorOrDefect } from "@/shared/observability";

export type LiveConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

export interface UseLiveQueryOptions<
  TQueryFnData extends I,
  A,
  E,
  I = unknown,
  TError = unknown,
  TQueryKey extends QueryKey = QueryKey,
> {
  readonly queryOptions: UseQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey>;
  readonly descriptor: FunctionDescriptor<A, E, I>;
  /** Relative or absolute SSE path (e.g. Orval's `getGetApiV1TasksLiveUrl(params)`) */
  readonly liveUrl: string;
  /** Optional Bearer token or async getter; when omitted, uses browser EventSource with credentials */
  readonly bearerToken?:
    | string
    | (() => string | null | undefined | Promise<string | null | undefined>);
  readonly enabled?: boolean;
  readonly baseDelayMs?: number;
  readonly maxDelayMs?: number;
  readonly mutationKey?: MutationKey;
  readonly onStreamError?: (error: AnyApiError | SchemaDecodeError) => void;
}

export type UseLiveQueryResult<A, E> = UseEffectQueryResult<A, E> & {
  readonly liveStatus: LiveConnectionStatus;
  readonly streamError: AnyApiError | SchemaDecodeError | null;
  readonly lastPingAt: number | null;
};

interface SseErrorEnvelope {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly requestId?: string;
    readonly details?: unknown;
  };
}

function decodeSseErrorFrame(raw: string): AnyApiError {
  try {
    const parsed = JSON.parse(raw) as SseErrorEnvelope;
    if (parsed?.error) {
      const code = parsed.error.code ?? "INTERNAL_SERVER_ERROR";
      const status =
        code === "UNAUTHORIZED"
          ? 401
          : code === "FORBIDDEN"
            ? 403
            : code === "NOT_FOUND"
              ? 404
              : code === "INVALID_CURSOR" || code === "BAD_REQUEST"
                ? 400
                : code === "VALIDATION_ERROR"
                  ? 422
                  : code === "RATE_LIMIT_EXCEEDED"
                    ? 429
                    : code === "SERVICE_UNAVAILABLE"
                      ? 503
                      : 500;
      return decodeApiError(
        new FetchError({
          status,
          code,
          message: parsed.error.message ?? "SSE stream error",
          requestId: parsed.error.requestId ?? "unknown",
          data: parsed,
        }),
      );
    }
  } catch {
    // Fall through to generic error
  }
  return decodeApiError(new Error(raw || "SSE stream error"));
}

export function useLiveQuery<
  TQueryFnData extends I,
  A,
  E,
  I = unknown,
  TError = unknown,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseLiveQueryOptions<TQueryFnData, A, E, I, TError, TQueryKey>,
): UseLiveQueryResult<A, E> {
  const {
    queryOptions,
    descriptor,
    liveUrl,
    bearerToken,
    enabled = true,
    baseDelayMs = 1_000,
    maxDelayMs = 30_000,
    mutationKey = ["tasks", "mutation"],
    onStreamError,
  } = options;

  const queryClient = useQueryClient();
  const isEnabled = queryOptions.enabled !== false && enabled;

  const [liveStatus, setLiveStatus] = useState<LiveConnectionStatus>(
    isEnabled ? "connecting" : "idle",
  );
  const [streamError, setStreamError] = useState<AnyApiError | SchemaDecodeError | null>(null);
  const [lastPingAt, setLastPingAt] = useState<number | null>(null);

  const queryResult = useEffectQuery(
    {
      ...queryOptions,
      enabled: isEnabled,
      staleTime: liveStatus === "connected" ? Number.POSITIVE_INFINITY : queryOptions.staleTime,
    },
    descriptor,
  );

  const queryKeyRef = useRef(queryOptions.queryKey);
  queryKeyRef.current = queryOptions.queryKey;
  const descriptorRef = useRef(descriptor);
  descriptorRef.current = descriptor;
  const onStreamErrorRef = useRef(onStreamError);
  onStreamErrorRef.current = onStreamError;
  const bearerTokenRef = useRef(bearerToken);
  bearerTokenRef.current = bearerToken;
  const mutationKeyRef = useRef(mutationKey);
  mutationKeyRef.current = mutationKey;

  const bufferedSnapshotRef = useRef<unknown | null>(null);

  // Subscribe to mutation cache to flush buffered snapshots when active mutations reach 0
  useEffect(() => {
    const unsubscribe = queryClient.getMutationCache().subscribe(() => {
      const activeMutations = queryClient.isMutating({
        mutationKey: mutationKeyRef.current,
      });

      if (activeMutations === 0 && bufferedSnapshotRef.current !== null) {
        const flushData = bufferedSnapshotRef.current;
        bufferedSnapshotRef.current = null;
        queryClient.setQueryData(queryKeyRef.current as QueryKey, flushData);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [queryClient]);

  const hasBearerMode = bearerToken !== undefined;

  useEffect(() => {
    if (!isEnabled) {
      setLiveStatus("idle");
      return;
    }

    const fullUrl = resolveApiUrl(liveUrl);
    setLiveStatus("connecting");
    setStreamError(null);

    const handleSnapshotData = (rawData: unknown) => {
      let parsed: unknown;
      if (typeof rawData === "string") {
        try {
          parsed = JSON.parse(rawData);
        } catch (cause) {
          const err = new SchemaDecodeError({ path: descriptorRef.current.path, cause });
          setStreamError(err);
          onStreamErrorRef.current?.(err);
          recordErrorOrDefect(getObservabilityService(), err, { path: descriptorRef.current.path });
          return;
        }
      } else {
        parsed = rawData;
      }

      const validation = Schema.decodeUnknownEither(descriptorRef.current.dataSchema)(parsed);
      if (validation._tag === "Left") {
        const err = new SchemaDecodeError({
          path: descriptorRef.current.path,
          cause: validation.left,
        });
        setStreamError(err);
        onStreamErrorRef.current?.(err);
        recordErrorOrDefect(getObservabilityService(), err, { path: descriptorRef.current.path });
        return;
      }

      setStreamError(null);
      setLiveStatus("connected");

      const activeMutations = queryClient.isMutating({
        mutationKey: mutationKeyRef.current,
      });

      if (activeMutations > 0) {
        // Buffer incoming SSE snapshot so in-flight optimistic updates are not clobbered
        bufferedSnapshotRef.current = parsed;
      } else {
        bufferedSnapshotRef.current = null;
        queryClient.setQueryData(queryKeyRef.current as QueryKey, parsed);
      }
    };

    const handlePingData = (rawData: unknown) => {
      if (typeof rawData === "string") {
        try {
          const parsed = JSON.parse(rawData) as { timestamp?: number };
          setLastPingAt(typeof parsed.timestamp === "number" ? parsed.timestamp : Date.now());
        } catch {
          setLastPingAt(Date.now());
        }
      } else if (typeof rawData === "object" && rawData !== null && "timestamp" in rawData) {
        setLastPingAt(Number((rawData as { timestamp: number }).timestamp));
      } else {
        setLastPingAt(Date.now());
      }
      setLiveStatus("connected");
    };

    // Transport 1: Cookie-based EventSource (default)
    if (!hasBearerMode) {
      if (typeof EventSource === "undefined") {
        return;
      }

      const source = new EventSource(fullUrl, { withCredentials: true });

      const onSnapshot = (event: MessageEvent) => {
        handleSnapshotData(event.data);
      };

      const onPing = (event: MessageEvent) => {
        handlePingData(event.data);
      };

      const onError = (event: Event) => {
        if (
          event instanceof MessageEvent &&
          typeof event.data === "string" &&
          event.data.length > 0
        ) {
          const decoded = decodeSseErrorFrame(event.data);
          setStreamError(decoded);
          onStreamErrorRef.current?.(decoded);
          recordErrorOrDefect(getObservabilityService(), decoded);
          return;
        }

        if (source.readyState === EventSource.CLOSED) {
          setLiveStatus("error");
        } else {
          setLiveStatus("reconnecting");
        }
      };

      source.addEventListener("init", onSnapshot as EventListener);
      source.addEventListener("update", onSnapshot as EventListener);
      source.addEventListener("ping", onPing as EventListener);
      source.addEventListener("error", onError);

      return () => {
        source.removeEventListener("init", onSnapshot as EventListener);
        source.removeEventListener("update", onSnapshot as EventListener);
        source.removeEventListener("ping", onPing as EventListener);
        source.removeEventListener("error", onError);
        source.close();
      };
    }

    // Transport 2: Bearer token via fetch() + eventsource-parser with exponential backoff
    const controller = new AbortController();
    const { signal } = controller;

    void (async () => {
      let attempt = 0;
      let serverRetryMs: number | undefined;

      while (!signal.aborted) {
        try {
          const tokenSource = bearerTokenRef.current;
          const resolvedToken =
            typeof tokenSource === "function" ? await tokenSource() : tokenSource;

          if (!resolvedToken) {
            const err = decodeApiError(
              new FetchError({
                status: 401,
                code: "UNAUTHORIZED",
                message: "Missing Bearer token for live stream",
                requestId: "unknown",
              }),
            );
            setStreamError(err);
            setLiveStatus("error");
            onStreamErrorRef.current?.(err);
            recordErrorOrDefect(getObservabilityService(), err);
            return;
          }

          const response = await fetch(fullUrl, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${resolvedToken}`,
              Accept: "text/event-stream",
            },
            credentials: "include",
            signal,
          });

          if (!response.ok) {
            const headerRequestId = response.headers.get("x-request-id") ?? "unknown";
            let rawBody: unknown;
            try {
              rawBody = await response.json();
            } catch {
              rawBody = undefined;
            }
            const env = (rawBody as SseErrorEnvelope | undefined)?.error;
            const fetchErr = new FetchError({
              status: response.status,
              code: env?.code ?? `HTTP_${response.status}`,
              message: env?.message ?? (response.statusText || `HTTP ${response.status}`),
              requestId: env?.requestId ?? headerRequestId,
              data: rawBody as HonoErrorEnvelope | undefined,
            });
            const decodedErr = decodeApiError(fetchErr);
            setStreamError(decodedErr);
            onStreamErrorRef.current?.(decodedErr);
            recordErrorOrDefect(getObservabilityService(), decodedErr);

            // Halt retries on non-retryable 4xx
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
              setLiveStatus("error");
              return;
            }
            throw fetchErr;
          }

          if (!response.body) {
            throw new Error("SSE response missing readable body");
          }

          attempt = 0;
          const parser = createParser({
            onRetry(retryMs) {
              serverRetryMs = retryMs;
            },
            onEvent(event) {
              if (event.event === "init" || event.event === "update") {
                handleSnapshotData(event.data);
              } else if (event.event === "ping") {
                handlePingData(event.data);
              } else if (event.event === "error") {
                const decoded = decodeSseErrorFrame(event.data);
                setStreamError(decoded);
                onStreamErrorRef.current?.(decoded);
                recordErrorOrDefect(getObservabilityService(), decoded);
              }
            },
          });

          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;
            parser.feed(decoder.decode(value, { stream: true }));
          }
        } catch {
          if (signal.aborted) return;
        }

        if (signal.aborted) return;
        setLiveStatus("reconnecting");

        const base = serverRetryMs ?? baseDelayMs;
        const delayMs = Math.min(maxDelayMs, base * 2 ** attempt);
        attempt += 1;

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, delayMs);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [liveUrl, isEnabled, hasBearerMode, baseDelayMs, maxDelayMs, queryClient]);

  return {
    ...queryResult,
    liveStatus,
    streamError,
    lastPingAt,
  };
}
