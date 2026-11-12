import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="p-8">
      <h1 className="text-headline-xl font-bold">tanstack-open-api</h1>
    </div>
  );
}
