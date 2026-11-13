import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { Schema } from "effect";
import { HttpResponse, http } from "msw";
import type React from "react";
import { describe, expect, it } from "vitest";
import { defineContract } from "@/shared/api/contracts";
import { useLiveQuery } from "@/shared/lib/hooks/use-live-query";
import { server } from "@/test/msw-server";

describe("Adversary 1: useLiveQuery Bearer mode missing required observability headers", () => {
  it("omits X-Request-Id and traceparent headers on Bearer SSE stream connection", async () => {
    let capturedHeaders: Headers | null = null;

    server.use(
      http.get("/api/v1/tasks/live", ({ request }) => {
        capturedHeaders = request.headers;
        return new HttpResponse("event: ping\ndata: {}\n\n", {
          headers: {
            "Content-Type": "text/event-stream",
          },
        });
      }),
    );

    const queryClient = new QueryClient();
    const contract = defineContract({
      path: "/api/v1/tasks",
      dataSchema: Schema.Struct({
        data: Schema.Array(Schema.Unknown),
        meta: Schema.Struct({ nextCursor: Schema.NullOr(Schema.String), hasMore: Schema.Boolean }),
      }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useLiveQuery({
          queryOptions: {
            queryKey: ["tasks", "list"],
            queryFn: async () => ({ data: [], meta: { nextCursor: null, hasMore: false } }),
          },
          descriptor: contract,
          liveUrl: "/api/v1/tasks/live",
          bearerToken: "test-token-xyz",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(capturedHeaders).not.toBeNull();
    });

    // ADR-0004 & Intent mandate: Bearer mode must inject X-Request-Id and traceparent headers
    const headers = capturedHeaders as unknown as Headers;
    expect(headers?.get("x-request-id")).toBeTruthy();
    expect(headers?.get("traceparent")).toBeTruthy();
  });
});
