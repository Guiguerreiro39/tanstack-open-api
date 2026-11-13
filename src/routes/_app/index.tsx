import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckSquare, FileText, Sparkles, UserCheck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Welcome Section */}
      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-foreground text-3xl font-bold tracking-tight">
              tanstack-open-api
            </h1>
            {user.role && (
              <Badge className="text-xs font-bold uppercase" variant="outline">
                {user.role}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Welcome back,{" "}
            <span className="text-foreground font-semibold">{user.name || user.email}</span>!
            Authenticated workspace overview.
          </p>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card className="shadow-tactile mb-8">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-2xl">
            <UserCheck className="size-6" />
          </div>
          <div>
            <CardTitle className="text-lg">User Profile</CardTitle>
            <CardDescription>Your authenticated Better Auth session details</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="border-outline-variant/40 bg-surface-container-lowest rounded-xl border p-4">
            <span className="text-muted-foreground text-xs font-medium">Full Name</span>
            <p className="text-foreground mt-1 font-semibold">{user.name || "N/A"}</p>
          </div>
          <div className="border-outline-variant/40 bg-surface-container-lowest rounded-xl border p-4">
            <span className="text-muted-foreground text-xs font-medium">Email Address</span>
            <p className="text-foreground mt-1 font-semibold">{user.email}</p>
          </div>
          <div className="border-outline-variant/40 bg-surface-container-lowest rounded-xl border p-4">
            <span className="text-muted-foreground text-xs font-medium">Role</span>
            <p className="text-foreground mt-1 font-semibold capitalize">{user.role || "viewer"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Tasks Navigation Card */}
        <Card className="shadow-tactile flex flex-col justify-between">
          <CardHeader>
            <div className="bg-primary-fixed text-primary mb-2 flex size-10 items-center justify-center rounded-xl">
              <CheckSquare className="size-5" />
            </div>
            <CardTitle className="text-lg">Tasks</CardTitle>
            <CardDescription>
              Manage tasks with realtime SSE synchronization and optimistic mutations.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full rounded-xl font-semibold">
              {/* biome-ignore lint/suspicious/noExplicitAny: Future route */}
              <Link preload={false} to={"/tasks" as any}>
                View Tasks
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Files Navigation Card */}
        <Card className="shadow-tactile flex flex-col justify-between">
          <CardHeader>
            <div className="bg-secondary-fixed text-secondary mb-2 flex size-10 items-center justify-center rounded-xl">
              <FileText className="size-5" />
            </div>
            <CardTitle className="text-lg">Files</CardTitle>
            <CardDescription>
              Presigned multipart S3 file uploads with upload progress and access scope rules.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full rounded-xl font-semibold" variant="outline">
              {/* biome-ignore lint/suspicious/noExplicitAny: Future route */}
              <Link preload={false} to={"/files" as any}>
                View Files
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Design System Showcase Card */}
        <Card className="shadow-tactile flex flex-col justify-between">
          <CardHeader>
            <div className="bg-tertiary-fixed text-tertiary mb-2 flex size-10 items-center justify-center rounded-xl">
              <Sparkles className="size-5" />
            </div>
            <CardTitle className="text-lg">Design System Showcase</CardTitle>
            <CardDescription>
              Explore shadcn primitives, theme tokens, tactile shadows, and color scales.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full rounded-xl font-semibold" variant="secondary">
              <Link to="/showcase">Open Showcase</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
