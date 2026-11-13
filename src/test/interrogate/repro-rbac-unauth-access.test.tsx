import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hasPermission } from "@/shared/lib/rbac";
import { Can } from "@/shared/ui/can";

describe("Repro: Unauthenticated access via RBAC and Can guard", () => {
  it("proves hasPermission grants read access to unauthenticated visitor (user: null, role: undefined)", () => {
    const isGranted = hasPermission({
      user: null,
      role: undefined,
      resource: "task",
      action: "read",
    });
    console.log(
      "[Repro Result] hasPermission({ user: null, resource: 'task', action: 'read' }) =",
      isGranted,
    );
    expect(isGranted).toBe(false);
  });

  it("proves <Can /> renders protected children to unauthenticated visitor instead of fallback", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(["auth", "session"], null);

    render(
      <QueryClientProvider client={queryClient}>
        <Can action="read" resource="task" fallback={<span>Access Denied</span>}>
          <span>Secret Task Content</span>
        </Can>
      </QueryClientProvider>,
    );

    const secretElement = screen.queryByText("Secret Task Content");
    console.log(
      "[Repro Result] Rendered secret content to unauthenticated visitor:",
      Boolean(secretElement),
    );
    expect(secretElement).toBeNull();
  });
});
