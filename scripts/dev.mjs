import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLoginHandler } from "../server/admin-login.js";
try {
  loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public",
);
const login = createLoginHandler();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};
const server = http.createServer(async (req, res) => {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (value) => {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(value));
    return res;
  };
  try {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/api/admin-login") {
      let bytes = 0;
      const chunks = [];
      for await (const chunk of req) {
        bytes += chunk.length;
        if (bytes > 16384)
          return res.status(413).json({ error: "Permintaan terlalu besar." });
        chunks.push(chunk);
      }
      req.body = Buffer.concat(chunks).toString("utf8");
      return await login(req, res);
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      return res.end();
    }
    let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    if ((await stat(file)).isDirectory()) {
      if (!url.pathname.endsWith("/")) {
        res.writeHead(302, { Location: url.pathname + "/" + url.search });
        return res.end();
      }
      file = path.join(file, "index.html");
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch (error) {
    res.writeHead(error.code === "ENOENT" ? 404 : 500, {
      "Content-Type": "text/plain",
    });
    res.end(error.code === "ENOENT" ? "Not found" : "Request failed");
  }
});
const port = Number(process.env.PORT || 8000);
server.listen(port, "127.0.0.1", () =>
  console.log(
    `Development server running on port ${port}; static output and login API enabled.`,
  ),
);
