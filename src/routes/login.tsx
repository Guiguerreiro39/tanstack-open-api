import { createFileRoute, redirect } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import * as React from "react";
import { authSessionQueryOptions } from "@/features/auth/api/session";
import { sanitizeRedirect } from "@/features/auth/model/schemas";
import { SignInForm } from "@/features/auth/ui/sign-in-form";
import { SignUpForm } from "@/features/auth/ui/sign-up-form";
import { Card, CardContent } from "@/shared/ui/card";
import { ThemeSwitcher } from "@/shared/ui/theme-switcher";

export interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async ({ context, search }) => {
    const sessionData = await context.queryClient.ensureQueryData(authSessionQueryOptions);
    if (sessionData?.user) {
      const dest = sanitizeRedirect(search.redirect);
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic target route string
      throw redirect({ to: dest as any });
    }
  },
  component: LoginComponent,
});

function LoginComponent() {
  const search = Route.useSearch();
  const [isSignUp, setIsSignUp] = React.useState(false);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="border-outline-variant/40 bg-surface/90 sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b px-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground shadow-tactile flex size-9 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </div>
          <span className="font-display text-foreground text-lg font-bold tracking-tight">
            tanstack-open-api
          </span>
        </div>
        <ThemeSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        <Card className="shadow-tactile w-full max-w-md border">
          <CardContent className="p-6 sm:p-8">
            {isSignUp ? (
              <SignUpForm
                onSwitchToSignIn={() => setIsSignUp(false)}
                redirectTo={search.redirect}
              />
            ) : (
              <SignInForm onSwitchToSignUp={() => setIsSignUp(true)} redirectTo={search.redirect} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
