import { Data, Effect, Schema } from "effect";
import { describe, expect, it, vi } from "vitest";
import { FetchError } from "@/shared/api/fetch";
import type { ObservabilityService } from "@/shared/observability";
import {
  BadRequestError,
  ConflictError,
  decodeApiError,
  defineContract,
  ForbiddenError,
  getNextCursorParam,
  InternalServerError,
  isInvalidCursorError,
  matchEffect,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitError,
  RequestTimeoutError,
  SchemaDecodeError,
  ServiceUnavailableError,
  UnauthorizedError,
  UnknownError,
  ValidationError,
} from "../contracts";

describe("Contracts & Error Taxonomy", () => {
  describe("decodeApiError", () => {
    it("maps 400 BadRequestError with code and details", () => {
      const fetchError = new FetchError({
        status: 400,
        message: "Invalid cursor token",
        code: "INVALID_CURSOR",
        requestId: "req-400",
        data: {
          error: {
            code: "INVALID_CURSOR",
            message: "Invalid cursor token",
            requestId: "req-400",
          },
        },
      });

      const decoded = decodeApiError(fetchError);
      expect(decoded._tag).toBe("BadRequestError");
      expect(decoded).toBeInstanceOf(BadRequestError);
      expect((decoded as BadRequestError).status).toBe(400);
      expect((decoded as BadRequestError).code).toBe("INVALID_CURSOR");
      expect((decoded as BadRequestError).requestId).toBe("req-400");
    });

    it("maps 401 UnauthorizedError", () => {
      const err = new FetchError({
        status: 401,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
        requestId: "req-401",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("UnauthorizedError");
      expect(decoded).toBeInstanceOf(UnauthorizedError);
      expect((decoded as UnauthorizedError).status).toBe(401);
    });

    it("maps 403 ForbiddenError", () => {
      const err = new FetchError({
        status: 403,
        message: "Forbidden",
        code: "FORBIDDEN",
        requestId: "req-403",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("ForbiddenError");
      expect(decoded).toBeInstanceOf(ForbiddenError);
    });

    it("maps 404 NotFoundError", () => {
      const err = new FetchError({
        status: 404,
        message: "Resource not found",
        code: "NOT_FOUND",
        requestId: "req-404",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("NotFoundError");
      expect(decoded).toBeInstanceOf(NotFoundError);
    });

    it("maps 408 RequestTimeoutError", () => {
      const err = new FetchError({
        status: 408,
        message: "Request timeout",
        code: "REQUEST_TIMEOUT",
        requestId: "req-408",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("RequestTimeoutError");
      expect(decoded).toBeInstanceOf(RequestTimeoutError);
    });

    it("maps 409 ConflictError", () => {
      const err = new FetchError({
        status: 409,
        message: "Conflict detected",
        code: "CONFLICT",
        requestId: "req-409",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("ConflictError");
      expect(decoded).toBeInstanceOf(ConflictError);
    });

    it("maps 413 PayloadTooLargeError", () => {
      const err = new FetchError({
        status: 413,
        message: "Payload too large",
        code: "PAYLOAD_TOO_LARGE",
        requestId: "req-413",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("PayloadTooLargeError");
      expect(decoded).toBeInstanceOf(PayloadTooLargeError);
    });

    it("maps 422 ValidationError with issues parsed from details", () => {
      const issues = [{ path: ["name"], message: "Name is required", code: "custom" }];
      const err = new FetchError({
        status: 422,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        requestId: "req-422",
        data: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            requestId: "req-422",
            details: issues,
          },
        },
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("ValidationError");
      expect(decoded).toBeInstanceOf(ValidationError);
      const valErr = decoded as ValidationError;
      expect(valErr.status).toBe(422);
      expect(valErr.issues).toEqual(issues);
    });

    it("maps 429 RateLimitError", () => {
      const err = new FetchError({
        status: 429,
        message: "Rate limit exceeded",
        code: "RATE_LIMIT_EXCEEDED",
        requestId: "req-429",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("RateLimitError");
      expect(decoded).toBeInstanceOf(RateLimitError);
    });

    it("maps 500 InternalServerError", () => {
      const err = new FetchError({
        status: 500,
        message: "Internal server error",
        code: "INTERNAL_SERVER_ERROR",
        requestId: "req-500",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("InternalServerError");
      expect(decoded).toBeInstanceOf(InternalServerError);
      expect((decoded as InternalServerError).status).toBe(500);
    });

    it("maps 503 ServiceUnavailableError", () => {
      const err = new FetchError({
        status: 503,
        message: "Service unavailable",
        code: "SERVICE_UNAVAILABLE",
        requestId: "req-503",
      });
      const decoded = decodeApiError(err);
      expect(decoded._tag).toBe("ServiceUnavailableError");
      expect(decoded).toBeInstanceOf(ServiceUnavailableError);
    });

    it("maps non-FetchError or unknown error objects to UnknownError", () => {
      const decoded = decodeApiError(new Error("Network connection dropped"));
      expect(decoded._tag).toBe("UnknownError");
      expect(decoded).toBeInstanceOf(UnknownError);
      expect((decoded as UnknownError).message).toBe("Network connection dropped");
    });
  });

  describe("Pagination Helpers", () => {
    it("getNextCursorParam returns nextCursor when hasMore is true", () => {
      expect(getNextCursorParam({ meta: { nextCursor: "cursor_123", hasMore: true } })).toBe(
        "cursor_123",
      );
      expect(getNextCursorParam({ meta: { nextCursor: null, hasMore: true } })).toBeUndefined();
      expect(
        getNextCursorParam({ meta: { nextCursor: "cursor_123", hasMore: false } }),
      ).toBeUndefined();
      expect(getNextCursorParam({})).toBeUndefined();
    });

    it("isInvalidCursorError detects BadRequestError with code INVALID_CURSOR", () => {
      const invalidCursorErr = new BadRequestError({
        status: 400,
        code: "INVALID_CURSOR",
        message: "Invalid cursor token",
        requestId: "req-1",
      });
      const otherBadRequest = new BadRequestError({
        status: 400,
        code: "BAD_REQUEST",
        message: "Other error",
        requestId: "req-2",
      });
      const notFoundErr = new NotFoundError({
        status: 404,
        code: "NOT_FOUND",
        message: "Not found",
        requestId: "req-3",
      });

      expect(isInvalidCursorError(invalidCursorErr)).toBe(true);
      expect(isInvalidCursorError(otherBadRequest)).toBe(false);
      expect(isInvalidCursorError(notFoundErr)).toBe(false);
      expect(isInvalidCursorError(null)).toBe(false);
    });
  });

  describe("defineContract", () => {
    it("creates a FunctionDescriptor pairing operation, path, and dataSchema", () => {
      const ItemSchema = Schema.Struct({ id: Schema.String, title: Schema.String });
      const contract = defineContract({
        operation: "GetApiV1Tasks",
        path: "/api/v1/tasks",
        dataSchema: ItemSchema,
      });

      expect(contract.path).toBe("/api/v1/tasks");
      expect(contract.dataSchema).toBe(ItemSchema);
      expect(typeof contract.decodeError).toBe("function");
    });
  });

  describe("matchEffect", () => {
    const dummyQuery = <E = never, T = { name: string }>(
      overrides: Partial<{
        data: T;
        error: unknown;
        isPending: boolean;
        isLoading: boolean;
        isIdle: boolean;
        isRefetching: boolean;
        toEffect: () => Effect.Effect<T, E>;
      }> = {},
    ) => ({
      data: undefined as T | undefined,
      error: null,
      isPending: false,
      isLoading: false,
      isRefetching: false,
      toEffect: () => Effect.succeed({ name: "Clean code" }) as unknown as Effect.Effect<T, E>,
      ...overrides,
    });

    it("renders onPending only when isPending is true", () => {
      const query = dummyQuery({ isPending: true });
      const result = matchEffect(query, {
        onPending: () => "PENDING",
        onFailure: () => "FAILURE",
        onSuccess: (data: { name: string }) => `SUCCESS: ${data.name}`,
      });
      expect(result).toBe("PENDING");
    });

    it("renders onSuccess when isPending is false even if isRefetching is true (background refetch)", () => {
      const query = dummyQuery({
        isPending: false,
        isRefetching: true,
        toEffect: () => Effect.succeed({ name: "Clean code" }),
      });
      const result = matchEffect(query, {
        onPending: () => "PENDING",
        onFailure: () => "FAILURE",
        onSuccess: (data: { name: string }) => `SUCCESS: ${data.name}`,
      });
      expect(result).toBe("SUCCESS: Clean code");
    });

    it("renders onPending during refetch if showPendingOnRefetch is true", () => {
      const query = dummyQuery({
        isPending: false,
        isRefetching: true,
      });
      const result = matchEffect(
        query,
        {
          onPending: () => "PENDING",
          onFailure: () => "FAILURE",
          onSuccess: () => "SUCCESS",
        },
        { showPendingOnRefetch: true },
      );
      expect(result).toBe("PENDING");
    });

    it("reports SchemaDecodeError defect to ObservabilityPort", () => {
      const captureDefect = vi.fn();
      const recordBreadcrumb = vi.fn();
      const obs: ObservabilityService = {
        captureDefect,
        captureReactError: vi.fn(),
        recordBreadcrumb,
        setUserContext: vi.fn(),
        clearUserContext: vi.fn(),
      };

      const decodeErr = new SchemaDecodeError({ path: "/api/v1/tasks", cause: "Type error" });
      const query = dummyQuery({
        isPending: false,
        toEffect: () => Effect.fail(decodeErr),
      });

      const result = matchEffect(
        query,
        {
          onPending: () => "PENDING",
          onFailure: (err) => `FAILED: ${err._tag}`,
          onSuccess: () => "SUCCESS",
        },
        { observability: obs },
      );

      expect(result).toBe("FAILED: SchemaDecodeError");
      expect(captureDefect).toHaveBeenCalledTimes(1);
      expect(recordBreadcrumb).not.toHaveBeenCalled();
    });

    it("reports InternalServerError defect to ObservabilityPort", () => {
      const captureDefect = vi.fn();
      const obs: ObservabilityService = {
        captureDefect,
        captureReactError: vi.fn(),
        recordBreadcrumb: vi.fn(),
        setUserContext: vi.fn(),
        clearUserContext: vi.fn(),
      };

      const serverErr = new InternalServerError({
        status: 500,
        code: "INTERNAL_SERVER_ERROR",
        message: "Crash",
        requestId: "req-crash",
      });
      const query = dummyQuery({
        isPending: false,
        toEffect: () => Effect.fail(serverErr),
      });

      matchEffect(
        query,
        {
          onPending: () => "PENDING",
          onFailure: () => "FAILURE",
          onSuccess: () => "SUCCESS",
        },
        { observability: obs },
      );

      expect(captureDefect).toHaveBeenCalledTimes(1);
    });

    it("records expected 4xx domain errors as breadcrumbs to ObservabilityPort", () => {
      const captureDefect = vi.fn();
      const recordBreadcrumb = vi.fn();
      const obs: ObservabilityService = {
        captureDefect,
        captureReactError: vi.fn(),
        recordBreadcrumb,
        setUserContext: vi.fn(),
        clearUserContext: vi.fn(),
      };

      const badReq = new BadRequestError({
        status: 400,
        code: "BAD_REQUEST",
        message: "Missing parameter",
        requestId: "req-bad",
      });
      const query = dummyQuery({
        isPending: false,
        toEffect: () => Effect.fail(badReq),
      });

      matchEffect(
        query,
        {
          onPending: () => "PENDING",
          onFailure: () => "FAILURE",
          onSuccess: () => "SUCCESS",
        },
        { observability: obs },
      );

      expect(captureDefect).not.toHaveBeenCalled();
      expect(recordBreadcrumb).toHaveBeenCalledTimes(1);
      expect(recordBreadcrumb).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "api.expected_error",
          level: "warning",
        }),
      );
    });

    it("dispatches to onTag handler when tagged error matches instead of onFailure", () => {
      const forbidden = new ForbiddenError({
        status: 403,
        code: "FORBIDDEN",
        message: "You cannot view this resource",
        requestId: "req-403",
      });
      const query = dummyQuery({
        isPending: false,
        toEffect: () => Effect.fail(forbidden),
      });

      const onFailure = vi.fn(() => "FAILURE");
      const onForbidden = vi.fn((err: ForbiddenError) => `FORBIDDEN: ${err.message}`);

      const result = matchEffect(query, {
        onPending: () => "PENDING",
        onSuccess: () => "SUCCESS",
        onTag: {
          ForbiddenError: onForbidden,
        },
        onFailure,
      });

      expect(result).toBe("FORBIDDEN: You cannot view this resource");
      expect(onForbidden).toHaveBeenCalledWith(forbidden);
      expect(onFailure).not.toHaveBeenCalled();
    });

    it("falls back to onFailure when tagged error is not matched in onTag", () => {
      const notFound = new NotFoundError({
        status: 404,
        code: "NOT_FOUND",
        message: "Task 42 not found",
        requestId: "req-404",
      });
      const query = dummyQuery<NotFoundError | ForbiddenError>({
        isPending: false,
        toEffect: () => Effect.fail(notFound),
      });

      const onFailure = vi.fn(
        (err: NotFoundError | ForbiddenError | SchemaDecodeError) => `FALLBACK: ${err._tag}`,
      );
      const onForbidden = vi.fn(() => "FORBIDDEN");

      const result = matchEffect(query, {
        onPending: () => "PENDING",
        onSuccess: () => "SUCCESS",
        onTag: {
          ForbiddenError: onForbidden,
        },
        onFailure,
      });

      expect(result).toBe("FALLBACK: NotFoundError");
      expect(onFailure).toHaveBeenCalledWith(notFound);
      expect(onForbidden).not.toHaveBeenCalled();
    });

    it("falls back to onFailure when error is untagged or arbitrary Error", () => {
      const rawError = new Error("Transport socket hang up");
      const query = dummyQuery<Error>({
        isPending: false,
        toEffect: () => Effect.fail(rawError),
      });

      const onFailure = vi.fn(
        (err: Error | SchemaDecodeError) =>
          `FALLBACK: ${err instanceof Error ? err.message : "unknown"}`,
      );
      const onForbidden = vi.fn(() => "FORBIDDEN");

      const result = matchEffect(query, {
        onPending: () => "PENDING",
        onSuccess: () => "SUCCESS",
        onTag: {
          SchemaDecodeError: onForbidden,
        },
        onFailure,
      });

      expect(result).toBe("FALLBACK: Transport socket hang up");
      expect(onFailure).toHaveBeenCalledWith(rawError);
    });

    it("supports onTag for SchemaDecodeError and invokes tag handler", () => {
      const decodeErr = new SchemaDecodeError({
        path: "/api/v1/tasks",
        cause: "Expected string, got number",
      });
      const query = dummyQuery<SchemaDecodeError>({
        isPending: false,
        toEffect: () => Effect.fail(decodeErr),
      });

      const onDecode = vi.fn((err: SchemaDecodeError) => `SCHEMA_DRIFT: ${err.path}`);
      const onFailure = vi.fn(() => "FAILURE");

      const result = matchEffect(query, {
        onPending: () => "PENDING",
        onSuccess: () => "SUCCESS",
        onTag: {
          SchemaDecodeError: onDecode,
        },
        onFailure,
      });

      expect(result).toBe("SCHEMA_DRIFT: /api/v1/tasks");
      expect(onDecode).toHaveBeenCalledWith(decodeErr);
      expect(onFailure).not.toHaveBeenCalled();
    });

    it("dispatches to onTag when provided via MatchEffectOptions and allows handlers.onTag override", () => {
      const badReq = new BadRequestError({
        status: 400,
        code: "BAD_REQUEST",
        message: "Invalid query parameter",
        requestId: "req-opts",
      });
      const query = dummyQuery<BadRequestError>({
        isPending: false,
        toEffect: () => Effect.fail(badReq),
      });

      const onOptsBadRequest = (err: BadRequestError) => `OPTS: ${err.code}`;
      const onHandlerBadRequest = (err: BadRequestError) => `HANDLER: ${err.code}`;

      // 1. When passed via options:
      const resultFromOpts = matchEffect(
        query,
        {
          onPending: () => "PENDING",
          onSuccess: () => "SUCCESS",
          onFailure: () => "FAILURE",
        },
        {
          onTag: {
            BadRequestError: onOptsBadRequest,
          },
        },
      );
      expect(resultFromOpts).toBe("OPTS: BAD_REQUEST");

      // 2. handlers.onTag overrides options.onTag:
      const resultOverridden = matchEffect(
        query,
        {
          onPending: () => "PENDING",
          onSuccess: () => "SUCCESS",
          onTag: {
            BadRequestError: onHandlerBadRequest,
          },
          onFailure: () => "FAILURE",
        },
        {
          onTag: {
            BadRequestError: onOptsBadRequest,
          },
        },
      );
      expect(resultOverridden).toBe("HANDLER: BAD_REQUEST");
    });

    it("records observability breadcrumb/defect before invoking onTag handler", () => {
      const order: string[] = [];
      const recordBreadcrumb = vi.fn(() => {
        order.push("observability");
      });
      const obs: ObservabilityService = {
        captureDefect: vi.fn(),
        captureReactError: vi.fn(),
        recordBreadcrumb,
        setUserContext: vi.fn(),
        clearUserContext: vi.fn(),
      };

      const badReq = new BadRequestError({
        status: 400,
        code: "BAD_REQUEST",
        message: "Validation failure",
        requestId: "req-obs-order",
      });
      const query = dummyQuery<BadRequestError>({
        isPending: false,
        toEffect: () => Effect.fail(badReq),
      });

      const onTagHandler = vi.fn((err: BadRequestError) => {
        order.push(`onTag:${err.code}`);
        return "HANDLED_TAG";
      });

      const result = matchEffect(
        query,
        {
          onPending: () => "PENDING",
          onSuccess: () => "SUCCESS",
          onTag: {
            BadRequestError: onTagHandler,
          },
          onFailure: () => "FAILURE",
        },
        { observability: obs },
      );

      expect(result).toBe("HANDLED_TAG");
      expect(order).toEqual(["observability", "onTag:BAD_REQUEST"]);
      expect(recordBreadcrumb).toHaveBeenCalledTimes(1);
    });

    it("maintains non-crashing behavior when query is isPending, isIdle, or refetching with onTag configured", () => {
      const onTag = {
        ForbiddenError: vi.fn(() => "FORBIDDEN"),
      };

      // isPending
      const pendingQuery = dummyQuery<ForbiddenError>({
        isPending: true,
        toEffect: () =>
          Effect.fail(
            new ForbiddenError({ status: 403, code: "403", message: "Denied", requestId: "r" }),
          ),
      });
      expect(
        matchEffect(pendingQuery, {
          onPending: () => "PENDING",
          onSuccess: () => "SUCCESS",
          onTag,
          onFailure: () => "FAILURE",
        }),
      ).toBe("PENDING");

      // isIdle
      const idleQuery = dummyQuery<ForbiddenError>({
        isPending: false,
        isIdle: true,
        toEffect: () => Effect.never,
      });
      expect(
        matchEffect(idleQuery, {
          onPending: () => "PENDING",
          onSuccess: () => "SUCCESS",
          onTag,
          onFailure: () => "FAILURE",
        }),
      ).toBe("PENDING");

      // isRefetching with showPendingOnRefetch: true
      const refetchQuery = dummyQuery<ForbiddenError>({
        isPending: false,
        isRefetching: true,
        toEffect: () => Effect.succeed({ name: "Refetched" }),
      });
      expect(
        matchEffect(
          refetchQuery,
          {
            onPending: () => "PENDING",
            onSuccess: () => "SUCCESS",
            onTag,
            onFailure: () => "FAILURE",
          },
          { showPendingOnRefetch: true },
        ),
      ).toBe("PENDING");

      expect(onTag.ForbiddenError).not.toHaveBeenCalled();
    });

    it("discriminates realistic custom Data.TaggedError classes with full inference", () => {
      class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
        readonly taskId: string;
      }> {}

      class ProjectLockedError extends Data.TaggedError("ProjectLockedError")<{
        readonly projectId: string;
        readonly lockedBy: string;
      }> {}

      type CustomErrors = TaskNotFoundError | ProjectLockedError;

      const lockedError = new ProjectLockedError({
        projectId: "proj-101",
        lockedBy: "alice",
      });

      const query = dummyQuery<CustomErrors>({
        isPending: false,
        toEffect: () => Effect.fail(lockedError),
      });

      const onLocked = (err: ProjectLockedError) => `LOCKED:${err.projectId}:${err.lockedBy}`;
      const onNotFound = (err: TaskNotFoundError) => `NOT_FOUND:${err.taskId}`;

      const result = matchEffect(query, {
        onPending: () => "PENDING",
        onSuccess: () => "SUCCESS",
        onTag: {
          ProjectLockedError: onLocked,
          TaskNotFoundError: onNotFound,
        },
        onFailure: (err) => `FAILED:${err._tag}`,
      });

      expect(result).toBe("LOCKED:proj-101:alice");
    });
  });
});
