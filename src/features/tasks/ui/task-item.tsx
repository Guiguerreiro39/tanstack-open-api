import { Trash2 } from "lucide-react";
import type { TaskItem } from "@/features/tasks/model/tasks";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Can } from "@/shared/ui/can";
import { Card } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";

export interface TaskItemViewProps {
  task: TaskItem;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function TaskItemView({ task, onToggle, onDelete, className }: TaskItemViewProps) {
  const isCompleted = task.done;

  return (
    <Card
      className={cn(
        "shadow-tactile border-outline-variant/40 flex w-full flex-row items-center justify-between gap-4 rounded-2xl border p-4 transition-all duration-200",
        isCompleted ? "bg-surface-container-low opacity-80" : "bg-card hover:translate-y-[-1px]",
        className,
      )}
      data-slot="task-item"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <Checkbox
          checked={isCompleted}
          onCheckedChange={(checked) => onToggle(task.id, Boolean(checked))}
          aria-label={`Mark "${task.name}" as ${isCompleted ? "pending" : "completed"}`}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              "truncate font-sans text-sm font-medium",
              isCompleted && "decoration-primary text-muted-foreground line-through",
            )}
          >
            {task.name}
          </span>
          {task.createdAt && (
            <span className="text-muted-foreground text-[10px]">
              {new Date(task.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* biome-ignore lint/a11y/useValidAriaRole: Application RBAC role prop */}
        <Can role="member" action="tasks:delete" resource={task}>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 interactive-tactile size-8 shrink-0 rounded-lg"
            onClick={() => onDelete(task.id)}
            aria-label="Delete task"
          >
            <Trash2 className="size-4" />
          </Button>
        </Can>
      </div>
    </Card>
  );
}
