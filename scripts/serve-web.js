#!/usr/bin/env node
/**
 * FoodFix React.js Web Production Server + Local Lamion AI Proxy
 * Serves dist/ on http://localhost:3000 (configurable via PORT)
 * and forwards /api/lamion-* requests cleanly without browser CORS blocks.
 */

const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const DIST_DIR = path.resolve(__dirname, "../dist");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

const PROXY_TARGETS = [
  { prefix: "/api/lamion-nim", base: "https://integrate.api.nvidia.com/v1" },
  { prefix: "/api/lamion-core", base: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" },
  { prefix: "/api/lamion-router", base: "https://openrouter.ai/api/v1" },
];

function handleProxy(req, res, targetUrl) {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const parsed = new URL(targetUrl);
    const headers = {
      "Content-Type": req.headers["content-type"] || "application/json",
    };
    if (req.headers.authorization) {
      headers.Authorization = req.headers.authorization;
    }

    const proxyReq = https.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, {
          "Content-Type": proxyRes.headers["content-type"] || "application/json",
        });
        proxyRes.pipe(res);
      },
    );

    proxyReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    });

    if (body.length > 0) proxyReq.write(body);
    proxyReq.end();
  });
}

const server = http.createServer((req, res) => {
  const urlPath = (req.url || "/").split("?")[0];

  const proxyMatch = PROXY_TARGETS.find((p) => urlPath.startsWith(p.prefix));
  if (proxyMatch) {
    const suffix = urlPath.slice(proxyMatch.prefix.length);
    return handleProxy(req, res, `${proxyMatch.base}${suffix}`);
  }

  let filePath = path.join(DIST_DIR, urlPath === "/" ? "index.html" : urlPath);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, "index.html");
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    return res.end("Web build not found in dist/. Run npm run build:pwa first.");
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`FoodFix React.js Web Server running at http://localhost:${PORT}`);
});

