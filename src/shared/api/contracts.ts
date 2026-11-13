import {
  type QueryKey,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Data, Effect, Schema } from "effect";
import { useEffect } from "react";
import { FetchError } from "@/shared/api/fetch";
import {
  getObservabilityService,
  type ObservabilityService,
  recordErrorOrDefect,
} from "@/shared/observability";
import type * as apiSchemas from "./generated/schemas";

export interface ApiErrorDetailIssue {
  readonly code?: string;
  readonly path?: ReadonlyArray<string | number>;
  readonly message?: string;
}

export interface BaseApiErrorFields {
  readonly status: number;
  readonly code: string;
  readonly message: string;
  readonly requestId: string;
  readonly details?: unknown;
}

export class SchemaDecodeError extends Data.TaggedError("SchemaDecodeError")<{
  readonly path: string;
  readonly cause: unknown;
}> {}

export class BadRequestError extends Data.TaggedError("BadRequestError")<
  BaseApiErrorFields & { readonly status: 400 }
> {}

export class UnauthorizedError extends Data.TaggedError("UnauthorizedError")<
  BaseApiErrorFields & { readonly status: 401 }
> {}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<
  BaseApiErrorFields & { readonly status: 403 }
> {}

export class NotFoundError extends Data.TaggedError("NotFoundError")<
  BaseApiErrorFields & { readonly status: 404 }
> {}

export class RequestTimeoutError extends Data.TaggedError("RequestTimeoutError")<
  BaseApiErrorFields & { readonly status: 408 }
> {}

export class ConflictError extends Data.TaggedError("ConflictError")<
  BaseApiErrorFields & { readonly status: 409 }
> {}

export class PayloadTooLargeError extends Data.TaggedError("PayloadTooLargeError")<
  BaseApiErrorFields & { readonly status: 413 }
> {}

export class ValidationError extends Data.TaggedError("ValidationError")<
  BaseApiErrorFields & {
    readonly status: 422;
    readonly issues: ReadonlyArray<ApiErrorDetailIssue>;
  }
> {}

export class RateLimitError extends Data.TaggedError("RateLimitError")<
  BaseApiErrorFields & { readonly status: 429 }
> {}

export class InternalServerError extends Data.TaggedError("InternalServerError")<
  BaseApiErrorFields & { readonly status: 500 }
> {}

export class ServiceUnavailableError extends Data.TaggedError("ServiceUnavailableError")<
  BaseApiErrorFields & { readonly status: 503; readonly data?: unknown }
> {}

export class UnknownError extends Data.TaggedError("UnknownError")<{
  readonly message: string;
  readonly status?: number;
  readonly code?: string;
  readonly requestId?: string;
  readonly cause?: unknown;
}> {}

export type AnyApiError =
  | BadRequestError
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | RequestTimeoutError
  | ConflictError
  | PayloadTooLargeError
  | ValidationError
  | RateLimitError
  | InternalServerError
  | ServiceUnavailableError
  | UnknownError;

export type ApiErrorStatus = 400 | 401 | 403 | 404 | 408 | 409 | 413 | 422 | 429 | 500 | 503;

export type StatusToEffectError<Status extends number> =
  | (400 extends Status ? BadRequestError : never)
  | (401 extends Status ? UnauthorizedError : never)
  | (403 extends Status ? ForbiddenError : never)
  | (404 extends Status ? NotFoundError : never)
  | (408 extends Status ? RequestTimeoutError : never)
  | (409 extends Status ? ConflictError : never)
  | (413 extends Status ? PayloadTooLargeError : never)
  | (422 extends Status ? ValidationError : never)
  | (429 extends Status ? RateLimitError : never)
  | (503 extends Status ? ServiceUnavailableError : never)
  | InternalServerError
  | UnknownError;

function extractValidationIssues(details: unknown): ReadonlyArray<ApiErrorDetailIssue> {
  if (Array.isArray(details)) {
    return details.filter(
      (item): item is ApiErrorDetailIssue => typeof item === "object" && item !== null,
    );
  }
  return [];
}

