import { describe, expect, it, vi } from "vitest";
import type { DatadogSdks } from "../datadog-adapter";
import {
  createCompositeAdapter,
  createDatadogAdapter,
  createObservabilityService,
  createSentryAdapter,
} from "../index";
import type { BreadcrumbEntry, DefectContext, TelemetryUser } from "../port";
import type { SentryModule } from "../sentry-adapter";
import { createSpyObservability } from "../spy-adapter";

describe("Observability Adapters", () => {
  describe("CompositeObservabilityAdapter", () => {
    it("fans out defect, breadcrumb, and user calls to all adapters", () => {
      const spy1 = createSpyObservability();
      const spy2 = createSpyObservability();
      const composite = createCompositeAdapter([spy1, spy2]);

      const testError = new Error("Something broke");
      const defectCtx: DefectContext = {
        source: "api",
        status: 500,
        requestId: "req_comp_1",
      };

      composite.captureDefect(testError, defectCtx);
      expect(spy1.defects).toHaveLength(1);
      expect(spy2.defects).toHaveLength(1);
      expect(spy1.defects[0].error).toBe(testError);
      expect(spy2.defects[0].context?.requestId).toBe("req_comp_1");

      const breadcrumb: BreadcrumbEntry = {
        category: "navigation",
        message: "user clicked button",
      };
      composite.recordBreadcrumb(breadcrumb);
      expect(spy1.breadcrumbs).toHaveLength(1);
      expect(spy2.breadcrumbs).toHaveLength(1);

      const user: TelemetryUser = { id: "user-123", email: "test@example.com" };
      composite.setUserContext(user);
      expect(spy1.currentUser).toEqual(user);
      expect(spy2.currentUser).toEqual(user);

      composite.clearUserContext();
      expect(spy1.currentUser).toBeNull();
      expect(spy2.currentUser).toBeNull();
    });

    it("isolates errors if one adapter throws during dispatch", () => {
      const faultyAdapter = {
        captureDefect: vi.fn().mockImplementation(() => {
          throw new Error("Sentry crash");
        }),
        captureReactError: vi.fn(),
        recordBreadcrumb: vi.fn(),
        setUserContext: vi.fn(),
        clearUserContext: vi.fn(),
      };
      const healthySpy = createSpyObservability();
      const composite = createCompositeAdapter([faultyAdapter, healthySpy]);

      expect(() => {
        composite.captureDefect(new Error("App error"));
      }).not.toThrow();

      expect(faultyAdapter.captureDefect).toHaveBeenCalled();
      expect(healthySpy.defects).toHaveLength(1);
    });
  });

  describe("SentryObservabilityAdapter", () => {
    it("configures Sentry scope tags and captures exceptions on captureDefect", () => {
      const mockScope = {
        setTag: vi.fn(),
        setExtras: vi.fn(),
      };
      const mockSentry = {
        init: vi.fn(),
        captureException: vi.fn(),
        addBreadcrumb: vi.fn(),
        setUser: vi.fn(),
        withScope: vi.fn((callback: (scope: typeof mockScope) => void) => {
          callback(mockScope);
        }),
      };

      const adapter = createSentryAdapter(
        {
          dsn: "https://mock@sentry.io/123",
          environment: "production",
          release: "1.0.0",
        },
        mockSentry as unknown as SentryModule,
      );

      const error = new Error("Database timeout");
      adapter.captureDefect(error, {
        source: "api",
        requestId: "req_sentry_99",
        traceId: "trace_sentry_99",
        status: 504,
        extra: { attempts: 3 },
      });

      expect(mockScope.setTag).toHaveBeenCalledWith("request_id", "req_sentry_99");
      expect(mockScope.setTag).toHaveBeenCalledWith("trace_id", "trace_sentry_99");
      expect(mockScope.setTag).toHaveBeenCalledWith("defect_source", "api");
      expect(mockScope.setExtras).toHaveBeenCalledWith({ attempts: 3 });
      expect(mockSentry.captureException).toHaveBeenCalledWith(error);
    });

    it("forwards user context and breadcrumbs to Sentry", () => {
      const mockSentry = {
        init: vi.fn(),
        captureException: vi.fn(),
        addBreadcrumb: vi.fn(),
        setUser: vi.fn(),
      };

      const adapter = createSentryAdapter(
        { dsn: "https://mock@sentry.io/123" },
        mockSentry as unknown as SentryModule,
      );

      adapter.setUserContext({ id: "user_1", email: "a@b.com", name: "Alice" });
      expect(mockSentry.setUser).toHaveBeenCalledWith({
        id: "user_1",
        email: "a@b.com",
        username: "Alice",
      });

      adapter.clearUserContext();
      expect(mockSentry.setUser).toHaveBeenCalledWith(null);

      adapter.recordBreadcrumb({
        category: "auth",
        message: "User logged in",
        level: "info",
        data: { method: "credentials" },
      });
      expect(mockSentry.addBreadcrumb).toHaveBeenCalledWith({
        category: "auth",
        message: "User logged in",
        level: "info",
        data: { method: "credentials" },
      });
    });
  });

  describe("DatadogObservabilityAdapter", () => {
    it("reports defects to Datadog RUM and Logs", () => {
      const mockRum = {
        init: vi.fn(),
        addError: vi.fn(),
        addAction: vi.fn(),
        setUser: vi.fn(),
        clearUser: vi.fn(),
      };
      const mockLogs = {
        init: vi.fn(),
        logger: {
          error: vi.fn(),
          warn: vi.fn(),
          log: vi.fn(),
        },
        setUser: vi.fn(),
        clearUser: vi.fn(),
      };

      const adapter = createDatadogAdapter(
        {
          clientToken: "dd_token_123",
          applicationId: "dd_app_123",
        },
        { rum: mockRum, logs: mockLogs } as unknown as DatadogSdks,
      );

      const err = new Error("Gateway 502");
      adapter.captureDefect(err, { source: "api", status: 502, requestId: "req_dd_1" });

      expect(mockRum.addError).toHaveBeenCalledWith(err, {
        source: "api",
        status: 502,
        requestId: "req_dd_1",
      });
      expect(mockLogs.logger.error).toHaveBeenCalled();
    });

    it("syncs user context with both Datadog RUM and Logs", () => {
      const mockRum = {
        init: vi.fn(),
        setUser: vi.fn(),
        clearUser: vi.fn(),
      };
      const mockLogs = {
        init: vi.fn(),
        setUser: vi.fn(),
        clearUser: vi.fn(),
      };

      const adapter = createDatadogAdapter({ clientToken: "dd_token_123" }, {
        rum: mockRum,
        logs: mockLogs,
      } as unknown as DatadogSdks);

      const user = { id: "u42", email: "u42@example.com", name: "User 42" };
      adapter.setUserContext(user);
      expect(mockRum.setUser).toHaveBeenCalledWith({
        id: "u42",
        email: "u42@example.com",
        name: "User 42",
      });
      expect(mockLogs.setUser).toHaveBeenCalledWith({
        id: "u42",
        email: "u42@example.com",
        name: "User 42",
      });

      adapter.clearUserContext();
      expect(mockRum.clearUser).toHaveBeenCalled();
      expect(mockLogs.clearUser).toHaveBeenCalled();
    });
  });

  describe("createObservabilityService factory", () => {
    it("returns SpyObservabilityAdapter in test mode", () => {
      const service = createObservabilityService({ MODE: "test" });
      // Should have spy capabilities and capture without console output
      service.recordBreadcrumb({ category: "test", message: "testing" });
      expect(service).toBeDefined();
    });

    it("creates composite adapter when both Sentry and Datadog are configured", () => {
      const service = createObservabilityService({
        MODE: "production",
        VITE_SENTRY_DSN: "https://key@sentry.io/1",
        VITE_DD_CLIENT_TOKEN: "dd-token",
        VITE_DD_APPLICATION_ID: "dd-app",
      });

      expect(service).toBeDefined();
      expect(typeof service.captureDefect).toBe("function");
      expect(typeof service.recordBreadcrumb).toBe("function");
      expect(typeof service.setUserContext).toBe("function");
      expect(typeof service.clearUserContext).toBe("function");
    });
  });
});
