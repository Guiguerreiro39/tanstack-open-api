import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { Schema } from "effect";
import { Loader2 } from "lucide-react";
import * as React from "react";
import { authClient } from "@/features/auth/api/client";
import { invalidateAuthSession } from "@/features/auth/api/session";
import { SignUpSchema } from "@/features/auth/model/schemas";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useAppForm,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";

export interface SignUpFormProps {
  redirectTo?: string;
  onSwitchToSignIn?: () => void;
}

export function SignUpForm({ redirectTo: _redirectTo, onSwitchToSignIn }: SignUpFormProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const navigate = useNavigate();
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    validators: {
      onSubmit: Schema.standardSchemaV1(SignUpSchema),
    },
    onSubmit: async ({ value }) => {
      setServerError(null);
      const res = await authClient.signUp.email({
        name: value.name,
        email: value.email,
        password: value.password,
      });

      if (res.error) {
        setServerError(res.error.message || "Failed to create account. Please try again.");
        return;
      }

      await invalidateAuthSession(queryClient);
      await router.invalidate();
      // biome-ignore lint/suspicious/noExplicitAny: Redirect to home page
      await navigate({ to: "/" as any });
    },
  });

  return (
    <div className="w-full space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-foreground text-2xl font-bold tracking-tight">
          Create an Account
        </h1>
        <p className="text-muted-foreground text-sm">Enter your information to get started</p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field name="name">
          {(field) => (
            <FormField field={field}>
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="name"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="Jane Doe"
                    type="text"
                    value={field.state.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          )}
        </form.Field>

        <form.Field name="email">
          {(field) => (
            <FormField field={field}>
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="email"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="user@example.com"
                    type="email"
                    value={field.state.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <FormField field={field}>
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="new-password"
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    value={field.state.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          )}
        </form.Field>

        <form.Subscribe selector={(state) => [state.isSubmitting]}>
          {([isSubmitting]) => (
            <Button
              className="shadow-tactile w-full cursor-pointer rounded-xl font-semibold"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                "Sign Up"
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {onSwitchToSignIn && (
        <div className="text-center text-xs">
          <span className="text-muted-foreground">Already have an account? </span>
          <button
            className="text-primary cursor-pointer font-semibold hover:underline"
            onClick={onSwitchToSignIn}
            type="button"
          >
            Sign In
          </button>
        </div>
      )}
    </div>
  );
}
