import { ListTodo } from "lucide-react";
import * as React from "react";
import { filterTasks, type TaskFilterStatus, type TaskItem } from "@/features/tasks/model/tasks";
import { TaskItemView } from "@/features/tasks/ui/task-item";
import { cn } from "@/shared/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export interface TaskListProps {
  tasks: ReadonlyArray<TaskItem>;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  className?: string;
  defaultFilter?: TaskFilterStatus;
}

export function TaskList({
  tasks,
  onToggle,
  onDelete,
  className,
  defaultFilter = "all",
}: TaskListProps) {
  const [filter, setFilter] = React.useState<TaskFilterStatus>(defaultFilter);

  const filteredTasks = filterTasks(tasks, filter);

  const completedCount = tasks.filter((t) => t.done).length;
  const pendingCount = tasks.filter((t) => !t.done).length;
  const totalCount = tasks.length;

  return (
    <div className={cn("space-y-4", className)} data-slot="task-list">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <Tabs
          value={filter}
          onValueChange={(val) => setFilter(val as TaskFilterStatus)}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-surface-container rounded-xl">
            <TabsTrigger value="all" className="px-3 py-1.5 text-xs font-semibold">
              All ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="pending" className="px-3 py-1.5 text-xs font-semibold">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="px-3 py-1.5 text-xs font-semibold">
              Completed ({completedCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <span className="text-muted-foreground text-xs font-medium">
          {completedCount} of {totalCount} completed
        </span>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="border-outline-variant/60 bg-surface-container-lowest/50 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed p-8 text-center">
          <ListTodo className="text-muted-foreground/60 size-8" />
          <p className="text-muted-foreground text-sm font-medium">
            {filter === "all"
              ? "No tasks yet. Create one above to get started!"
              : filter === "completed"
                ? "No completed tasks yet."
                : "No pending tasks."}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => (
            <TaskItemView key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
