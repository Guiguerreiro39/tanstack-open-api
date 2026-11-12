import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { ClientEnvSchema, parseEnv, resolveApiUrl, ServerEnvSchema } from "../env";

describe("Environment Configuration & Schemas", () => {
  it("decodes client environment with default fallbacks", () => {
    const parsed = Schema.decodeUnknownSync(ClientEnvSchema)({});
    expect(parsed.VITE_API_URL).toBe("");
    expect(parsed.VITE_APP_VERSION).toBe("0.0.0");
    expect(parsed.VITE_DD_SITE).toBe("datadoghq.com");
  });

  it("decodes server environment with default fallbacks in server context", () => {
    const parsed = Schema.decodeUnknownSync(ServerEnvSchema)({});
    expect(parsed.NODE_ENV).toBe("development");
    expect(parsed.PORT).toBe(3001);
    expect(parsed.HOST).toBe("0.0.0.0");
    expect(parsed.API_INTERNAL_URL).toBe("http://localhost:9999");
  });

  it("coerces string PORT into a number in ServerEnvSchema", () => {
    const parsed = Schema.decodeUnknownSync(ServerEnvSchema)({
      PORT: "4000",
      NODE_ENV: "production",
      HOST: "127.0.0.1",
      API_INTERNAL_URL: "http://api:9999",
    });
    expect(parsed.PORT).toBe(4000);
    expect(parsed.NODE_ENV).toBe("production");
    expect(parsed.HOST).toBe("127.0.0.1");
    expect(parsed.API_INTERNAL_URL).toBe("http://api:9999");
  });

  it("parseEnv() parses current environment successfully", () => {
    const env = parseEnv();
    expect(env).toBeDefined();
    expect(typeof env.client.VITE_API_URL).toBe("string");
  });

  describe("resolveApiUrl()", () => {
    it("returns absolute URLs unchanged", () => {
      expect(resolveApiUrl("https://example.com/api/v1")).toBe("https://example.com/api/v1");
      expect(resolveApiUrl("http://localhost:8080/doc")).toBe("http://localhost:8080/doc");
    });

    it("appends relative paths to base URL", () => {
      const url = resolveApiUrl("/api/v1/tasks");
      expect(url.endsWith("/api/v1/tasks")).toBe(true);
      expect(url.includes("//api/v1")).toBe(false);
    });

    it("handles relative path without leading slash", () => {
      const url = resolveApiUrl("api/v1/tasks");
      expect(url.endsWith("/api/v1/tasks")).toBe(true);
    });

    it("returns the base URL when called with empty or no argument", () => {
      const base = resolveApiUrl();
      expect(typeof base).toBe("string");
      expect(base.endsWith("/")).toBe(false);
    });
  });
});
