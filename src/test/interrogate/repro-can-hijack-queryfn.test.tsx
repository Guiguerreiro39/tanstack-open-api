import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { Can } from "@/shared/ui/can";
import { server } from "@/test/msw-server";

describe("Repro: <Can /> hijacking queryFn on ['auth', 'session']", () => {
  it("proves Can's queryFn prevents network refetch when refetchQueries is invoked", async () => {
    let networkFetchCount = 0;
    server.use(
      http.get("*/api/auth/get-session", () => {
        networkFetchCount++;
        return HttpResponse.json({
          user: { id: "u-refetched", role: "admin", email: "a@a.com" },
          session: { id: "s-1", userId: "u-refetched" },
        });
      }),
    );

    const queryClient = new QueryClient();

    // 1. Can component mounts
    render(
      <QueryClientProvider client={queryClient}>
        <Can action="read" resource="task">
          <span>Protected Content</span>
        </Can>
      </QueryClientProvider>,
    );

    // 2. Application invokes refetchQueries expecting network fetch to get updated session
    await queryClient.refetchQueries({ queryKey: ["auth", "session"] });

    console.log("[Repro Result] Network fetch count after refetchQueries:", networkFetchCount);
    expect(networkFetchCount).toBe(1);
  });
});
