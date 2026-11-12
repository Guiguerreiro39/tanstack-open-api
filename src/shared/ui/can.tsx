import { useQuery, useQueryClient } from "@tanstack/react-query";
import type * as React from "react";
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

interface AuthSessionData {
  user?: RbacUser | null;
  session?: unknown;
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
  const { data: sessionData } = useQuery<AuthSessionData | null>({
    queryKey: ["auth", "session"],
    enabled: directUser === undefined,
    staleTime: Number.POSITIVE_INFINITY,
    queryFn: () =>
      (queryClient.getQueryData(["auth", "session"]) as AuthSessionData | null) ?? null,
  });

  const currentUser = directUser !== undefined ? directUser : (sessionData?.user ?? null);

  if (role && !hasRole(currentUser, role)) {
    return <>{fallback}</>;
  }

  if (action && !hasPermission({ user: currentUser, resource, action })) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
