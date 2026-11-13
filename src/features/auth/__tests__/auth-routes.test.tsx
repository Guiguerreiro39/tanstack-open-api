import { fireEvent, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { mockAuthSession, server } from "@/test/msw-server";
import { renderAppRoutes } from "@/test/render";

describe("Auth Routes & Guards", () => {
  it("renders protected _app dashboard for authenticated user", async () => {
    const testUser = {
      id: "u-admin-1",
      name: "Admin User",
      email: "admin@example.com",
      role: "admin" as const,
    };
    mockAuthSession(testUser);

    const { router } = await renderAppRoutes({
      initialEntries: ["/"],
      user: testUser,
    });

    expect(router.state.location.pathname).toBe("/");
    await waitFor(() => {
      expect(screen.getAllByText("Admin User").length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /tasks/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /files/i })).toBeInTheDocument();
  });

  it("redirects unauthenticated access from protected route to /login?redirect=...", async () => {
    mockAuthSession(null);

    const { router } = await renderAppRoutes({
      initialEntries: ["/"],
      user: null,
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/login");
    });

    expect(router.state.location.search).toEqual({ redirect: "/" });
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("redirects authenticated user away from /login to target destination", async () => {
    const testUser = {
      id: "u-member-1",
      name: "Member User",
      email: "member@example.com",
      role: "member" as const,
    };
    mockAuthSession(testUser);

    const { router } = await renderAppRoutes({
      initialEntries: ["/login?redirect=/"],
      user: testUser,
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
  });

  it("submits login form and updates session upon successful sign in", async () => {
    mockAuthSession(null);

    let signInReceived: unknown = null;
    const postHandler = async ({ request }: { request: Request }) => {
      signInReceived = await request.json();
      return HttpResponse.json({
        user: {
          id: "u-signed-in",
          name: "Signed In User",
          email: "signedin@example.com",
          emailVerified: true,
          role: "member",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: "token-signed-in",
      });
    };

    server.use(
      http.post("http://localhost:3000/api/auth/sign-in/email", postHandler),
      http.post("http://localhost:3001/api/auth/sign-in/email", postHandler),
      http.post("http://localhost:9999/api/auth/sign-in/email", postHandler),
      http.post("/api/auth/sign-in/email", postHandler),
    );

    const { router } = await renderAppRoutes({
      initialEntries: ["/login"],
      user: null,
    });

    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    // Re-mock session for post-login query
    mockAuthSession({
      id: "u-signed-in",
      name: "Signed In User",
      email: "signedin@example.com",
      role: "member",
    });

    const form = submitButton.closest("form");
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(submitButton);
    }

    await waitFor(() => {
      expect(signInReceived).toEqual({
        email: "test@example.com",
        password: "password123",
      });
    });

    await waitFor(() => {
      expect(router.state.location.pathname).toBe("/");
    });
  });
});
