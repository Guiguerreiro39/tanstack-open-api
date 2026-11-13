import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

export interface TestAuthUser {
  id: string;
  name: string;
  email: string;
  role?: "admin" | "member" | "viewer" | "user" | string;
  image?: string | null;
}

const API_BASE = "http://localhost:9999";

export const defaultHandlers = [
  http.get("https://fonts.googleapis.com/*", () => {
    return new HttpResponse("", { headers: { "content-type": "text/css" } });
  }),
  http.get("https://fonts.gstatic.com/*", () => {
    return new HttpResponse("", { headers: { "content-type": "font/woff2" } });
  }),
  http.get("http://localhost:3000/*.css", () => {
    return new HttpResponse("", { headers: { "content-type": "text/css" } });
  }),
  http.get("http://localhost:3000/src/styles/*", () => {
    return new HttpResponse("", { headers: { "content-type": "text/css" } });
  }),
  http.get("http://localhost:3001/*.css", () => {
    return new HttpResponse("", { headers: { "content-type": "text/css" } });
  }),
  http.get("http://localhost:3001/src/styles/*", () => {
    return new HttpResponse("", { headers: { "content-type": "text/css" } });
  }),
  http.get(`${API_BASE}/api/auth/get-session`, () => {
    return HttpResponse.json(null);
  }),
  http.get("http://localhost:3000/api/auth/get-session", () => {
    return HttpResponse.json(null);
  }),
  http.get("http://localhost:3001/api/auth/get-session", () => {
    return HttpResponse.json(null);
  }),
  http.post(`${API_BASE}/api/auth/sign-out`, () => {
    return HttpResponse.json({ success: true });
  }),
  http.post("http://localhost:3000/api/auth/sign-out", () => {
    return HttpResponse.json({ success: true });
  }),
  http.post("http://localhost:3001/api/auth/sign-out", () => {
    return HttpResponse.json({ success: true });
  }),
  http.get("/api/auth/get-session", () => {
    return HttpResponse.json(null);
  }),
  http.post("/api/auth/sign-out", () => {
    return HttpResponse.json({ success: true });
  }),
];

export const server = setupServer(...defaultHandlers);

export function mockAuthSession(user: TestAuthUser | null) {
  const handler = () => {
    if (!user) {
      return HttpResponse.json(null);
    }
    const now = new Date().toISOString();
    return HttpResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: true,
        role: user.role ?? "user",
        image: user.image ?? null,
        createdAt: now,
        updatedAt: now,
      },
      session: {
        id: `session-${user.id}`,
        userId: user.id,
        token: `token-${user.id}`,
        expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
        createdAt: now,
        updatedAt: now,
      },
    });
  };

  server.use(
    http.get(`${API_BASE}/api/auth/get-session`, handler),
    http.get("http://localhost:3000/api/auth/get-session", handler),
    http.get("http://localhost:3001/api/auth/get-session", handler),
    http.get("/api/auth/get-session", handler),
  );
}

export function honoErrorResponse(
  status: 400 | 401 | 403 | 404 | 408 | 409 | 413 | 422 | 429 | 500 | 503,
  code: string,
  message: string,
  details?: unknown,
) {
  return HttpResponse.json(
    {
      error: {
        code,
        message,
        requestId: "req-test-123",
        ...(details !== undefined ? { details } : {}),
      },
    },
    {
      status,
      headers: { "X-Request-Id": "req-test-123" },
    },
  );
}
