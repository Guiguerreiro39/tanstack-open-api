import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "@/test/msw-server";
import { customFetch, FetchError } from "../fetch";

describe("customFetch and FetchError", () => {
  it("automatically generates valid W3C traceparent and X-Request-Id headers on outbound requests", async () => {
    let capturedHeaders: Headers | undefined;

    server.use(
      http.get("/api/v1/test-trace", ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json({ success: true });
      }),
    );

    const result = await customFetch<{ success: boolean }>("/api/v1/test-trace");
    expect(result).toEqual({ success: true });

    expect(capturedHeaders).toBeDefined();
    const requestId = capturedHeaders?.get("X-Request-Id");
    expect(requestId).toBeDefined();
    expect(requestId).toMatch(/^req_[0-9a-fA-F-]{36}$/);

    const traceparent = capturedHeaders?.get("traceparent");
    expect(traceparent).toBeDefined();
    // W3C traceparent format: 00-{32hex traceId}-{16hex spanId}-01
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    const parts = traceparent?.split("-");
    expect(parts?.[1]).not.toBe("00000000000000000000000000000000");
    expect(parts?.[2]).not.toBe("0000000000000000");
  });

  it("preserves caller-supplied X-Request-Id and traceparent headers", async () => {
    let capturedHeaders: Headers | undefined;
    const customReqId = "req_custom-12345";
    const customTrace = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";

    server.use(
      http.get("/api/v1/test-preserve", ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json({ ok: true });
      }),
    );

    await customFetch<{ ok: boolean }>("/api/v1/test-preserve", {
      headers: {
        "X-Request-Id": customReqId,
        traceparent: customTrace,
      },
    });

    expect(capturedHeaders?.get("X-Request-Id")).toBe(customReqId);
    expect(capturedHeaders?.get("traceparent")).toBe(customTrace);
  });

  it("omits Content-Type application/json when body is FormData", async () => {
    let capturedContentType: string | null = null;

    server.use(
      http.post("/api/v1/upload", ({ request }) => {
        capturedContentType = request.headers.get("Content-Type");
        return HttpResponse.json({ uploaded: true });
      }),
    );

    const formData = new FormData();
    formData.append("file", "test-content");

    await customFetch<{ uploaded: boolean }>("/api/v1/upload", {
      method: "POST",
      body: formData,
    });

    // When FormData is passed, Content-Type should not be application/json
    expect(capturedContentType).not.toBe("application/json");
  });

  it("normalizes hono-open-api error envelope into FetchError", async () => {
    server.use(
      http.get("/api/v1/test-error", () => {
        return HttpResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "Invalid input payload",
              requestId: "req_server-err-789",
              details: [{ field: "name", message: "Required" }],
            },
          },
          {
            status: 422,
            headers: {
              "X-Request-Id": "req_server-err-789",
            },
          },
        );
      }),
    );

    let thrownError: unknown;
    try {
      await customFetch("/api/v1/test-error");
    } catch (err) {
      thrownError = err;
    }

    expect(thrownError).toBeInstanceOf(FetchError);
    const fetchError = thrownError as FetchError;
    expect(fetchError.status).toBe(422);
    expect(fetchError.code).toBe("VALIDATION_ERROR");
    expect(fetchError.message).toBe("Invalid input payload");
    expect(fetchError.requestId).toBe("req_server-err-789");
    expect(fetchError.traceId).toBeDefined();
    expect(fetchError.data?.error?.details).toEqual([{ field: "name", message: "Required" }]);
  });

  it("handles 204 No Content by returning undefined", async () => {
    server.use(
      http.delete("/api/v1/test-delete", () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const result = await customFetch<void>("/api/v1/test-delete", { method: "DELETE" });
    expect(result).toBeUndefined();
  });
});
