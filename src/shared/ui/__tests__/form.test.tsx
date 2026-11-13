import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import {
  applyServerValidationErrors,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useAppForm,
} from "../form";

const LoginFormSchema = Schema.Struct({
  email: Schema.String.pipe(Schema.nonEmptyString({ message: () => "Email is required" })),
  password: Schema.String.pipe(
    Schema.minLength(6, { message: () => "Password must be at least 6 characters" }),
  ),
});

function TestLoginForm({
  onSubmit,
}: {
  onSubmit?: (values: { email: string; password: string }) => void;
}) {
  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      onSubmit?.(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="email"
        validators={{
          onBlur: Schema.standardSchemaV1(LoginFormSchema.fields.email),
          onSubmit: Schema.standardSchemaV1(LoginFormSchema.fields.email),
        }}
      >
        {(field) => (
          <FormField field={field}>
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <input
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="name@example.com"
                />
              </FormControl>
              <FormDescription>We will never share your email.</FormDescription>
              <FormMessage />
            </FormItem>
          </FormField>
        )}
      </form.Field>

      <button type="submit">Sign In</button>
    </form>
  );
}

interface TestFormState {
  setFieldMeta: (
    name: string,
    updater: (prev: { errorMap?: Record<string, unknown> }) => {
      errorMap?: Record<string, unknown>;
    },
  ) => void;
  getFieldMeta: (name: string) => {
    errorMap?: Record<string, unknown>;
  };
}

let capturedForm: TestFormState | undefined;

function HelperForm({ onReady }: { onReady: (form: TestFormState) => void }) {
  const form = useAppForm({
    defaultValues: { email: "" },
  });
  onReady(form as unknown as TestFormState);
  return null;
}

describe("Form Integration with TanStack Form + Effect Schema (src/shared/ui/form.tsx)", () => {
  it("renders form controls with accessibility attributes and descriptions", () => {
    render(<TestLoginForm />);

    const input = screen.getByPlaceholderText("name@example.com");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "false");

    const description = screen.getByText("We will never share your email.");
    expect(description).toBeInTheDocument();
    expect(input.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("validates on blur using Effect standardSchemaV1 and renders FormMessage", async () => {
    const user = userEvent.setup();
    render(<TestLoginForm />);

    const input = screen.getByPlaceholderText("name@example.com");

    await user.click(input);
    await user.tab();

    const errorMessage = await screen.findByText("Email is required");
    expect(errorMessage).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain(errorMessage.id);
  });

  it("clears validation error when valid input is typed", async () => {
    const user = userEvent.setup();
    render(<TestLoginForm />);

    const input = screen.getByPlaceholderText("name@example.com");

    await user.click(input);
    await user.tab();
    expect(await screen.findByText("Email is required")).toBeInTheDocument();

    await user.type(input, "alex@example.com");
    await user.tab();

    expect(screen.queryByText("Email is required")).not.toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("supports applying server-side validation errors to form fields", () => {
    capturedForm = undefined;
    render(
      <HelperForm
        onReady={(form) => {
          capturedForm = form;
        }}
      />,
    );
    const form = capturedForm as TestFormState | undefined;
    expect(form).toBeDefined();

    if (!form) throw new Error("capturedForm is undefined");

    applyServerValidationErrors(form, {
      email: "Email already registered in system",
    });

    const emailMeta = form.getFieldMeta("email");
    expect(emailMeta.errorMap?.onSubmit).toBe("Email already registered in system");
  });
});
