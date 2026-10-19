// Minimal local preview server for the static site (no dependencies).
// Usage: node serve.mjs [port]   → http://localhost:8080
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2] || process.env.PORT || 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".mp4": "video/mp4",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith("/")) rel += "index.html";
    const file = path.normalize(path.join(root, rel));
    // Block path traversal and the private dev folder
    if (!file.startsWith(root) || file.includes(`${path.sep}_dev${path.sep}`) || file.includes(`${path.sep}.git`)) throw Object.assign(new Error(), { code: "ENOENT" });
    const info = await stat(file);
    if (!info.isFile()) throw Object.assign(new Error(), { code: "ENOENT" });
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(body);
  } catch {
    const body = await readFile(path.join(root, "404.html")).catch(() => "Not found");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  }
}).listen(port, () => console.log(`S-TRADIX preview: http://localhost:${port}`));
