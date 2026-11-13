import { describe, expect, it } from "vitest";
import { FetchError } from "@/shared/api/fetch";
import {
  extractDefectContext,
  isDefect,
  isExpectedDomainError,
  ObservabilityPort,
  recordErrorOrDefect,
} from "../port";
import { createSpyObservability } from "../spy-adapter";

describe("ObservabilityPort and Error Taxonomy", () => {
  it("defines ObservabilityPort as an Effect Context.Tag", () => {
    expect(ObservabilityPort).toBeDefined();
    expect(ObservabilityPort.key).toBe("ObservabilityPort");
  });

  describe("isDefect and isExpectedDomainError", () => {
    it("classifies 5xx FetchErrors as defects", () => {
      const error500 = new FetchError({
        status: 500,
        message: "Internal Server Error",
        code: "INTERNAL_SERVER_ERROR",
        requestId: "req_500",
      });
      const error503 = new FetchError({
        status: 503,
        message: "Service Unavailable",
        code: "SERVICE_UNAVAILABLE",
      });

      expect(isDefect(error500)).toBe(true);
      expect(isExpectedDomainError(error500)).toBe(false);

      expect(isDefect(error503)).toBe(true);
      expect(isExpectedDomainError(error503)).toBe(false);
    });

    it("classifies 4xx FetchErrors as expected domain errors and NOT defects", () => {
      const statuses = [400, 401, 403, 404, 408, 409, 413, 422, 429];
      for (const status of statuses) {
        const err = new FetchError({
          status,
          message: `HTTP ${status}`,
          code: `ERROR_${status}`,
          requestId: `req_${status}`,
        });
        expect(isDefect(err)).toBe(false);
        expect(isExpectedDomainError(err)).toBe(true);
      }
    });

    it("classifies SchemaDecodeError and UnknownError as defects", () => {
      const schemaError = { _tag: "SchemaDecodeError", message: "Invalid schema", path: "/tasks" };
      const unknownError = { _tag: "UnknownError", message: "Network connection refused" };

      expect(isDefect(schemaError)).toBe(true);
      expect(isExpectedDomainError(schemaError)).toBe(false);

      expect(isDefect(unknownError)).toBe(true);
      expect(isExpectedDomainError(unknownError)).toBe(false);
    });

    it("classifies standard unexpected exceptions as defects", () => {
      const renderError = new TypeError("Cannot read properties of undefined (reading 'title')");
      expect(isDefect(renderError)).toBe(true);
      expect(isExpectedDomainError(renderError)).toBe(false);
    });
  });

  describe("recordErrorOrDefect", () => {
    it("reports unexpected defects via captureDefect", () => {
      const spy = createSpyObservability();
      const defect500 = new FetchError({
        status: 500,
        message: "Database down",
        requestId: "req_db_down",
        traceId: "trace_db_down",
      });

      recordErrorOrDefect(spy, defect500);

      expect(spy.defects).toHaveLength(1);
      expect(spy.defects[0].error).toBe(defect500);
      expect(spy.defects[0].context?.status).toBe(500);
      expect(spy.defects[0].context?.requestId).toBe("req_db_down");
      expect(spy.defects[0].context?.traceId).toBe("trace_db_down");
      expect(spy.breadcrumbs).toHaveLength(0);
    });

    it("records expected 4xx domain errors as breadcrumbs instead of defects", () => {
      const spy = createSpyObservability();
      const error401 = new FetchError({
        status: 401,
        message: "Unauthorized session",
        code: "UNAUTHORIZED",
        requestId: "req_unauth",
      });

      recordErrorOrDefect(spy, error401);

      expect(spy.defects).toHaveLength(0);
      expect(spy.breadcrumbs).toHaveLength(1);
      expect(spy.breadcrumbs[0].category).toBe("api.expected_error");
      expect(spy.breadcrumbs[0].level).toBe("warning");
      expect(spy.breadcrumbs[0].message).toContain("Unauthorized session");
      expect(spy.breadcrumbs[0].data?.status).toBe(401);
      expect(spy.breadcrumbs[0].data?.requestId).toBe("req_unauth");
    });

    it("redacts raw sensitive form input details on 422 ValidationError breadcrumbs", () => {
      const spy = createSpyObservability();
      const error422 = new FetchError({
        status: 422,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        requestId: "req_val_err",
        data: {
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [
              { field: "password", message: "Too short", rawInput: "secret123" },
              { field: "email", message: "Invalid email", rawInput: "bad@email" },
            ],
          },
        },
      });

      recordErrorOrDefect(spy, error422);

      expect(spy.defects).toHaveLength(0);
      expect(spy.breadcrumbs).toHaveLength(1);
      const breadcrumb = spy.breadcrumbs[0];
      expect(breadcrumb.category).toBe("api.expected_error");
      const serialized = JSON.stringify(breadcrumb.data);
      expect(serialized).not.toContain("secret123");
    });
  });

  describe("extractDefectContext", () => {
    it("extracts requestId, traceId, status, and code from FetchError", () => {
      const fetchError = new FetchError({
        status: 503,
        message: "Maintenance",
        code: "SERVICE_UNAVAILABLE",
        requestId: "req_maint_1",
        traceId: "trace_maint_1",
      });

      const context = extractDefectContext(fetchError);
      expect(context.status).toBe(503);
      expect(context.code).toBe("SERVICE_UNAVAILABLE");
      expect(context.requestId).toBe("req_maint_1");
      expect(context.traceId).toBe("trace_maint_1");
      expect(context.source).toBe("api");
    });
  });
});
