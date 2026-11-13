import { describe, expect, it } from "vitest";
import { hasPermission } from "@/shared/lib/rbac";

describe("Repro: Member granted delete/CRUD on undefined or unlisted resource", () => {
  it("proves hasPermission grants member delete on undefined resource 'billing'", () => {
    const isGranted = hasPermission({
      role: "member",
      resource: "billing",
      action: "delete",
    });
    console.log(
      "[Repro Result] hasPermission({ role: 'member', resource: 'billing', action: 'delete' }) =",
      isGranted,
    );
    expect(isGranted).toBe(false);
  });
});
