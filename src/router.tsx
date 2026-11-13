import { QueryClient } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { type AppRuntime, createAppRuntime } from "./app/runtime";
import { routeTree } from "./routeTree.gen";
import type { ObservabilityService } from "./shared/observability";

export interface RouterOptions {
  queryClient?: QueryClient;
  runtime?: AppRuntime;
  observability?: ObservabilityService;
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

  const observability = options.observability;
  const runtime = options.runtime ?? createAppRuntime(undefined, { observability });

  const router = createTanStackRouter({
    routeTree,
    context: { queryClient, runtime },
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });

  observability?.initRouter?.(router);

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

declare module "@tanstack/react-start" {
  interface Register {
    ssr: true;
    router: ReturnType<typeof getRouter>;
  }
}
