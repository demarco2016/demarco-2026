// Zero-dependency static server for previewing the reel: npm run dev
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const port = Number(process.env.PORT) || 5173;
const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".mp4": "video/mp4", ".png": "image/png" };

createServer(async (req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    const file = join(root, path.endsWith("/") ? path + "index.html" : path);
    try {
        const body = await readFile(file);
        res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
        res.end(body);
    } catch {
        res.writeHead(404).end("Not found");
    }
}).listen(port, () => console.log(`Reel preview → http://localhost:${port}`));
