import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { createAppRuntime } from "./app/runtime";
import { getRouter } from "./router";

describe("Router Composition Root (getRouter)", () => {
  it("creates an isolated Router instance with QueryClient and Effect ManagedRuntime", () => {
    const router1 = getRouter();
    const router2 = getRouter();

    expect(router1).toBeDefined();
    expect(router2).toBeDefined();
    expect(router1).not.toBe(router2);

    expect(router1.options.context.queryClient).toBeInstanceOf(QueryClient);
    expect(router1.options.context.runtime).toBeDefined();
    expect(router1.options.context.queryClient).not.toBe(router2.options.context.queryClient);
    expect(router1.options.context.runtime).not.toBe(router2.options.context.runtime);
  });

  it("configures defaultPreload: 'intent' and defaultPreloadStaleTime: 0 for QueryClient delegation", () => {
    const router = getRouter();
    expect(router.options.defaultPreload).toBe("intent");
    expect(router.options.defaultPreloadStaleTime).toBe(0);
  });

  it("accepts custom QueryClient and ManagedRuntime overrides for deterministic testing", () => {
    const customQueryClient = new QueryClient();
    const customRuntime = createAppRuntime();

    const router = getRouter({
      queryClient: customQueryClient,
      runtime: customRuntime,
    });

    expect(router.options.context.queryClient).toBe(customQueryClient);
    expect(router.options.context.runtime).toBe(customRuntime);
  });

  it("wires setupRouterSsrQueryIntegration (options.Wrap exists)", () => {
    const router = getRouter();
    expect(typeof router.options.Wrap).toBe("function");
  });
});
