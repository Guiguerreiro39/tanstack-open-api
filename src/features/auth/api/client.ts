import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { resolveApiUrl } from "@/shared/config/env";
import { accessControl, accessRoles } from "@/shared/lib/rbac";

export const authClient = createAuthClient({
  baseURL:
    resolveApiUrl() ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:9999"),
  fetchOptions: {
    credentials: "include",
  },
  sessionOptions: {
    refetchOnWindowFocus: false,
    refetchInterval: 0,
  },
  plugins: [
    adminClient({
      ac: accessControl,
      roles: accessRoles,
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
