import { describe, expect, it } from "vitest";
import { sanitizeRedirect } from "@/features/auth/model/schemas";

describe("Repro: Open Redirect via backslash bypass in sanitizeRedirect", () => {
  it("proves sanitizeRedirect fails to block /\\evil.com", () => {
    const maliciousInput = "/\\evil.com";
    const result = sanitizeRedirect(maliciousInput);

    console.log(`[Repro Result] sanitizeRedirect("${maliciousInput}") = "${result}"`);
    console.log(
      `[Repro Result] WHATWG URL resolution in browser context: ${new URL(result, "http://localhost:3000").href}`,
    );

    expect(result).toBe("/");
  });
});
