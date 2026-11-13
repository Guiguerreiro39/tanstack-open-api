import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { authSessionQueryOptions } from "@/features/auth/api/session";
import { UserMenu } from "@/features/auth/ui/user-menu";
import { AppShell } from "@/shared/ui/app-shell";

export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const sessionData = await context.queryClient.ensureQueryData(authSessionQueryOptions);
    if (!sessionData?.user) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }

    return {
      user: sessionData.user,
      session: sessionData.session,
    };
  },
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();

  return (
    <AppShell user={user} userMenuSlot={<UserMenu user={user} />}>
      <Outlet />
    </AppShell>
  );
}
