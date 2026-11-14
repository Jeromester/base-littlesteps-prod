// Tiny static server for Little Steps: `node serve.js` then open http://localhost:5173
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const ROOT = __dirname, PORT = process.env.PORT || 5173;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png" };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.normalize(path.join(ROOT, p));
  if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-cache" });
    res.end(data);
  });
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Little Steps running at http://localhost:${PORT}`);
  for (const ifs of Object.values(os.networkInterfaces())) for (const i of ifs) if (i.family === "IPv4" && !i.internal) console.log(`On your phone (same Wi-Fi): http://${i.address}:${PORT}`);
});
