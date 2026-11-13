import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MockEventSource } from "@/test/mock-event-source";
import { mockAuthSession, server } from "@/test/msw-server";
import { renderAppRoutes } from "@/test/render";

describe("Tasks Route (_app/tasks)", () => {
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    MockEventSource.reset();
    // @ts-expect-error Mocking global EventSource
    globalThis.EventSource = MockEventSource;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    MockEventSource.reset();
  });

  it("renders protected /tasks page for authenticated member with live indicator and tasks list", async () => {
    const testUser = {
      id: "u-member-123",
      name: "Task Tester",
      email: "tester@example.com",
      role: "member" as const,
    };
    mockAuthSession(testUser);

    server.use(
      http.get("/api/v1/tasks", () => {
        return HttpResponse.json({
          data: [
            {
              id: "t-route-1",
              name: "Route Test Task",
              done: false,
              userId: "u-member-123",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
          meta: { nextCursor: null, hasMore: false },
        });
      }),
    );

    const { router } = await renderAppRoutes({
      initialEntries: ["/tasks"],
      user: testUser,
    });

    expect(router.state.location.pathname).toBe("/tasks");
    expect(await screen.findByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByText(/Realtime task workspace/i)).toBeInTheDocument();
    expect(await screen.findByText("Route Test Task")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument();
  });

  it("redirects unauthenticated user from /tasks to /login?redirect=/tasks", async () => {
    mockAuthSession(null);

    const { router } = await renderAppRoutes({
      initialEntries: ["/tasks"],
      user: null,
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });
    expect(router.state.location.search).toEqual({ redirect: "/tasks" });
  });
});
