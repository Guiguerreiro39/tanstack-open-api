import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "0.0.0.0";
const API_INTERNAL_URL = (process.env.API_INTERNAL_URL || "http://localhost:9999").replace(
  /\/$/,
  "",
);

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const clientDir = join(rootDir, "dist", "client");
const serverEntryPath = join(rootDir, "dist", "server", "server.js");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

let serverHandler = null;
if (existsSync(serverEntryPath)) {
  try {
    const mod = await import(serverEntryPath);
    serverHandler = mod.default?.fetch || mod.fetch;
  } catch (err) {
    console.error("Failed to load server handler:", err);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  // 1. Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // 2. Reverse proxy for /api/*
  if (url.pathname.startsWith("/api/")) {
    const targetUrl = new URL(url.pathname + url.search, API_INTERNAL_URL);
    try {
      const headers = { ...req.headers, host: targetUrl.host };
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
        duplex: "half",
      });

      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(value);
          await pump();
        };
        await pump();
      } else {
        res.end();
      }
      return;
    } catch (err) {
      console.error("Proxy error:", err);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad Gateway" }));
      return;
    }
  }

  // 3. Static assets
  const staticPath = join(clientDir, url.pathname);
  if (existsSync(staticPath) && statSync(staticPath).isFile()) {
    const ext = extname(staticPath);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const headers = { "Content-Type": contentType };
    if (url.pathname.startsWith("/assets/")) {
      headers["Cache-Control"] = "public, max-age=31536000, immutable";
    }
    res.writeHead(200, headers);
    createReadStream(staticPath).pipe(res);
    return;
  }

  // 4. SSR / WinterCG handler
  if (serverHandler) {
    try {
      const webReq = new Request(url, {
        method: req.method,
        headers: req.headers,
        body: req.method !== "GET" && req.method !== "HEAD" ? req : undefined,
        duplex: "half",
      });
      const webRes = await serverHandler(webReq);
      res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
      const buffer = await webRes.arrayBuffer();
      res.end(Buffer.from(buffer));
      return;
    } catch (err) {
      console.error("SSR handler error:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
      return;
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});
