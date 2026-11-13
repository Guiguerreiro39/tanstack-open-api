import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type React from "react";
import { describe, expect, it, vi } from "vitest";
import { useTasksQuery } from "@/features/tasks/api/tasks";
import { type ObservabilityService, setObservabilityService } from "@/shared/observability";
import { server } from "@/test/msw-server";

describe("Adversary 1: React Query & Effect integration - Defect reporting is bypassed", () => {
  it("does not report 500 InternalServerError defect to ObservabilityPort when useTasksQuery fails", async () => {
    server.use(
      http.get("/api/v1/tasks", () => {
        return HttpResponse.json(
          {
            error: {
              code: "INTERNAL_ERROR",
              message: "Database down",
              requestId: "req-err-500",
            },
          },
          { status: 500 },
        );
      }),
    );

    const captureDefectSpy = vi.fn();
    const mockObs: ObservabilityService = {
      captureDefect: captureDefectSpy,
      captureReactError: vi.fn(),
      recordBreadcrumb: vi.fn(),
      setUserContext: vi.fn(),
      clearUserContext: vi.fn(),
    };
    setObservabilityService(mockObs);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useTasksQuery(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Intent (ADR-0005 & Guardrails): 5xx defects must be captured by ObservabilityPort.
    // Reality: useEffectQuery only binds toEffect() but never reports defects to ObservabilityPort when the query fails!
    expect(captureDefectSpy).toHaveBeenCalled();
  });
});