export function decodeApiError(error: unknown): AnyApiError {
  if (
    error instanceof FetchError ||
    (typeof error === "object" && error !== null && "status" in error)
  ) {
    const err = error as FetchError;
    const status = err.status;
    const errorEnv = err.data?.error;
    const code = err.code ?? errorEnv?.code ?? `HTTP_${status}`;
    const message = err.message || errorEnv?.message || err.data?.message || `HTTP error ${status}`;
    const requestId = err.requestId ?? errorEnv?.requestId ?? "unknown";
    const details = err.details ?? errorEnv?.details;

    switch (status) {
      case 400:
        return new BadRequestError({ status: 400, code, message, requestId, details });
      case 401:
        return new UnauthorizedError({ status: 401, code, message, requestId, details });
      case 403:
        return new ForbiddenError({ status: 403, code, message, requestId, details });
      case 404:
        return new NotFoundError({ status: 404, code, message, requestId, details });
      case 408:
        return new RequestTimeoutError({ status: 408, code, message, requestId, details });
      case 409:
        return new ConflictError({ status: 409, code, message, requestId, details });
      case 413:
        return new PayloadTooLargeError({ status: 413, code, message, requestId, details });
      case 422:
        return new ValidationError({
          status: 422,
          code,
          message,
          requestId,
          details,
          issues: extractValidationIssues(details ?? errorEnv?.issues),
        });
      case 429:
        return new RateLimitError({ status: 429, code, message, requestId, details });
      case 500:
        return new InternalServerError({ status: 500, code, message, requestId, details });
      case 503:
        return new ServiceUnavailableError({
          status: 503,
          code,
          message,
          requestId,
          details,
          data: err.data,
        });
      default:
        return new UnknownError({ status, code, message, requestId, cause: error });
    }
  }

  return new UnknownError({
    message: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}

type GeneratedSchemas = typeof apiSchemas;

type HttpSuccessStatus = 200 | 201 | 202 | 204;
type HttpStatusString = `${HttpSuccessStatus}` | `${ApiErrorStatus}`;

/** All operation prefixes emitted by @orval/effect (e.g. "GetApiV1Tasks", "PostApiV1Tasks") */
export type OperationPrefix = {
  [K in keyof GeneratedSchemas]: K extends `${infer Op}${HttpStatusString}Response` ? Op : never;
}[keyof GeneratedSchemas];

/** Extracts all non-2xx HTTP status codes declared on an OpenAPI operation */
export type OperationErrorStatuses<Op extends string> = {
  [K in keyof GeneratedSchemas]: K extends `${Op}${infer Code extends ApiErrorStatus}Response`
    ? Code
    : never;
}[keyof GeneratedSchemas];

export interface FunctionDescriptor<A, E, I = unknown> {
  readonly path: string;
  readonly dataSchema: Schema.Schema<A, I, never>;
  readonly decodeError?: (error: unknown) => E;
  readonly observability?: ObservabilityService;
}

/**
 * Define an API contract backed by an @orval/effect schema and automatic OpenAPI error status inference.
 */
export function defineContract<
  Op extends OperationPrefix,
  S extends Schema.Schema.AnyNoContext,
>(options: {
  readonly operation: Op;
  readonly path: string;
  readonly dataSchema: S;
}): FunctionDescriptor<
  Schema.Schema.Type<S>,
  StatusToEffectError<OperationErrorStatuses<Op>>,
  Schema.Schema.Encoded<S>
>;
export function defineContract<
  S extends Schema.Schema.AnyNoContext,
  const TStatuses extends readonly ApiErrorStatus[] = readonly [],
>(options: {
  readonly path: string;
  readonly dataSchema: S;
  readonly errors?: TStatuses;
}): FunctionDescriptor<
  Schema.Schema.Type<S>,
  StatusToEffectError<TStatuses[number]>,
  Schema.Schema.Encoded<S>
>;
export function defineContract(options: {
  readonly operation?: string;
  readonly path: string;
  readonly dataSchema: Schema.Schema.AnyNoContext;
  readonly errors?: readonly ApiErrorStatus[];
}): FunctionDescriptor<unknown, unknown, unknown> {
  return {
    path: options.path,
    dataSchema: options.dataSchema,
    decodeError: decodeApiError,
  };
}

export type UseEffectQueryResult<T, E> = UseQueryResult<T, unknown> & {
  toEffect: () => Effect.Effect<T, E | SchemaDecodeError>;
};

export function useEffectQuery<
  TQueryFnData extends I,
  A,
  E,
  I = unknown,
  TError = unknown,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryOptions: UseQueryOptions<TQueryFnData, TError, TQueryFnData, TQueryKey>,
  descriptor: FunctionDescriptor<A, E, I>,
): UseEffectQueryResult<A, E> {
  const query = useQuery(queryOptions);
  const queryClient = useQueryClient();
  const obs = descriptor.observability ?? getObservabilityService();

  useEffect(() => {
    if (query.error) {
      const decoder = descriptor.decodeError || decodeApiError;
      const decoded = decoder(query.error) as E;
      if (obs) {
        recordErrorOrDefect(obs, decoded, { path: descriptor.path });
      }
      if (
        (decoded as { status?: number }).status === 401 ||
        (decoded as { _tag?: string })._tag === "UnauthorizedError"
      ) {
        queryClient.setQueryData(["auth", "session"], null);
      }
    }
  }, [query.error, descriptor.path, descriptor.decodeError, obs, queryClient]);

  useEffect(() => {
    if (query.data !== undefined) {
      const parseResult = Schema.decodeUnknownEither(descriptor.dataSchema)(query.data);
      if (parseResult._tag === "Left" && obs) {
        obs.captureDefect(
          new SchemaDecodeError({
            path: descriptor.path,
            cause: parseResult.left,
          }),
        );
      }
    }
  }, [query.data, descriptor.path, descriptor.dataSchema, obs]);

  const toEffect = (): Effect.Effect<A, E | SchemaDecodeError> => {
    if (query.isPending) {
      return Effect.never;
    }

    if (query.error) {
      const decoder = descriptor.decodeError || decodeApiError;
      const decoded = decoder(query.error) as E;
      return Effect.fail(decoded);
    }

    const parseResult = Schema.decodeUnknownEither(descriptor.dataSchema)(query.data);

    if (parseResult._tag === "Left") {
      return Effect.fail(
        new SchemaDecodeError({
          path: descriptor.path,
          cause: parseResult.left,
        }),
      );
    }

    return Effect.succeed(parseResult.right);
  };

  return {
    ...query,
    toEffect,
  } as unknown as UseEffectQueryResult<A, E>;
}

export type UseEffectMutationResult<
  A,
  E,
  TVariables = void,
  TContext = unknown,
> = UseMutationResult<A, unknown, TVariables, TContext> & {
  toEffect: () => Effect.Effect<A, E | SchemaDecodeError>;
};

export function useEffectMutation<
  TData extends I,
  TVariables,
  A,
  E,
  I = unknown,
  TError = unknown,
  TContext = unknown,
>(
  mutationOptions: UseMutationOptions<TData, TError, TVariables, TContext>,
  descriptor: FunctionDescriptor<A, E, I>,
): UseEffectMutationResult<A, E, TVariables, TContext> {
  const mutation = useMutation(mutationOptions);
  const queryClient = useQueryClient();
  const obs = descriptor.observability ?? getObservabilityService();

  useEffect(() => {
    if (mutation.error) {
      const decoder = descriptor.decodeError || decodeApiError;
      const decoded = decoder(mutation.error) as E;
      if (obs) {
        recordErrorOrDefect(obs, decoded, { path: descriptor.path });
      }
      if (
        (decoded as { status?: number }).status === 401 ||
        (decoded as { _tag?: string })._tag === "UnauthorizedError"
      ) {
        queryClient.setQueryData(["auth", "session"], null);
      }
    }
  }, [mutation.error, descriptor.path, descriptor.decodeError, obs, queryClient]);

  useEffect(() => {
    if (mutation.data !== undefined) {
      const parseResult = Schema.decodeUnknownEither(descriptor.dataSchema)(mutation.data);
      if (parseResult._tag === "Left" && obs) {
        obs.captureDefect(
          new SchemaDecodeError({
            path: descriptor.path,
            cause: parseResult.left,
          }),
        );
      }
    }
  }, [mutation.data, descriptor.path, descriptor.dataSchema, obs]);

  const toEffect = (): Effect.Effect<A, E | SchemaDecodeError> => {
    if (mutation.isPending || mutation.isIdle) {
      return Effect.never;
    }

    if (mutation.error) {
      const decoder = descriptor.decodeError || decodeApiError;
      const decoded = decoder(mutation.error) as E;
      return Effect.fail(decoded);
    }

    const parseResult = Schema.decodeUnknownEither(descriptor.dataSchema)(mutation.data);

    if (parseResult._tag === "Left") {
      return Effect.fail(
        new SchemaDecodeError({
          path: descriptor.path,
          cause: parseResult.left,
        }),
      );
    }

    return Effect.succeed(parseResult.right);
  };

  return {
    ...mutation,
    toEffect,
  } as unknown as UseEffectMutationResult<A, E, TVariables, TContext>;
}

export type MatchEffectTag<E> = [unknown] extends [E]
  ? string
  : E | SchemaDecodeError extends { readonly _tag: infer Tag extends string }
    ? Tag
    : never;

export type MatchEffectOnTag<E, Err> = Partial<{
  [Tag in MatchEffectTag<E>]: (
    error: Extract<E | SchemaDecodeError, { readonly _tag: Tag }>,
  ) => Err;
}>;

export interface MatchEffectOptions<E = unknown, Err = unknown> {
  readonly showPendingOnRefetch?: boolean;
  readonly observability?: ObservabilityService;
  readonly onTag?: MatchEffectOnTag<E, Err>;
}

export function matchEffect<T, E, Ok, Err, TagErr = Err>(
  effectQuery: {
    readonly isPending: boolean;
    readonly isIdle?: boolean;
    readonly isRefetching?: boolean;
    readonly toEffect: () => Effect.Effect<T, E | SchemaDecodeError>;
  },
  handlers: {
    readonly onPending: () => Ok;
    readonly onFailure: (error: E | SchemaDecodeError) => Err;
    readonly onSuccess: (data: T) => Ok;
    readonly onTag?: MatchEffectOnTag<E, TagErr>;
  },
  options?: MatchEffectOptions<E, TagErr>,
): Ok | Err | TagErr {
  if (
    effectQuery.isPending ||
    effectQuery.isIdle ||
    (options?.showPendingOnRefetch && effectQuery.isRefetching)
  ) {
    return handlers.onPending();
  }

  const effect = effectQuery.toEffect();
  const obs = options?.observability ?? getObservabilityService();
  const onTag = {
    ...options?.onTag,
    ...handlers.onTag,
  };

  return Effect.runSync(
    Effect.match(effect, {
      onFailure: (error) => {
        if (obs) {
          recordErrorOrDefect(obs, error, {
            path: (error as { path?: string })?.path,
          });
        }

        const tag =
          typeof error === "object" && error !== null && "_tag" in error
            ? (error as { _tag: string })._tag
            : undefined;

        if (tag && Object.hasOwn(onTag, tag)) {
          const handler = (onTag as Record<string, ((err: unknown) => TagErr) | undefined>)[tag];
          if (typeof handler === "function") {
            return handler(error);
          }
        }

        return handlers.onFailure(error);
      },
      onSuccess: (data) => handlers.onSuccess(data),
    }),
  );
}

export function isInvalidCursorError(error: unknown): error is BadRequestError {
  if (typeof error !== "object" || error === null) return false;
  const err = error as Record<string, unknown>;
  return (err._tag === "BadRequestError" || err.status === 400) && err.code === "INVALID_CURSOR";
}

export function getNextCursorParam(lastPage: {
  meta?: { nextCursor?: string | null; hasMore?: boolean };
}): string | undefined {
  if (lastPage?.meta?.hasMore && lastPage.meta.nextCursor) {
    return lastPage.meta.nextCursor;
  }
  return undefined;
}
