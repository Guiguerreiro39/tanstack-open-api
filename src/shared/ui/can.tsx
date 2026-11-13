import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
  defaultSessionQueryFn,
  getAuthSessionQueryOptions,
  registerQueryClient,
  type SessionData,
} from "@/shared/lib/auth-session-bridge";
import {
  type AppRole,
  hasPermission,
  hasRole,
  type RbacUser,
  type ResourceSubject,
} from "@/shared/lib/rbac";

export interface CanProps {
  role?: AppRole;
  action?: string;
  resource?: string | ResourceSubject | null;
  user?: RbacUser | null;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function Can({
  role,
  action,
  resource,
  user: directUser,
  fallback = null,
  children,
}: CanProps) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    return registerQueryClient(queryClient);
  }, [queryClient]);

  const bridgeOptions = getAuthSessionQueryOptions();
  const cachedSession = queryClient.getQueryData<SessionData>(["auth", "session"]);

  const { data: sessionData } = useQuery({
    queryKey: ["auth", "session"] as const,
    enabled: directUser === undefined,
    initialData: () => cachedSession ?? null,
    staleTime:
      typeof bridgeOptions?.staleTime === "number" ? bridgeOptions.staleTime : 5 * 60 * 1000,
    queryFn: bridgeOptions?.queryFn ? (bridgeOptions.queryFn as never) : defaultSessionQueryFn,
  }) as { data?: SessionData | null };

  const currentUser =
    directUser !== undefined
      ? directUser
      : ((sessionData?.user ?? cachedSession?.user ?? null) as RbacUser | null);

  if (role && !hasRole(currentUser, role)) {
    return <>{fallback}</>;
  }

  if (action && !hasPermission({ user: currentUser, resource, action })) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
