import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { Schema } from "effect";
import type React from "react";
import { describe, expect, it } from "vitest";
import { defineContract, matchEffect, useEffectMutation } from "@/shared/api/contracts";

describe("Adversary 1: matchEffect on idle mutation crashes with AsyncFiber / non-terminating sync run", () => {
  it("crashes when matchEffect is used with useEffectMutation while mutation is idle", () => {
    const queryClient = new QueryClient();
    const contract = defineContract({
      path: "/api/test",
      dataSchema: Schema.Struct({ ok: Schema.Boolean }),
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () =>
        useEffectMutation(
          {
            mutationFn: async () => ({ ok: true }),
          },
          contract,
        ),
      { wrapper },
    );

    expect(result.current.isIdle).toBe(true);
    expect(result.current.isPending).toBe(false);

    // Now call matchEffect on the mutation result:
    expect(() => {
      matchEffect(result.current as unknown as Parameters<typeof matchEffect>[0], {
        onPending: () => "PENDING",
        onFailure: () => "FAILED",
        onSuccess: () => "SUCCESS",
      });
    }).not.toThrow();
  });
});
