import { type QueryClient, queryOptions, useQuery } from "@tanstack/react-query";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Schema } from "effect";
import { registerAuthSessionQueryOptions } from "@/shared/lib/auth-session-bridge";
import type { ObservabilityService } from "@/shared/observability";
import { authClient } from "./client";

const DateOrString = Schema.Union(Schema.DateFromSelf, Schema.String);

export const AuthUserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  email: Schema.String,
  emailVerified: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  role: Schema.optionalWith(Schema.String, { default: () => "viewer" }),
  image: Schema.optionalWith(Schema.NullOr(Schema.String), { default: () => null }),
  createdAt: Schema.optional(DateOrString),
  updatedAt: Schema.optional(DateOrString),
});

export const AuthSessionDataSchema = Schema.Struct({
  id: Schema.String,
  userId: Schema.String,
  token: Schema.optional(Schema.String),
  expiresAt: Schema.optional(DateOrString),
  createdAt: Schema.optional(DateOrString),
  updatedAt: Schema.optional(DateOrString),
});

export const AuthEnvelopeSchema = Schema.Struct({
  user: AuthUserSchema,
  session: AuthSessionDataSchema,
});

export type AuthUser = Schema.Schema.Type<typeof AuthUserSchema>;
export type AuthSessionData = Schema.Schema.Type<typeof AuthSessionDataSchema>;
export type AuthEnvelope = Schema.Schema.Type<typeof AuthEnvelopeSchema>;

let activeObservability: ObservabilityService | null = null;

export function registerAuthObservability(obs: ObservabilityService | null): void {
  activeObservability = obs;
}

export function syncObservabilityUser(
  user: AuthUser | null,
  obs: ObservabilityService | null = activeObservability,
): void {
  if (!obs) return;

  if (user) {
    obs.setUserContext({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  } else {
    obs.clearUserContext();
  }
}

export const fetchAuthSession = createIsomorphicFn()
  .server(async (): Promise<AuthEnvelope | null> => {
    let headers: Record<string, string> | undefined;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const cookie = getRequestHeader("cookie");
      const authorization = getRequestHeader("authorization");
      if (cookie || authorization) {
        headers = {};
        if (cookie) headers.cookie = cookie;
        if (authorization) headers.authorization = authorization;
      }
    } catch {
      // Outside active StartEvent
    }

    try {
      const res = await authClient.getSession({
        query: { disableCookieCache: true },
        fetchOptions: headers ? { headers } : undefined,
      });

      if (res.error || !res.data?.user || !res.data?.session) {
        return null;
      }

      return Schema.decodeUnknownSync(AuthEnvelopeSchema)(res.data);
    } catch {
      return null;
    }
  })
  .client(async (): Promise<AuthEnvelope | null> => {
    try {
      const res = await authClient.getSession({
        query: { disableCookieCache: true },
      });
      if (res.error || !res.data?.user || !res.data?.session) {
        return null;
      }

      return Schema.decodeUnknownSync(AuthEnvelopeSchema)(res.data);
    } catch {
      return null;
    }
  });

export const authSessionQueryOptions = queryOptions({
  queryKey: ["auth", "session"] as const,
  queryFn: async (): Promise<AuthEnvelope | null> => {
    try {
      const result = await fetchAuthSession();
      if (result?.user) {
        syncObservabilityUser(result.user);
      } else {
        syncObservabilityUser(null);
      }
      return result;
    } catch {
      syncObservabilityUser(null);
      return null;
    }
  },
  staleTime: 5 * 60 * 1000,
  gcTime: 30 * 60 * 1000,
});

registerAuthSessionQueryOptions(authSessionQueryOptions);

export function useAuthSession() {
  const query = useQuery(authSessionQueryOptions);

  return {
    session: query.data?.session ?? null,
    user: query.data?.user ?? null,
    isLoading: query.isLoading,
    isAuthenticated: Boolean(query.data?.user),
    error: query.error,
    refetch: query.refetch,
  };
}

export async function invalidateAuthSession(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: authSessionQueryOptions.queryKey,
  });
}
