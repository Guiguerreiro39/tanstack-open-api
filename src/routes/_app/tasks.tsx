import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare } from "lucide-react";
import { useTaskLiveQuery, useTaskMutation } from "@/features/tasks/api/tasks";
import { LiveIndicator } from "@/features/tasks/ui/live-indicator";
import { TaskForm } from "@/features/tasks/ui/task-form";
import { TaskList } from "@/features/tasks/ui/task-list";
import { matchEffect } from "@/shared/api/contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

export const Route = createFileRoute("/_app/tasks")({
  component: TasksPage,
});

function TasksForbiddenFallback() {
  return (
    <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm font-medium">
      Access denied: You do not have permission to view tasks.
    </div>
  );
}

function TasksUnauthorizedFallback() {
  return (
    <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm font-medium">
      Please sign in to view your tasks.
    </div>
  );
}

const tasksTagHandlers = {
  ForbiddenError: () => <TasksForbiddenFallback />,
  UnauthorizedError: () => <TasksUnauthorizedFallback />,
};

export function TasksPage() {
  const tasksLiveQuery = useTaskLiveQuery();
  const { createTask, isCreating, toggleTask, deleteTask } = useTaskMutation();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary shadow-tactile flex size-12 items-center justify-center rounded-2xl">
            <CheckSquare className="size-6" />
          </div>
          <div>
            <h1 className="font-display text-foreground text-3xl font-bold tracking-tight">
              Tasks
            </h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Realtime task workspace powered by SSE live queries and optimistic mutations.
            </p>
          </div>
        </div>

        <div>
          <LiveIndicator
            status={tasksLiveQuery.liveStatus}
            lastPingAt={tasksLiveQuery.lastPingAt}
          />
        </div>
      </div>

      {/* Creation Card */}
      <Card className="shadow-tactile border-outline-variant/40 bg-card mb-8">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Add a New Task</CardTitle>
          <CardDescription className="text-xs">
            Tasks synchronize in real time across sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TaskForm onSubmit={(body) => createTask(body)} isSubmitting={isCreating} />
        </CardContent>
      </Card>

      {/* Task List Section */}
      <div className="space-y-4">
        {tasksLiveQuery.data && tasksLiveQuery.streamError && (
          <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm font-medium">
            Stream notice: {tasksLiveQuery.streamError.message}
          </div>
        )}

        {matchEffect(tasksLiveQuery, {
          onPending: () => (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ),
          onSuccess: (data) => (
            <TaskList
              tasks={data.data}
              onToggle={(id, done) => toggleTask({ id, done })}
              onDelete={(id) => deleteTask({ id })}
            />
          ),
          onFailure: (error) => (
            <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-xl border p-4 text-sm font-medium">
              Failed to load tasks: {error.message}
            </div>
          ),
          onTag: tasksTagHandlers,
        })}
      </div>
    </div>
  );
}
