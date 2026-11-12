import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";
import { Can } from "../can";

function renderWithSession(ui: React.ReactElement, sessionData: unknown) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  queryClient.setQueryData(["auth", "session"], sessionData);

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("<Can /> RBAC Guard Component", () => {
  it("renders children when role check passes", () => {
    const adminSession = {
      user: { id: "u-1", role: "admin", name: "Admin" },
      session: { id: "s-1" },
    };

    renderWithSession(
      // biome-ignore lint/a11y/useValidAriaRole: Application RBAC role prop
      <Can fallback={<span>Denied</span>} role="admin">
        <span>Admin Content</span>
      </Can>,
      adminSession,
    );

    expect(screen.getByText("Admin Content")).toBeInTheDocument();
    expect(screen.queryByText("Denied")).not.toBeInTheDocument();
  });

  it("renders fallback when role check fails", () => {
    const memberSession = {
      user: { id: "u-2", role: "member", name: "Member" },
      session: { id: "s-2" },
    };

    renderWithSession(
      // biome-ignore lint/a11y/useValidAriaRole: Application RBAC role prop
      <Can fallback={<span>Denied</span>} role="admin">
        <span>Admin Content</span>
      </Can>,
      memberSession,
    );

    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
    expect(screen.getByText("Denied")).toBeInTheDocument();
  });

  it("evaluates action and resource permissions correctly for member", () => {
    const memberSession = {
      user: { id: "u-member", role: "member", name: "Member" },
      session: { id: "s-member" },
    };

    const ownTask = { id: "t1", userId: "u-member" };
    const foreignTask = { id: "t2", userId: "other-user" };

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    queryClient.setQueryData(["auth", "session"], memberSession);

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Can action="delete" fallback={<span>No Delete</span>} resource={ownTask}>
          <span>Can Delete Own</span>
        </Can>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Can Delete Own")).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <Can action="delete" fallback={<span>No Delete</span>} resource={foreignTask}>
          <span>Can Delete Foreign</span>
        </Can>
      </QueryClientProvider>,
    );

    expect(screen.queryByText("Can Delete Foreign")).not.toBeInTheDocument();
    expect(screen.getByText("No Delete")).toBeInTheDocument();
  });

  it("allows overriding user directly via prop", () => {
    renderWithSession(
      <Can
        action="update"
        fallback={<span>No Access</span>}
        resource="task"
        user={{ id: "u-direct", role: "admin" }}
      >
        <span>Direct Admin Access</span>
      </Can>,
      null,
    );

    expect(screen.getByText("Direct Admin Access")).toBeInTheDocument();
  });
});
