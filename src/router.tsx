import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { type AppRuntime, createAppRuntime } from "./app/runtime";
import { routeTree } from "./routeTree.gen";

export interface RouterOptions {
  queryClient?: QueryClient;
  runtime?: AppRuntime;
}

export function getRouter(options: RouterOptions = {}) {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60,
        },
      },
    });

  const runtime = options.runtime ?? createAppRuntime();

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, runtime },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    router,
    queryClient,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
