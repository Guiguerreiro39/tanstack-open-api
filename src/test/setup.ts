import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";
import { MockEventSource } from "./mock-event-source";
import { server } from "./msw-server";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  Object.defineProperty(globalThis, "EventSource", {
    writable: true,
    configurable: true,
    value: MockEventSource,
  });

  if (typeof Element !== "undefined") {
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.setPointerCapture ??= () => {};
    Element.prototype.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
  }
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  MockEventSource.reset();
});

afterAll(() => {
  server.close();
});
