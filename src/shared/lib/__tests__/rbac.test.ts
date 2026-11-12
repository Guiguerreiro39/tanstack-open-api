import { describe, expect, it } from "vitest";
import {
  canAccessResource,
  ForbiddenError,
  hasPermission,
  hasRole,
  isAdmin,
  normalizeRole,
  requirePermission,
} from "../rbac";

describe("RBAC Permissions Matrix & Helpers", () => {
  const adminUser = { id: "user-admin", role: "admin" as const, email: "admin@example.com" };
  const memberUser = { id: "user-member", role: "member" as const, email: "member@example.com" };
  const viewerUser = { id: "user-viewer", role: "viewer" as const, email: "viewer@example.com" };
  const legacyUser = { id: "user-legacy", role: "user" as const, email: "legacy@example.com" };

  describe("normalizeRole", () => {
    it("maps standard roles and normalizes 'user' to 'member'", () => {
      expect(normalizeRole("admin")).toBe("admin");
      expect(normalizeRole("member")).toBe("member");
      expect(normalizeRole("viewer")).toBe("viewer");
      expect(normalizeRole("user")).toBe("member");
      expect(normalizeRole(undefined)).toBe("viewer");
      expect(normalizeRole(null)).toBe("viewer");
    });
  });

  describe("hasRole & isAdmin", () => {
    it("correctly identifies admin status", () => {
      expect(isAdmin(adminUser)).toBe(true);
      expect(isAdmin("admin")).toBe(true);
      expect(isAdmin(memberUser)).toBe(false);
      expect(isAdmin(viewerUser)).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });

    it("evaluates role equality with normalization", () => {
      expect(hasRole(adminUser, "admin")).toBe(true);
      expect(hasRole(memberUser, "member")).toBe(true);
      expect(hasRole(legacyUser, "member")).toBe(true);
      expect(hasRole(viewerUser, "viewer")).toBe(true);
      expect(hasRole(memberUser, "admin")).toBe(false);
    });
  });

  describe("hasPermission", () => {
    it("grants admin full access to any resource and action", () => {
      expect(hasPermission({ role: "admin", action: "create", resource: "task" })).toBe(true);
      expect(hasPermission({ role: "admin", action: "delete:any", resource: "file" })).toBe(true);
      expect(hasPermission({ user: adminUser, action: "ban", resource: "user" })).toBe(true);
    });

    it("allows members access to own resources and limits :any actions", () => {
      expect(hasPermission({ user: memberUser, action: "create", resource: "task" })).toBe(true);
      expect(hasPermission({ user: memberUser, action: "read", resource: "task" })).toBe(true);
      expect(hasPermission({ user: memberUser, action: "update", resource: "task" })).toBe(true);
      expect(hasPermission({ user: memberUser, action: "delete", resource: "task" })).toBe(true);

      // Members cannot perform :any actions
      expect(hasPermission({ user: memberUser, action: "read:any", resource: "task" })).toBe(false);
      expect(hasPermission({ user: memberUser, action: "delete:any", resource: "file" })).toBe(
        false,
      );
      expect(hasPermission({ user: memberUser, action: "ban", resource: "user" })).toBe(false);
    });

    it("restricts viewers to read-only actions", () => {
      expect(hasPermission({ user: viewerUser, action: "read", resource: "task" })).toBe(true);
      expect(hasPermission({ user: viewerUser, action: "read", resource: "file" })).toBe(true);
      expect(hasPermission({ user: viewerUser, action: "create", resource: "task" })).toBe(false);
      expect(hasPermission({ user: viewerUser, action: "update", resource: "task" })).toBe(false);
      expect(hasPermission({ user: viewerUser, action: "delete", resource: "file" })).toBe(false);
    });

    it("respects resource ownership when object is passed", () => {
      const ownTask = { id: "t1", userId: memberUser.id };
      const othersTask = { id: "t2", userId: "other-user" };

      expect(hasPermission({ user: memberUser, resource: ownTask, action: "delete" })).toBe(true);
      expect(hasPermission({ user: memberUser, resource: othersTask, action: "delete" })).toBe(
        false,
      );
      expect(hasPermission({ user: adminUser, resource: othersTask, action: "delete" })).toBe(true);
    });
  });

  describe("canAccessResource", () => {
    const ownResource = { id: "task-1", userId: "user-member" };
    const foreignResource = { id: "task-2", userId: "other-person" };

    it("allows owner to access own resource for allowed actions", () => {
      expect(canAccessResource(memberUser, ownResource, "task", "read")).toBe(true);
      expect(canAccessResource(memberUser, ownResource, "task", "update")).toBe(true);
      expect(canAccessResource(memberUser, ownResource, "task", "delete")).toBe(true);
    });

    it("denies non-owner from updating or deleting foreign resource without :any permission", () => {
      expect(canAccessResource(memberUser, foreignResource, "task", "update")).toBe(false);
      expect(canAccessResource(memberUser, foreignResource, "task", "delete")).toBe(false);
    });

    it("allows admin to access any foreign resource via :any permissions", () => {
      expect(canAccessResource(adminUser, foreignResource, "task", "update")).toBe(true);
      expect(canAccessResource(adminUser, foreignResource, "task", "delete")).toBe(true);
    });
  });

  describe("requirePermission", () => {
    it("passes quietly when user has required permissions", () => {
      expect(() => {
        requirePermission(adminUser, { resource: "user", action: "ban" });
      }).not.toThrow();

      expect(() => {
        requirePermission(memberUser, { resource: "task", action: "create" });
      }).not.toThrow();
    });

    it("throws ForbiddenError with status 403 when user lacks permission", () => {
      expect(() => {
        requirePermission(viewerUser, { resource: "task", action: "delete" });
      }).toThrow(ForbiddenError);

      try {
        requirePermission(viewerUser, { resource: "task", action: "delete" });
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenError);
        expect((e as ForbiddenError).status).toBe(403);
        expect((e as ForbiddenError)._tag).toBe("ForbiddenError");
      }
    });
  });
});
