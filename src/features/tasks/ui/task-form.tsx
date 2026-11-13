import { Plus } from "lucide-react";
import * as React from "react";
import type { PostApiV1TasksBody } from "@/shared/api/generated/models";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export interface TaskFormProps {
  onSubmit: (data: PostApiV1TasksBody) => unknown;
  isSubmitting?: boolean;
  className?: string;
  autoFocus?: boolean;
}

export function TaskForm({
  onSubmit,
  isSubmitting = false,
  className,
  autoFocus = false,
}: TaskFormProps) {
  const [name, setName] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    await onSubmit({ name: trimmed, done: false });
    setName("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("flex items-center gap-2", className)}
      data-slot="task-form"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter task title..."
        disabled={isSubmitting}
        autoFocus={autoFocus}
        className="bg-surface-container-lowest border-outline-variant/60 focus-visible:ring-primary rounded-xl"
      />
      <Button
        type="submit"
        disabled={isSubmitting || !name.trim()}
        className="interactive-tactile shrink-0 rounded-xl font-semibold"
      >
        <Plus className="mr-1.5 size-4" />
        Create Task
      </Button>
    </form>
  );
}
