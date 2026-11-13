import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements, userAc } from "better-auth/plugins/admin/access";

export type AppRole = "admin" | "member" | "viewer";
export type ResourceScope = "own" | "all";

export interface RbacUser {
  id?: string;
  role?: string | null;
  [key: string]: unknown;
}

export interface ResourceSubject {
  id?: string;
  userId?: string | null;
  ownerId?: string | null;
  type?: string;
  scope?: ResourceScope;
  [key: string]: unknown;
}

export const RBAC_STATEMENTS = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "impersonate-admins",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
  task: ["create", "read", "read:any", "update", "update:any", "delete", "delete:any"],
  file: ["create", "read", "read:any", "delete", "delete:any"],
} as const;

export const ROLE_STATEMENTS = {
  admin: {
    user: [
      "create",
      "list",
      "set-role",
      "ban",
      "impersonate",
      "impersonate-admins",
      "delete",
      "set-password",
      "set-email",
      "get",
      "update",
    ],
    session: ["list", "revoke", "delete"],
    task: ["create", "read", "read:any", "update", "update:any", "delete", "delete:any"],
    file: ["create", "read", "read:any", "delete", "delete:any"],
  },
  member: {
    user: ["get", "update"],
    session: ["list", "revoke"],
    task: ["create", "read", "update", "delete"],
    file: ["create", "read", "delete"],
  },
  viewer: {
    user: ["get"],
    session: ["list"],
    task: ["read"],
    file: ["read"],
  },
} as const;

export const accessControl = createAccessControl({
  ...defaultStatements,
  ...RBAC_STATEMENTS,
} as const);

export const accessRoles = {
  admin: accessControl.newRole({
    ...adminAc.statements,
    ...ROLE_STATEMENTS.admin,
  }),
  member: accessControl.newRole({
    ...userAc.statements,
    ...ROLE_STATEMENTS.member,
  }),
  viewer: accessControl.newRole({
    ...ROLE_STATEMENTS.viewer,
  }),
  // Alias "user" for Better Auth server compat
  user: accessControl.newRole({
    ...userAc.statements,
    ...ROLE_STATEMENTS.member,
  }),
};

export function normalizeRole(role?: string | null): AppRole {
  if (!role) {
    return "viewer";
  }
  const clean = role.toLowerCase().trim();
  if (clean === "admin") {
    return "admin";
  }
  if (clean === "member" || clean === "user") {
    return "member";
  }
  return "viewer";
}

export function isAdmin(userOrRole?: RbacUser | string | null): boolean {
  if (!userOrRole) return false;
  if (typeof userOrRole === "string") {
    return normalizeRole(userOrRole) === "admin";
  }
  return normalizeRole(userOrRole.role) === "admin";
}

export function hasRole(
  userOrRole: RbacUser | string | null | undefined,
  targetRole: AppRole,
): boolean {
  if (!userOrRole) return false;
  const current =
    typeof userOrRole === "string" ? normalizeRole(userOrRole) : normalizeRole(userOrRole.role);
  return current === targetRole;
}

export interface HasPermissionOptions {
  role?: AppRole | string | null;
  user?: RbacUser | null;
  resource?: string | ResourceSubject | null;
  action: string;
}

export function hasPermission({ role, user, resource, action }: HasPermissionOptions): boolean {
  const effectiveRole = normalizeRole(role ?? user?.role);

  if (effectiveRole === "admin") {
    return true;
  }

  // Viewers are read-only
  if (effectiveRole === "viewer") {
    const isReadAction = action === "read" || action === "get" || action === "list";
    if (!isReadAction) {
      return false;
    }
  }

  // Parse resource and ownership
  let resourceType: string | undefined;
  let ownerId: string | undefined;
  let scope: ResourceScope = "own";

  if (typeof resource === "string") {
    resourceType = resource;
  } else if (resource && typeof resource === "object") {
    resourceType =
      resource.type ??
      (resource.id?.startsWith("task")
        ? "task"
        : resource.id?.startsWith("file")
          ? "file"
          : undefined);
    ownerId = resource.userId ?? resource.ownerId ?? undefined;
    scope = resource.scope ?? "own";
  }

  let effectiveAction = action;
  if (!resourceType && effectiveAction.includes(":") && !effectiveAction.endsWith(":any")) {
    const colonIndex = effectiveAction.indexOf(":");
    const prefix = effectiveAction.slice(0, colonIndex);
    const subAction = effectiveAction.slice(colonIndex + 1);
    resourceType = prefix.replace(/s$/, "");
    effectiveAction = subAction;
  }

  // If resource has an owner and user is provided, check ownership
  if (ownerId && user?.id) {
    if (ownerId !== user.id) {
      // Non-owner requires ":any" permission on the action
      if (!effectiveAction.endsWith(":any")) {
        return false;
      }
    }
  }

  // Check role statements
  const statementsForRole = ROLE_STATEMENTS[effectiveRole];
  if (!statementsForRole) {
    return false;
  }

  if (resourceType && resourceType in statementsForRole) {
    const actions = (statementsForRole as Record<string, readonly string[]>)[resourceType];
    return actions.includes(effectiveAction);
  }

  // If action contains ":any", non-admins are denied (admin is already handled above)
  if (effectiveAction.endsWith(":any")) {
    return false;
  }

  // Default permissions by role
  if (effectiveRole === "member") {
    if (scope === "all" && effectiveAction !== "read") {
      return false;
    }
    return ["create", "read", "update", "delete", "get", "list"].includes(effectiveAction);
  }

  return false;
}

export function canAccessResource(
  user: RbacUser | null | undefined,
  resource: ResourceSubject,
  type: "task" | "file" | string,
  action: "create" | "read" | "update" | "delete" | string,
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;

  const isOwner =
    (resource.userId && resource.userId === user.id) ||
    (resource.ownerId && resource.ownerId === user.id);

  if (isOwner) {
    return hasPermission({
      user,
      resource: { ...resource, type },
      action,
    });
  }

  // Foreign resource requires action:any permission
  return hasPermission({
    user,
    resource: { ...resource, type, scope: "all" },
    action: `${action}:any`,
  });
}

export class ForbiddenError extends Error {
  readonly _tag = "ForbiddenError";
  readonly status = 403;

  constructor(message = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function requirePermission(
  user: RbacUser | null | undefined,
  permission: { resource: string | ResourceSubject; action: string },
): void {
  if (!user || !hasPermission({ user, ...permission })) {
    throw new ForbiddenError(
      `Forbidden: Lacking permission '${permission.action}' on '${
        typeof permission.resource === "string"
          ? permission.resource
          : permission.resource.type || "resource"
      }'`,
    );
  }
}
