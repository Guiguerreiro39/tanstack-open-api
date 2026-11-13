import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_PORT = Number(process.env.PORT || 3000);
const DEFAULT_HOST = process.env.HOST || "0.0.0.0";
const DEFAULT_API_INTERNAL_URL = (process.env.API_INTERNAL_URL || "http://127.0.0.1:9999").replace(
  /\/$/,
  "",
);

let rootDir;
try {
  rootDir = fileURLToPath(new URL(".", import.meta.url));
} catch {
  rootDir = process.cwd();
}
const defaultClientDir = join(rootDir, "dist", "client");
const defaultServerEntryPath = join(rootDir, "dist", "server", "server.js");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
};

/**
 * Creates the request handler for the production server.
 *
 * @param {object} [options]
 * @param {string} [options.clientDir] - Directory where static assets are located
 * @param {string} [options.serverEntryPath] - Path to TanStack Start server bundle
 * @param {string} [options.apiInternalUrl] - Upstream API reverse-proxy URL
 * @param {Function} [options.serverHandler] - Custom SSR handler
 */
export async function createAppHandler(options = {}) {
  const clientDir = resolve(options.clientDir || defaultClientDir);
  const serverEntryPath = options.serverEntryPath || defaultServerEntryPath;
  const apiInternalUrl = (options.apiInternalUrl || DEFAULT_API_INTERNAL_URL).replace(/\/$/, "");

  let serverHandler = options.serverHandler || null;
  if (!serverHandler && existsSync(serverEntryPath)) {
    try {
      const mod = await import(pathToFileURL(serverEntryPath).href);
      serverHandler = mod.default?.fetch || mod.fetch;
    } catch (err) {
      console.error("Failed to load server handler:", err);
    }
  }

  return async function requestHandler(req, res) {
    const hostHeader = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `http://${hostHeader}`);

    // 1. Health check probe
    if (url.pathname === "/health") {
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end(
        JSON.stringify({
          status: "ok",
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    // 2. Reverse proxy for /api/* and /_storage/*
    if (
      url.pathname === "/api" ||
      url.pathname.startsWith("/api/") ||
      url.pathname === "/_storage" ||
      url.pathname.startsWith("/_storage/")
    ) {
      const targetUrl = new URL(url.pathname + url.search, apiInternalUrl);
      const isHttps = targetUrl.protocol === "https:";
      const makeRequest = isHttps ? httpsRequest : httpRequest;

      const proxyHeaders = { ...req.headers, host: targetUrl.host };
      delete proxyHeaders.connection;

      const proxyReq = makeRequest(
        targetUrl,
        {
          method: req.method,
          headers: proxyHeaders,
        },
        (proxyRes) => {
          res.statusCode = proxyRes.statusCode || 200;
          res.statusMessage = proxyRes.statusMessage || "";

          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value !== undefined) {
              res.setHeader(key, value);
            }
          }

          if (proxyRes.headers["content-type"]?.includes("text/event-stream")) {
            res.setHeader("X-Accel-Buffering", "no");
          }

          if (req.method === "HEAD") {
            res.end();
            return;
          }

          proxyRes.pipe(res);
        },
      );

      proxyReq.on("error", (err) => {
        console.error(`Proxy error for ${url.pathname}:`, err);
        if (!res.headersSent) {
          res.writeHead(502, {
            "Content-Type": "application/json; charset=utf-8",
          });
          res.end(
            JSON.stringify({
              error: {
                code: "BAD_GATEWAY",
                message: "Upstream service unreachable",
              },
            }),
          );
        }
      });

      req.pipe(proxyReq);
      return;
    }

    // 3. Static assets from client directory
    // Prevent directory traversal
    const safePathname = normalize(url.pathname).replace(/^(\.\.[/\\])+/, "");
    const staticPath = join(clientDir, safePathname);

    if (staticPath.startsWith(clientDir) && existsSync(staticPath)) {
      try {
        const stats = statSync(staticPath);
        if (stats.isFile()) {
          const ext = extname(staticPath).toLowerCase();
          const contentType = MIME_TYPES[ext] || "application/octet-stream";
          const headers = {
            "Content-Type": contentType,
            "Content-Length": stats.size,
          };

          if (safePathname.startsWith("/assets/")) {
            headers["Cache-Control"] = "public, max-age=31536000, immutable";
          } else {
            headers["Cache-Control"] = "no-cache";
          }

          res.writeHead(200, headers);
          if (req.method === "HEAD") {
            res.end();
            return;
          }
          createReadStream(staticPath).pipe(res);
          return;
        }
      } catch {
        // Fall through to SSR if stat fails
      }
    }

    // 4. SSR / WinterCG handler via @tanstack/react-start
    if (serverHandler) {
      try {
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value === undefined) continue;
          if (Array.isArray(value)) {
            for (const v of value) {
              headers.append(key, v);
            }
          } else {
            headers.set(key, value);
          }
        }

        const isBodyAllowed = req.method !== "GET" && req.method !== "HEAD";
        const webReq = new Request(url, {
          method: req.method,
          headers,
          body: isBodyAllowed ? req : undefined,
          duplex: isBodyAllowed ? "half" : undefined,
        });

        const webRes = await serverHandler(webReq);

        res.statusCode = webRes.status;
        res.statusMessage = webRes.statusText;

        for (const [key, value] of webRes.headers.entries()) {
          if (key.toLowerCase() === "set-cookie") {
            continue;
          }
          res.setHeader(key, value);
        }

        const setCookies =
          typeof webRes.headers.getSetCookie === "function" ? webRes.headers.getSetCookie() : [];
        if (setCookies.length > 0) {
          res.setHeader("set-cookie", setCookies);
        }

        if (req.method === "HEAD" || !webRes.body) {
          res.end();
          return;
        }

        Readable.fromWeb(webRes.body).pipe(res);
        return;
      } catch (err) {
        console.error("SSR handler error:", err);
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Internal Server Error");
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  };
}

/**
 * Creates and wraps an HTTP server instance with graceful shutdown support.
 *
 * @param {object} [options]
 * @param {number} [options.port] - Port to listen on (default: 3000)
 * @param {string} [options.host] - Host address to bind to (default: 0.0.0.0)
 * @param {string} [options.clientDir] - Static assets directory
 * @param {string} [options.serverEntryPath] - SSR server entrypoint
 * @param {string} [options.apiInternalUrl] - Upstream proxy URL
 * @param {Function} [options.serverHandler] - Custom SSR handler
 */
export function createAppServer(options = {}) {
  const port = options.port !== undefined ? options.port : DEFAULT_PORT;
  const host = options.host || DEFAULT_HOST;

  let requestHandlerPromise = null;
  const connections = new Set();

  const httpServer = createHttpServer(async (req, res) => {
    if (!requestHandlerPromise) {
      requestHandlerPromise = createAppHandler(options);
    }
    const handler = await requestHandlerPromise;
    await handler(req, res);
  });

  httpServer.on("connection", (socket) => {
    connections.add(socket);
    socket.once("close", () => {
      connections.delete(socket);
    });
  });

  return {
    httpServer,
    port,
    host,
    start() {
      return new Promise((resolve, reject) => {
        httpServer.once("error", reject);
        httpServer.listen(port, host, () => {
          httpServer.removeListener("error", reject);
          resolve(httpServer);
        });
      });
    },
    stop(gracePeriodMs = 5000) {
      return new Promise((resolve) => {
        // Stop accepting new connections
        httpServer.close(() => {
          resolve();
        });

        // Gracefully drain existing idle/active connections if close takes too long
        if (typeof httpServer.closeIdleConnections === "function") {
          httpServer.closeIdleConnections();
        }

        const timer = setTimeout(() => {
          for (const socket of connections) {
            socket.destroy();
          }
          connections.clear();
          resolve();
        }, gracePeriodMs);

        timer.unref?.();
      });
    },
  };
}

// Auto-start when executed as the main script
let isMain = false;
try {
  if (process.argv[1]) {
    const scriptPath = resolve(process.argv[1]);
    const serverPath = resolve(rootDir, "server.mjs");
    isMain =
      scriptPath === serverPath ||
      (import.meta.url.startsWith("file:") && import.meta.url === pathToFileURL(scriptPath).href);
  }
} catch {
  isMain = false;
}

if (isMain) {
  const app = createAppServer();
  await app.start();
  const address = app.httpServer.address();
  const boundPort = typeof address === "object" && address ? address.port : app.port;
  console.log(`Server listening on http://${app.host}:${boundPort}`);

  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    await app.stop(10000);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
