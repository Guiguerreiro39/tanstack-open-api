import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuthSession, server } from "@/test/msw-server";
import { createSpyObservability } from "@/test/spy-observability";
import { authClient } from "../api/client";
import {
  authSessionQueryOptions,
  invalidateAuthSession,
  registerAuthObservability,
  useAuthSession,
} from "../api/session";

let activeTestQueryClient: QueryClient;

function TestWrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(QueryClientProvider, { client: activeTestQueryClient }, children);
}

describe("authSessionQueryOptions & useAuthSession", () => {
  let queryClient: QueryClient;
  let spyObs: ReturnType<typeof createSpyObservability>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    activeTestQueryClient = queryClient;
    spyObs = createSpyObservability();
    registerAuthObservability(spyObs);
  });

  it("fetches authenticated session and sets observability user context", async () => {
    const testUser = {
      id: "u-123",
      name: "Jane Doe",
      email: "jane@example.com",
      role: "admin" as const,
    };
    mockAuthSession(testUser);

    const { result } = renderHook(() => useAuthSession(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.id).toBe("u-123");
    expect(result.current.user?.email).toBe("jane@example.com");
    expect(result.current.user?.role).toBe("admin");

    expect(spyObs.currentUser).toEqual({
      id: "u-123",
      email: "jane@example.com",
      role: "admin",
    });
  });

  it("forwards SSR cookie and authorization headers to Better Auth endpoint", async () => {
    let capturedCookie: string | null = null;
    let capturedAuth: string | null = null;

    server.use(
      http.get("*/api/auth/get-session", ({ request }) => {
        capturedCookie = request.headers.get("cookie");
        capturedAuth = request.headers.get("authorization");
        return HttpResponse.json({
          user: {
            id: "u-ssr",
            name: "SSR User",
            email: "ssr@example.com",
            emailVerified: true,
            role: "member",
            image: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          session: {
            id: "s-ssr",
            userId: "u-ssr",
            token: "token-ssr",
            expiresAt: new Date(Date.now() + 86400000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }),
    );

    // biome-ignore lint/suspicious/noDocumentCookie: Simulating browser cookie for SSR header forwarding
    document.cookie = "better-auth.session_token=test-token-123";

    const sessionRes = await authClient.getSession({
      fetchOptions: {
        headers: {
          authorization: "Bearer test-jwt-token",
        },
      },
    });

    expect(sessionRes.data?.user.id).toBe("u-ssr");
    expect(capturedCookie).toBe("better-auth.session_token=test-token-123");
    expect(capturedAuth).toBe("Bearer test-jwt-token");
  });

  it("handles unauthenticated state and clears observability user context", async () => {
    mockAuthSession(null);

    const { result } = renderHook(() => useAuthSession(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(spyObs.currentUser).toBeNull();
    expect(spyObs.userHistory).toContain(null);
  });

  it("clears user context when 401 is encountered", async () => {
    server.use(
      http.get("*/api/auth/get-session", () => {
        return new HttpResponse(null, { status: 401 });
      }),
    );

    const { result } = renderHook(() => useAuthSession(), {
      wrapper: TestWrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(spyObs.currentUser).toBeNull();
    expect(spyObs.userHistory).toContain(null);
  });

  it("invalidates session query via invalidateAuthSession", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await invalidateAuthSession(queryClient);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: authSessionQueryOptions.queryKey,
    });
  });
});
