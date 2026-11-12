import { Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { ObservabilityPort } from "@/shared/observability";
import { createAppRuntime } from "../runtime";

describe("App Runtime Composition", () => {
  it("creates isolated ManagedRuntime instances per call (no shared singleton)", () => {
    const runtime1 = createAppRuntime();
    const runtime2 = createAppRuntime();

    expect(runtime1).toBeDefined();
    expect(runtime2).toBeDefined();
    expect(runtime1).not.toBe(runtime2);
  });

  it("executes effects through the managed runtime", async () => {
    const runtime = createAppRuntime();
    const result = await runtime.runPromise(Effect.succeed(42));
    expect(result).toBe(42);
  });

  it("supports injecting custom layers into the runtime", async () => {
    const customLayer = Layer.empty;
    const runtime = createAppRuntime(customLayer);
    const result = await runtime.runPromise(Effect.succeed("custom"));
    expect(result).toBe("custom");
  });

  it("provides ObservabilityPort in runtime by default", async () => {
    const runtime = createAppRuntime();
    const observability = await runtime.runPromise(ObservabilityPort);
    expect(observability).toBeDefined();
    expect(typeof observability.captureDefect).toBe("function");
    expect(typeof observability.recordBreadcrumb).toBe("function");
  });
});
