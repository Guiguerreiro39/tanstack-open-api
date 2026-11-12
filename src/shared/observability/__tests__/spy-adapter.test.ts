import { describe, expect, it } from "vitest";
import { createSpyObservability } from "../spy-adapter";

describe("SpyObservabilityAdapter", () => {
  it("captures defects, React errors, and breadcrumbs in memory without console output", () => {
    const spy = createSpyObservability();

    const defect = new Error("Unexpected database connection drop");
    spy.captureDefect(defect, { source: "api", status: 500, requestId: "req_test_1" });

    expect(spy.defects).toHaveLength(1);
    expect(spy.defects[0].error).toBe(defect);
    expect(spy.defects[0].context?.requestId).toBe("req_test_1");

    const reactErr = new Error("Render threw an error");
    const errorInfo = { componentStack: "\n    in ErrorProneComponent\n    in App" };
    spy.captureReactError(reactErr, errorInfo);

    expect(spy.reactErrors).toHaveLength(1);
    expect(spy.reactErrors[0].error).toBe(reactErr);
    expect(spy.reactErrors[0].errorInfo).toBe(errorInfo);

    spy.recordBreadcrumb({
      category: "ui.click",
      message: "User clicked submit button",
      level: "info",
      data: { formId: "login-form" },
    });

    expect(spy.breadcrumbs).toHaveLength(1);
    expect(spy.breadcrumbs[0].category).toBe("ui.click");
    expect(spy.breadcrumbs[0].message).toBe("User clicked submit button");
  });

  it("manages user context transitions via setUserContext and clearUserContext", () => {
    const spy = createSpyObservability();
    expect(spy.currentUser).toBeNull();
    expect(spy.userHistory).toHaveLength(0);

    const user = {
      id: "usr_abc123",
      email: "engineer@company.com",
      name: "Lead Engineer",
    };

    spy.setUserContext(user);
    expect(spy.currentUser).toEqual(user);
    expect(spy.userHistory).toHaveLength(1);
    expect(spy.userHistory[0]).toEqual(user);

    spy.clearUserContext();
    expect(spy.currentUser).toBeNull();
    expect(spy.userHistory).toHaveLength(2);
    expect(spy.userHistory[1]).toBeNull();
  });

  it("clears all captured telemetry when reset() is called", () => {
    const spy = createSpyObservability();
    spy.captureDefect(new Error("err"));
    spy.captureReactError(new Error("react err"));
    spy.recordBreadcrumb({ category: "cat", message: "msg" });
    spy.setUserContext({ id: "usr_1" });

    expect(spy.defects).toHaveLength(1);
    expect(spy.reactErrors).toHaveLength(1);
    expect(spy.breadcrumbs).toHaveLength(1);
    expect(spy.currentUser).not.toBeNull();

    spy.reset();

    expect(spy.defects).toHaveLength(0);
    expect(spy.reactErrors).toHaveLength(0);
    expect(spy.breadcrumbs).toHaveLength(0);
    expect(spy.userHistory).toHaveLength(0);
    expect(spy.currentUser).toBeNull();
  });
});
