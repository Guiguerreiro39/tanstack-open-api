import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import type React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MockEventSource } from "@/test/mock-event-source";
import { server } from "@/test/msw-server";
import { useTaskLiveQuery, useTaskMutation } from "../api/tasks";
import type { TaskItem } from "../model/tasks";
import { LiveIndicator } from "../ui/live-indicator";
import { TaskForm } from "../ui/task-form";
import { TaskItemView } from "../ui/task-item";
import { TaskList } from "../ui/task-list";

function TaskTestWrapper({
  client,
  userRole = "member",
  children,
}: {
  client: QueryClient;
  userRole?: string;
  children: React.ReactNode;
}) {
  client.setQueryData(["auth", "session"], {
    user: { id: "test-user-id", role: userRole, name: "Test User" },
    session: { id: "session-id" },
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function TasksCreateTestComponent() {
  const { data, liveStatus } = useTaskLiveQuery();
  const { createTask } = useTaskMutation();

  return (
    <div>
      <LiveIndicator status={liveStatus} />
      <TaskForm onSubmit={(taskData) => createTask(taskData)} />
      <TaskList tasks={data?.data ?? []} onToggle={() => {}} onDelete={() => {}} />
    </div>
  );
}

function TasksToggleTestComponent() {
  const { data } = useTaskLiveQuery();
  const { toggleTask } = useTaskMutation();

  return (
    <TaskList
      tasks={data?.data ?? []}
      onToggle={(id, done) => toggleTask({ id, done })}
      onDelete={() => {}}
    />
  );
}

function TasksDeleteTestComponent() {
  const { data } = useTaskLiveQuery();
  const { deleteTask } = useTaskMutation();

  return (
    <TaskList tasks={data?.data ?? []} onToggle={() => {}} onDelete={(id) => deleteTask({ id })} />
  );
}

describe("Tasks Feature Slice", () => {
  const originalEventSource = globalThis.EventSource;

  beforeEach(() => {
    MockEventSource.reset();
    // @ts-expect-error Mocking global EventSource with MockEventSource
    globalThis.EventSource = MockEventSource;
  });

  afterEach(() => {
    globalThis.EventSource = originalEventSource;
    MockEventSource.reset();
  });

  it("renders TaskItemView with completed styling when done=true", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const onToggle = vi.fn();
    const onDelete = vi.fn();

    const task: TaskItem = {
      id: "task-1",
      name: "Buy groceries",
      done: true,
      userId: "test-user-id",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    };

    render(<TaskItemView onDelete={onDelete} onToggle={onToggle} task={task} />, {
      wrapper: ({ children }) => (
        <TaskTestWrapper client={queryClient} userRole="member">
          {children}
        </TaskTestWrapper>
      ),
    });

    const nameElement = screen.getByText("Buy groceries");
    expect(nameElement).toHaveClass("line-through");
    expect(nameElement).toHaveClass("decoration-primary");

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith("task-1", false);
  });

  it("guards delete button so viewer cannot see it, but member can", () => {
    const queryClientMember = new QueryClient();
    const queryClientViewer = new QueryClient();
    const task: TaskItem = {
      id: "task-1",
      name: "Restricted task",
      done: false,
      userId: "test-user-id",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z",
    };

    const { rerender } = render(
      <TaskItemView onDelete={vi.fn()} onToggle={vi.fn()} task={task} />,
      {
        wrapper: ({ children }) => (
          <TaskTestWrapper client={queryClientMember} userRole="member">
            {children}
          </TaskTestWrapper>
        ),
      },
    );

    expect(screen.getByRole("button", { name: /delete/i })).toBeInTheDocument();

    rerender(<TaskItemView onDelete={vi.fn()} onToggle={vi.fn()} task={task} />);
    // Render with viewer session
    const { container } = render(
      <TaskItemView onDelete={vi.fn()} onToggle={vi.fn()} task={task} />,
      {
        wrapper: ({ children }) => (
          <TaskTestWrapper client={queryClientViewer} userRole="viewer">
            {children}
          </TaskTestWrapper>
        ),
      },
    );

    expect(container.querySelector("button[aria-label='Delete task']")).not.toBeInTheDocument();
  });

  it("renders LiveIndicator correctly across connection states", () => {
    const { rerender } = render(<LiveIndicator status="connected" />);
    expect(screen.getByText(/Live Connected/i)).toBeInTheDocument();

    rerender(<LiveIndicator status="connecting" />);
    expect(screen.getByText(/Connecting/i)).toBeInTheDocument();

    rerender(<LiveIndicator status="error" />);
    expect(screen.getByText(/Disconnected/i)).toBeInTheDocument();
  });

  it("optimistically creates a task under ['tasks', 'mutation']", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    // Initial server state
    server.use(
      http.get("/api/v1/tasks", () => {
        return HttpResponse.json({
          data: [
            {
              id: "t1",
              name: "Existing task",
              done: false,
              userId: "test-user-id",
              createdAt: "",
              updatedAt: "",
            },
          ],
          meta: { nextCursor: null, hasMore: false },
        });
      }),
      http.post("/api/v1/tasks", async ({ request }) => {
        const body = (await request.json()) as { name: string; done?: boolean };
        return HttpResponse.json(
          {
            id: "server-created-id",
            name: body.name,
            done: Boolean(body.done),
            userId: "test-user-id",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          { status: 201 },
        );
      }),
    );

    render(<TasksCreateTestComponent />, {
      wrapper: ({ children }) => (
        <TaskTestWrapper client={queryClient} userRole="member">
          {children}
        </TaskTestWrapper>
      ),
    });

    // Wait for initial load
    expect(await screen.findByText("Existing task")).toBeInTheDocument();

    // Fill form and submit
    const input = screen.getByPlaceholderText(/enter task title/i);
    await user.type(input, "New Optimistic Task");

    const submitBtn = screen.getByRole("button", { name: /create task/i });
    await user.click(submitBtn);

    // Optimistic item should immediately appear in list
    expect(screen.getByText("New Optimistic Task")).toBeInTheDocument();

    // Server response should settle
    await waitFor(() => {
      expect(screen.getByText("New Optimistic Task")).toBeInTheDocument();
    });
  });

  it("optimistically toggles task status and updates styling", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    server.use(
      http.get("/api/v1/tasks", () => {
        return HttpResponse.json({
          data: [
            {
              id: "t1",
              name: "Toggle me",
              done: false,
              userId: "test-user-id",
              createdAt: "",
              updatedAt: "",
            },
          ],
          meta: { nextCursor: null, hasMore: false },
        });
      }),
      http.patch("/api/v1/tasks/:id", async ({ request }) => {
        const body = (await request.json()) as { done?: boolean };
        return HttpResponse.json({
          id: "t1",
          name: "Toggle me",
          done: Boolean(body.done),
          userId: "test-user-id",
          createdAt: "",
          updatedAt: "",
        });
      }),
    );

    render(<TasksToggleTestComponent />, {
      wrapper: ({ children }) => (
        <TaskTestWrapper client={queryClient} userRole="member">
          {children}
        </TaskTestWrapper>
      ),
    });

    expect(await screen.findByText("Toggle me")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    // Immediately checked and line-through applied
    expect(checkbox).toBeChecked();
    expect(screen.getByText("Toggle me")).toHaveClass("line-through");
  });

  it("optimistically deletes task", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    server.use(
      http.get("/api/v1/tasks", () => {
        return HttpResponse.json({
          data: [
            {
              id: "t-del",
              name: "Delete me",
              done: false,
              userId: "test-user-id",
              createdAt: "",
              updatedAt: "",
            },
          ],
          meta: { nextCursor: null, hasMore: false },
        });
      }),
      http.delete("/api/v1/tasks/:id", () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );

    render(<TasksDeleteTestComponent />, {
      wrapper: ({ children }) => (
        <TaskTestWrapper client={queryClient} userRole="member">
          {children}
        </TaskTestWrapper>
      ),
    });

    expect(await screen.findByText("Delete me")).toBeInTheDocument();
    const deleteBtn = screen.getByRole("button", { name: /delete/i });

    await user.click(deleteBtn);

    // Immediately removed
    expect(screen.queryByText("Delete me")).not.toBeInTheDocument();
  });
});
