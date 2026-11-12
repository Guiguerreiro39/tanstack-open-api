import { Layer, ManagedRuntime } from "effect";
import {
  createObservabilityService,
  ObservabilityPort,
  type ObservabilityService,
} from "@/shared/observability";

export type AppRuntime<R = ObservabilityPort, E = never> = ManagedRuntime.ManagedRuntime<R, E>;

export interface AppRuntimeOptions {
  observability?: ObservabilityService;
}

/**
 * Creates an isolated Effect ManagedRuntime instance without global side effects.
 * Supports per-request SSR isolation and per-test Layer injection.
 */
export function createAppRuntime<R = never, E = never>(
  deps: Layer.Layer<R, E, never> = Layer.empty as unknown as Layer.Layer<R, E, never>,
  options?: AppRuntimeOptions,
): ManagedRuntime.ManagedRuntime<R | ObservabilityPort, E> {
  const obsService = options?.observability ?? createObservabilityService();
  const obsLayer = Layer.succeed(ObservabilityPort, obsService);
  const combinedLayer = Layer.merge(obsLayer, deps);
  return ManagedRuntime.make(combinedLayer as Layer.Layer<R | ObservabilityPort, E, never>);
}
