import { QueryClient } from "@tanstack/react-query";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { type AuthEnvelope, authSessionQueryOptions } from "@/features/auth/api/session";
import { customFetch } from "@/shared/api/fetch";
import { server } from "@/test/msw-server";

describe("Repro: Session cache clearing on 401 UnauthorizedError", () => {
  it("proves 401 from API does not reset session cache in queryClient", async () => {
    const queryClient = new QueryClient();
    const testSession = {
      user: {
        id: "u-1",
        name: "User",
        email: "user@example.com",
        emailVerified: true,
        role: "member",
      },
      session: { id: "s-1", userId: "u-1" },
    };

    queryClient.setQueryData(
      authSessionQueryOptions.queryKey,
      testSession as unknown as AuthEnvelope,
    );
    expect(queryClient.getQueryData(authSessionQueryOptions.queryKey)).toEqual(testSession);

    // Mock API endpoint returning 401 Unauthorized
    server.use(
      http.get("*/api/v1/tasks", () => {
        return HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "Token expired" } },
          { status: 401 },
        );
      }),
    );

    try {
      await customFetch("/api/v1/tasks");
    } catch {
      // Expected 401 FetchError
    }

    const cachedSessionAfter401 = queryClient.getQueryData(authSessionQueryOptions.queryKey);
    console.log("[Repro Result] Cached session after 401:", cachedSessionAfter401);
    expect(cachedSessionAfter401).toBeNull();
  });
});
