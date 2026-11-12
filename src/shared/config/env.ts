import { Schema } from "effect";

const NumberCoercible = Schema.Union(Schema.Number, Schema.NumberFromString);

export const ClientEnvSchema = Schema.Struct({
  VITE_API_URL: Schema.optionalWith(Schema.String, { default: () => "" }),
  VITE_APP_VERSION: Schema.optionalWith(Schema.String, { default: () => "0.0.0" }),
  VITE_SENTRY_DSN: Schema.optional(Schema.String),
  VITE_SENTRY_TRACES_SAMPLE_RATE: Schema.optionalWith(NumberCoercible, { default: () => 0.2 }),
  VITE_SENTRY_REPLAY_SAMPLE_RATE: Schema.optionalWith(NumberCoercible, { default: () => 0.1 }),
  VITE_DD_APPLICATION_ID: Schema.optional(Schema.String),
  VITE_DD_CLIENT_TOKEN: Schema.optional(Schema.String),
  VITE_DD_SITE: Schema.optionalWith(Schema.String, { default: () => "datadoghq.com" }),
  VITE_DD_SERVICE: Schema.optionalWith(Schema.String, { default: () => "tanstack-open-api-web" }),
  VITE_DD_SESSION_SAMPLE_RATE: Schema.optionalWith(NumberCoercible, { default: () => 100 }),
  VITE_DD_REPLAY_SAMPLE_RATE: Schema.optionalWith(NumberCoercible, { default: () => 20 }),
  VITE_DD_TRACE_SAMPLE_RATE: Schema.optionalWith(NumberCoercible, { default: () => 100 }),
});

export type ClientEnv = Schema.Schema.Type<typeof ClientEnvSchema>;

export const ServerEnvSchema = Schema.Struct({
  API_INTERNAL_URL: Schema.optionalWith(Schema.String, { default: () => "http://localhost:9999" }),
  NODE_ENV: Schema.optionalWith(Schema.Literal("development", "production", "test"), {
    default: () => "development",
  }),
  PORT: Schema.optionalWith(NumberCoercible, { default: () => 3001 }),
  HOST: Schema.optionalWith(Schema.String, { default: () => "0.0.0.0" }),
});

export type ServerEnv = Schema.Schema.Type<typeof ServerEnvSchema>;

export interface AppEnv {
  client: ClientEnv;
  server?: ServerEnv;
}

let cachedEnv: AppEnv | null = null;

export function parseEnv(rawEnv?: Record<string, unknown>): AppEnv {
  if (cachedEnv && !rawEnv) {
    return cachedEnv;
  }

  const rawProcess = typeof process !== "undefined" ? process.env : {};
  const rawMeta = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
  const merged = { ...rawMeta, ...rawProcess, ...(rawEnv ?? {}) };

  const client = Schema.decodeUnknownSync(ClientEnvSchema)(merged);

  let server: ServerEnv | undefined;
  if (typeof window === "undefined") {
    server = Schema.decodeUnknownSync(ServerEnvSchema)(merged);
  }

  const result: AppEnv = { client, server };
  if (!rawEnv) {
    cachedEnv = result;
  }
  return result;
}

export function resolveApiUrl(path = ""): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  let baseUrl = "";
  if (typeof window === "undefined") {
    const rawProcess = typeof process !== "undefined" ? process.env : {};
    baseUrl = rawProcess.API_INTERNAL_URL || rawProcess.VITE_API_URL || "http://localhost:9999";
  } else {
    const rawMeta =
      typeof import.meta !== "undefined" && import.meta.env
        ? (import.meta.env as Record<string, string | undefined>)
        : {};
    baseUrl = rawMeta.VITE_API_URL || "";
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  if (!path) {
    return cleanBase;
  }

  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return cleanBase ? `${cleanBase}${cleanPath}` : cleanPath;
}
