import { QueryClient, type UseQueryOptions } from "@tanstack/react-query";

export interface SessionData {
  user?: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
    [key: string]: unknown;
  } | null;
  session?: unknown;
}

export type AuthSessionQueryOptions = UseQueryOptions<
  SessionData | null,
  unknown,
  SessionData | null,
  readonly ["auth", "session"]
>;

let sessionQueryOptions: AuthSessionQueryOptions | null = null;
const activeQueryClients = new Set<QueryClient>();

export function registerAuthSessionQueryOptions(options: unknown): void {
  sessionQueryOptions = options as AuthSessionQueryOptions;
}

export function getAuthSessionQueryOptions(): AuthSessionQueryOptions | null {
  return sessionQueryOptions;
}

export const defaultSessionQueryFn = async (): Promise<SessionData | null> => {
  if (sessionQueryOptions?.queryFn && typeof sessionQueryOptions.queryFn === "function") {
    const fallbackClient = activeQueryClients.values().next().value ?? new QueryClient();
    return sessionQueryOptions.queryFn({
      client: fallbackClient,
      queryKey: ["auth", "session"],
      meta: undefined,
      signal: new AbortController().signal,
    });
  }
  try {
    const res = await fetch("/api/auth/get-session", { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as SessionData;
  } catch {
    return null;
  }
};

export function registerQueryClient(client: QueryClient): () => void {
  activeQueryClients.add(client);
  return () => {
    activeQueryClients.delete(client);
  };
}

export function resetAuthSessionCache(): void {
  for (const client of activeQueryClients) {
    client.setQueryData(["auth", "session"], null);
  }
}

if (QueryClient?.prototype) {
  const origSetQueryData = QueryClient.prototype.setQueryData;
  Object.defineProperty(QueryClient.prototype, "setQueryData", {
    value: function (this: QueryClient, queryKey: unknown, updater: unknown, options?: unknown) {
      if (Array.isArray(queryKey) && queryKey[0] === "auth" && queryKey[1] === "session") {
        registerQueryClient(this);
      }
      return origSetQueryData.call(this, queryKey as never, updater as never, options as never);
    },
    writable: true,
    configurable: true,
  });
}
