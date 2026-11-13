import http from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { createRequestHandler, defaultStreamHandler } from "@tanstack/react-router/ssr/server";
import { http as mswHttp, passthrough } from "msw";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createAppServer } from "../../server.mjs";
import { getRouter } from "../router";
import { server as mswServer } from "./msw-server";

const testSsrHandler = async (request: Request) => {
  const handler = createRequestHandler({
    request,
    createRouter: () => getRouter(),
  });
  return await handler(defaultStreamHandler);
};

interface TestResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
  json: <T = unknown>() => T;
}

const fixturesClientDir = resolve(process.cwd(), "src/test/fixtures/client");

function request(
  url: string,
  options: http.RequestOptions & { body?: string | Buffer } = {},
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(parsed, options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers,
          body,
          json: <T = unknown>() => JSON.parse(body) as T,
        });
      });
    });
    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

describe("Production Server (server.mjs)", () => {
  let appServer: ReturnType<typeof createAppServer>;
  let baseUrl: string;
  let upstreamServer: http.Server;
  let upstreamUrl: string;
  let lastUpstreamRequest: {
    method?: string;
    url?: string;
    headers?: http.IncomingHttpHeaders;
    body?: string;
  } = {};

  beforeAll(async () => {
    // 1. Start a mock upstream backend server for API and _storage proxy tests
    upstreamServer = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        lastUpstreamRequest = {
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        };

        if (req.url === "/api/v1/tasks" && req.method === "GET") {
          res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
            "X-Upstream-Trace": "true",
          });
          res.end(JSON.stringify([{ id: "task-1", title: "Task 1" }]));
          return;
        }

        if (req.url === "/api/v1/tasks" && req.method === "POST") {
          res.writeHead(201, {
            "Content-Type": "application/json; charset=utf-8",
          });
          res.end(JSON.stringify({ id: "task-new", title: "Created Task" }));
          return;
        }

        if (req.url?.startsWith("/_storage/avatars/user.png")) {
          res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Length": "4",
          });
          res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
          return;
        }

        if (req.url === "/api/auth/cookies") {
          res.setHeader("set-cookie", [
            "session=sid-123; Path=/; HttpOnly; SameSite=Lax",
            "refresh=r-456; Path=/; HttpOnly; SameSite=Strict",
          ]);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ authenticated: true }));
          return;
        }

        if (req.url === "/api/v1/tasks/live") {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          res.write('event: update\ndata: {"count":1}\n\n');
          res.end();
          return;
        }

        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
      });
    });

    await new Promise<void>((resolve) => {
      upstreamServer.listen(0, "127.0.0.1", () => resolve());
    });
    const upstreamAddr = upstreamServer.address() as AddressInfo;
    upstreamUrl = `http://127.0.0.1:${upstreamAddr.port}`;

    mswServer.use(
      mswHttp.all(/^http:\/\/127\.0\.0\.1:\d+/, () => {
        return passthrough();
      }),
    );

    appServer = createAppServer({
      port: 0,
      host: "127.0.0.1",
      clientDir: fixturesClientDir,
      apiInternalUrl: upstreamUrl,
      serverHandler: testSsrHandler,
    });
    await appServer.start();
    const addr = appServer.httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${addr.port}`;
  });

  beforeEach(() => {
    mswServer.use(
      mswHttp.all(/^http:\/\/127\.0\.0\.1:\d+/, () => {
        return passthrough();
      }),
    );
  });

  afterAll(async () => {
    if (appServer) {
      await appServer.stop();
    }
    if (upstreamServer) {
      await new Promise<void>((resolve) => upstreamServer.close(() => resolve()));
    }
  });

  describe("Health Check Endpoint", () => {
    it("responds with 200 OK and status JSON with timestamp", async () => {
      const res = await request(`${baseUrl}/health`);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.headers["cache-control"]).toBe("no-cache, no-store, must-revalidate");

      const data = res.json<{ status: string; timestamp: string }>();
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
      expect(new Date(data.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe("Static Asset Serving & Cache Headers", () => {
    it("serves hashed assets under /assets/ with immutable cache header", async () => {
      const res = await request(`${baseUrl}/assets/test-bundle.12345678.js`);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/javascript/);
      expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
      expect(res.body).toContain('console.log("test bundle");');
    });

    it("serves css hashed assets with correct content-type and immutable caching", async () => {
      const res = await request(`${baseUrl}/assets/styles.87654321.css`);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/css/);
      expect(res.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
      expect(res.body).toContain("margin: 0");
    });

    it("serves non-hashed static files with no-cache header", async () => {
      const res = await request(`${baseUrl}/robots.txt`);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/plain/);
      expect(res.headers["cache-control"]).toBe("no-cache");
      expect(res.body).toContain("User-agent: *");
    });

    it("supports HEAD requests for static assets without returning body", async () => {
      const res = await request(`${baseUrl}/robots.txt`, { method: "HEAD" });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/plain/);
      expect(res.headers["content-length"]).toBeDefined();
      expect(res.body).toBe("");
    });

    it("blocks directory traversal attempts outside clientDir", async () => {
      const res = await request(`${baseUrl}/../../package.json`);
      // Should either be 404 Not Found or delegated to SSR (not leaking package.json)
      expect(res.body).not.toContain('"name": "tanstack-open-api"');
    });
  });

  describe("Reverse Proxy Routing (/api/* and /_storage/*)", () => {
    it("proxies GET /api/* requests preserving headers and streaming response", async () => {
      const res = await request(`${baseUrl}/api/v1/tasks`, {
        method: "GET",
        headers: {
          "x-request-id": "req-custom-99",
          traceparent: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
          cookie: "session=sid-abc",
          authorization: "Bearer test-jwt-token",
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers["x-upstream-trace"]).toBe("true");
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.json()).toEqual([{ id: "task-1", title: "Task 1" }]);

      // Verify headers were forwarded to upstream
      expect(lastUpstreamRequest.headers?.["x-request-id"]).toBe("req-custom-99");
      expect(lastUpstreamRequest.headers?.traceparent).toBe(
        "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
      );
      expect(lastUpstreamRequest.headers?.cookie).toBe("session=sid-abc");
      expect(lastUpstreamRequest.headers?.authorization).toBe("Bearer test-jwt-token");
    });

    it("proxies POST /api/* requests forwarding request body stream", async () => {
      const payload = JSON.stringify({ title: "Write Dockerfile" });
      const res = await request(`${baseUrl}/api/v1/tasks`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload).toString(),
        },
        body: payload,
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toEqual({ id: "task-new", title: "Created Task" });
      expect(lastUpstreamRequest.body).toBe(payload);
    });

    it("proxies /_storage/* binary file requests", async () => {
      const res = await request(`${baseUrl}/_storage/avatars/user.png`);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(Buffer.from(res.body, "binary").length).toBe(4);
    });

    it("preserves multiple Set-Cookie headers from upstream response", async () => {
      const res = await request(`${baseUrl}/api/auth/cookies`);
      expect(res.statusCode).toBe(200);
      const setCookies = res.headers["set-cookie"];
      expect(Array.isArray(setCookies)).toBe(true);
      expect(setCookies).toHaveLength(2);
      expect(setCookies?.[0]).toContain("session=sid-123");
      expect(setCookies?.[1]).toContain("refresh=r-456");
    });

    it("sets X-Accel-Buffering: no on text/event-stream responses for real-time SSE", async () => {
      const res = await request(`${baseUrl}/api/v1/tasks/live`);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toBe("text/event-stream");
      expect(res.headers["x-accel-buffering"]).toBe("no");
      expect(res.body).toContain("event: update");
    });

    it("aborts upstream proxy request when client disconnects prematurely", async () => {
      let upstreamClosed = false;
      const hungServer = http.createServer((_req, res) => {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.write("data: initial\n\n");
        _req.on("close", () => {
          upstreamClosed = true;
        });
      });
      await new Promise<void>((r) => hungServer.listen(0, "127.0.0.1", () => r()));
      const hungPort = (hungServer.address() as AddressInfo).port;

      const proxyApp = createAppServer({
        port: 0,
        host: "127.0.0.1",
        apiInternalUrl: `http://127.0.0.1:${hungPort}`,
      });
      await proxyApp.start();
      const proxyPort = (proxyApp.httpServer.address() as AddressInfo).port;

      try {
        await new Promise<void>((done) => {
          const clientReq = http.get(`http://127.0.0.1:${proxyPort}/api/v1/tasks/live`, (res) => {
            res.once("data", () => {
              clientReq.destroy();
              setTimeout(() => {
                expect(upstreamClosed).toBe(true);
                done();
              }, 100);
            });
          });
        });
      } finally {
        hungServer.close();
        await proxyApp.stop();
      }
    });

    it("returns 502 Bad Gateway when upstream service is unreachable", async () => {
      // Create a server pointing to a non-existent port (e.g. 59999)
      const offlineApp = createAppServer({
        port: 0,
        host: "127.0.0.1",
        apiInternalUrl: "http://127.0.0.1:59999",
      });
      await offlineApp.start();
      const offlineAddr = offlineApp.httpServer.address() as AddressInfo;
      const offlineUrl = `http://127.0.0.1:${offlineAddr.port}`;

      try {
        const res = await request(`${offlineUrl}/api/test-failure`);
        expect(res.statusCode).toBe(502);
        expect(res.headers["content-type"]).toMatch(/application\/json/);
        expect(res.json<{ error: { code: string; message: string } }>().error.code).toBe(
          "BAD_GATEWAY",
        );
      } finally {
        await offlineApp.stop();
      }
    });
  });

  describe("SSR WinterCG Handler Delegation", () => {
    it("renders HTML pages via TanStack Start SSR handler on /showcase", async () => {
      const res = await request(`${baseUrl}/showcase`);
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toMatch(/text\/html/);
      expect(res.body).toContain("<!DOCTYPE html>");
      expect(res.body).toContain("Design System Showcase");
    });

    it("handles SSR execution error returning 500 status", async () => {
      const throwingApp = createAppServer({
        port: 0,
        host: "127.0.0.1",
        serverHandler: async () => {
          throw new Error("Simulated SSR render crash");
        },
      });
      await throwingApp.start();
      const addr = throwingApp.httpServer.address() as AddressInfo;
      const throwingUrl = `http://127.0.0.1:${addr.port}`;

      try {
        const res = await request(`${throwingUrl}/some-route`);
        expect(res.statusCode).toBe(500);
        expect(res.headers["content-type"]).toMatch(/text\/plain/);
        expect(res.body).toBe("Internal Server Error");
      } finally {
        await throwingApp.stop();
      }
    });
  });

  describe("Server Lifecycle & Graceful Shutdown", () => {
    it("starts and stops cleanly, refusing new connections after shutdown", async () => {
      const lifecycleApp = createAppServer({
        port: 0,
        host: "127.0.0.1",
      });
      await lifecycleApp.start();
      const addr = lifecycleApp.httpServer.address() as AddressInfo;
      const port = addr.port;

      const healthRes = await request(`http://127.0.0.1:${port}/health`);
      expect(healthRes.statusCode).toBe(200);

      await lifecycleApp.stop(500);

      await expect(request(`http://127.0.0.1:${port}/health`)).rejects.toThrow();
    });
  });
});
