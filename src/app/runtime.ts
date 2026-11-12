import { Layer, ManagedRuntime } from "effect";

export type AppRuntime<R = never, E = never> = ManagedRuntime.ManagedRuntime<R, E>;

/**
 * Creates an isolated Effect ManagedRuntime instance without global side effects.
 * Supports per-request SSR isolation and per-test Layer injection.
 */
export function createAppRuntime<R = never, E = never>(
  deps: Layer.Layer<R, E, never> = Layer.empty as unknown as Layer.Layer<R, E, never>,
): ManagedRuntime.ManagedRuntime<R, E> {
  return ManagedRuntime.make(deps);
}
