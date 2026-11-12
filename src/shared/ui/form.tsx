import { type AnyFieldApi, createFormHook, createFormHookContexts } from "@tanstack/react-form";
import * as React from "react";
import { cn } from "@/shared/lib/utils";

export const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {},
  formComponents: {},
});

interface FormFieldContextValue {
  name: string;
  isInvalid: boolean;
  errors: string[];
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

export interface FormFieldProps {
  field: AnyFieldApi;
  children: React.ReactNode;
}

function normalizeError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    if ("message" in error && typeof (error as { message: unknown }).message === "string") {
      return (error as { message: string }).message;
    }
  }
  return String(error ?? "");
}

export function FormField({ field, children }: FormFieldProps) {
  const errors = (field.state.meta.errors ?? []).map(normalizeError).filter(Boolean);
  const isInvalid = errors.length > 0;

  const value = React.useMemo<FormFieldContextValue>(
    () => ({
      name: field.name,
      isInvalid,
      errors,
    }),
    [field.name, isInvalid, errors],
  );

  return <FormFieldContext.Provider value={value}>{children}</FormFieldContext.Provider>;
}

interface FormItemContextValue {
  id: string;
  descriptionId: string;
  messageId: string;
  isInvalid: boolean;
  errors: string[];
}

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

export function useFormItem() {
  const itemContext = React.useContext(FormItemContext);
  const fieldContextValue = React.useContext(FormFieldContext);

  const id = itemContext?.id ?? "";
  const descriptionId = itemContext?.descriptionId ?? `${id}-description`;
  const messageId = itemContext?.messageId ?? `${id}-message`;
  const isInvalid = itemContext?.isInvalid ?? fieldContextValue?.isInvalid ?? false;
  const errors = itemContext?.errors ?? fieldContextValue?.errors ?? [];

  return {
    id,
    descriptionId,
    messageId,
    isInvalid,
    errors,
  };
}

export function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  const fieldContextValue = React.useContext(FormFieldContext);

  const contextValue = React.useMemo<FormItemContextValue>(
    () => ({
      id,
      descriptionId: `${id}-description`,
      messageId: `${id}-message`,
      isInvalid: fieldContextValue?.isInvalid ?? false,
      errors: fieldContextValue?.errors ?? [],
    }),
    [id, fieldContextValue?.isInvalid, fieldContextValue?.errors],
  );

  return (
    <FormItemContext.Provider value={contextValue}>
      <div className={cn("grid gap-2", className)} data-slot="form-item" {...props} />
    </FormItemContext.Provider>
  );
}

export function FormLabel({ className, ...props }: React.ComponentProps<"label">) {
  const { id, isInvalid } = useFormItem();

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Associated via htmlFor derived from useFormItem
    <label
      className={cn(
        "text-foreground data-[error=true]:text-destructive text-sm leading-none font-semibold tracking-tight peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className,
      )}
      data-error={isInvalid}
      data-slot="form-label"
      htmlFor={id}
      {...props}
    />
  );
}

export function FormControl({
  children,
}: {
  children: React.ReactElement<Record<string, unknown>>;
}) {
  const { id, descriptionId, messageId, isInvalid } = useFormItem();

  const describedBy = isInvalid ? `${descriptionId} ${messageId}`.trim() : descriptionId;

  return React.cloneElement(children, {
    id,
    "aria-describedby": describedBy,
    "aria-invalid": isInvalid ? "true" : "false",
    "data-slot": "form-control",
  });
}

export function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { descriptionId } = useFormItem();

  return (
    <p
      className={cn("text-muted-foreground text-xs leading-normal", className)}
      data-slot="form-description"
      id={descriptionId}
      {...props}
    />
  );
}

export function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { messageId, isInvalid, errors } = useFormItem();
  const body = children ?? (isInvalid && errors.length > 0 ? errors[0] : null);

  if (!body) {
    return null;
  }

  return (
    <p
      className={cn("text-destructive text-xs leading-none font-medium", className)}
      data-slot="form-message"
      id={messageId}
      {...props}
    >
      {body}
    </p>
  );
}

export function applyServerValidationErrors(
  form: {
    setFieldMeta: (
      name: string,
      updater: (prev: { errorMap?: Record<string, unknown> }) => {
        errorMap?: Record<string, unknown>;
      },
    ) => void;
  },
  errors: Record<string, string | string[]>,
) {
  for (const [field, error] of Object.entries(errors)) {
    const errorText = Array.isArray(error) ? error[0] : error;
    if (errorText) {
      form.setFieldMeta(field, (prev) => ({
        ...prev,
        errorMap: {
          ...prev?.errorMap,
          onSubmit: errorText,
        },
      }));
    }
  }
}
