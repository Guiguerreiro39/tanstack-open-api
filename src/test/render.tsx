import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { type RenderOptions, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { type AppRuntime, createAppRuntime } from "@/app/runtime";
import type { RouterAppContext } from "@/routes/__root";
import { routeTree } from "@/routeTree.gen";
import { mockAuthSession, type TestAuthUser } from "./msw-server";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Number.POSITIVE_INFINITY,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export interface RenderAppOptions extends Omit<RenderOptions, "wrapper"> {
  initialEntries?: string[];
  user?: TestAuthUser | null;
  queryClient?: QueryClient;
  runtime?: AppRuntime;
}

export async function renderAppRoutes(options: RenderAppOptions = {}) {
  const {
    initialEntries = ["/"],
    user = null,
    queryClient = createTestQueryClient(),
    runtime = createAppRuntime(),
    ...renderOptions
  } = options;

  mockAuthSession(user);

  const history = createMemoryHistory({ initialEntries });
  const router = createRouter({
    routeTree,
    history,
    context: { queryClient, runtime },
    defaultPendingMinMs: 0,
    defaultPreloadStaleTime: 0,
  });

  await router.load();

  const userActor = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
    renderOptions,
  );

  return {
    ...view,
    user: userActor,
    router,
    queryClient,
    runtime,
  };
}

export async function renderWithProviders(ui: React.ReactElement, options: RenderAppOptions = {}) {
  const {
    initialEntries = ["/"],
    user = null,
    queryClient = createTestQueryClient(),
    runtime = createAppRuntime(),
    ...renderOptions
  } = options;

  mockAuthSession(user);

  const rootRoute = createRootRouteWithContext<RouterAppContext>()({
    component: () => ui,
  });
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "$",
    component: () => ui,
  });
  const testRouteTree = rootRoute.addChildren([indexRoute]);

  const history = createMemoryHistory({ initialEntries });
  const router = createRouter({
    routeTree: testRouteTree,
    history,
    context: { queryClient, runtime },
    defaultPendingMinMs: 0,
  });

  await router.load();

  const userActor = userEvent.setup();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
    renderOptions,
  );

  return {
    ...view,
    user: userActor,
    router,
    queryClient,
    runtime,
  };
}
