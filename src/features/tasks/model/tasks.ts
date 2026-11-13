import { Schema } from "effect";

export interface TaskItem {
  readonly id: string;
  readonly name: string;
  readonly done: boolean;
  readonly userId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly [key: string]: unknown;
}

export type TaskFilterStatus = "all" | "pending" | "in_progress" | "completed";

export const CreateTaskFormSchema = Schema.Struct({
  name: Schema.String.pipe(
    Schema.minLength(1, { message: () => "Task title is required" }),
    Schema.maxLength(500),
  ),
  done: Schema.optionalWith(Schema.Boolean, { default: () => false }),
});

export type CreateTaskFormValues = typeof CreateTaskFormSchema.Type;

export function filterTasks(tasks: ReadonlyArray<TaskItem>, filter: TaskFilterStatus): TaskItem[] {
  switch (filter) {
    case "completed":
      return tasks.filter((t) => t.done);
    case "pending":
    case "in_progress":
      return tasks.filter((t) => !t.done);
    default:
      return [...tasks];
  }
}
