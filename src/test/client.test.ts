import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("Client Hydration Entry (src/client.tsx)", () => {
  it("exists and configures React 19 root error hooks to captureReactError", () => {
    const clientPath = resolve(process.cwd(), "src/client.tsx");
    expect(existsSync(clientPath)).toBe(true);

    const content = readFileSync(clientPath, "utf-8");
    expect(content).toContain("hydrateRoot");
    expect(content).toContain("StartClient");
    expect(content).toContain("onUncaughtError");
    expect(content).toContain("onCaughtError");
    expect(content).toContain("onRecoverableError");
    expect(content).toContain("captureReactError");
  });
});
