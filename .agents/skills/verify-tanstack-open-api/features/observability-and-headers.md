# Verification Flow: Observability & Trace Headers (`observability-and-headers`)

This verification guide validates W3C trace correlation headers, request ID injection, defect reporting, and breadcrumb filtering across all application interactions.

---

## Prerequisites

- Frontend running at `http://localhost:3000`.
- Browser DevTools open (Network & Console tabs) or server proxy logs available.

---

## Verification Steps

### 1. Outbound Trace Correlation Headers

1. Navigate across any route that triggers API calls (e.g. `/showcase`, `/tasks`, or `/files`).
2. Open DevTools **Network** tab and select any outgoing `/api/*` request.
3. Inspect request headers:
   - **`X-Request-Id`**:
     - **Assertion**: Present on every request.
     - **Format**: Valid UUID string (e.g., `f47ac10b-58cc-4372-a567-0e02b2c3d479`).
   - **`traceparent` (W3C Trace Context)**:
     - **Assertion**: Present on every request.
     - **Format**: Matches standard W3C 4-part format: `00-<32-hex-trace-id>-<16-hex-parent-id>-01`.
4. Inspect backend server logs (`hono-open-api`):
   - **Assertion**: The same `X-Request-Id` and trace ID appear in upstream logs, confirming distributed trace correlation across the network boundary.

### 2. Defect Capture (`captureDefect` & `captureReactError`)

1. Trigger a simulated server defect:
   - Request an endpoint that returns HTTP 500 or 502 (e.g. `/api/test-failure`).
2. Observe telemetry activity:
   - **Assertion**: `ObservabilityPort.captureDefect` is invoked with an error tagged as `InternalServerError` or `BadGatewayError`.
   - **Assertion**: Defect payload includes the `requestId`, timestamp, and stack trace.
3. Trigger an uncaught React error:
   - Visit an error boundary test component or crash a render path.
   - **Assertion**: `ObservabilityPort.captureReactError` is invoked and an accessible error boundary fallback is rendered in the UI.

### 3. Breadcrumb Recording for Expected Domain Events

1. Perform common user actions:
   - Submit an invalid form (triggering `422 Unprocessable Entity`).
   - Request a non-existent item (triggering `404 Not Found`).
   - Click navigation links and toggle themes.
2. Observe telemetry activity:
   - **Assertion**: Neither `captureDefect` nor `captureReactError` is invoked for these expected 4xx domain errors.
   - **Assertion**: Events are recorded strictly as PII-safe breadcrumbs via `ObservabilityPort.recordBreadcrumb` (`category: "navigation" | "user-action" | "network"`).

### 4. Adapter Zero-Leak Verification

1. Verify that when telemetry keys (`VITE_SENTRY_DSN`, `VITE_DD_APPLICATION_ID`) are absent:
   - The application gracefully defaults to `ConsoleObservabilityAdapter` or `NoopObservabilityAdapter`.
   - Zero network calls to vendor endpoints (`sentry.io` or `datadoghq.com`) occur.
   - Zero console errors or unhandled promise rejections are thrown.
