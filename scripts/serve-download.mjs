#!/usr/bin/env node
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";

const ROOT = process.cwd();
const PORT = Number(process.env.DOWNLOAD_PORT || 43187);
const VERSIONED = /^BT-Hizmet-Yonetimi-(\d+\.\d+\.\d+)\.zip$/;
const ROOTS = [join(ROOT, "public"), join(ROOT, "release"), "/opt/cursor/artifacts"];

function newerVersion(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

function newestZip() {
  let best = null;
  for (const root of ROOTS) {
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root)) {
      const match = name.match(VERSIONED);
      if (!match) continue;
      const version = match[1];
      if (!best || newerVersion(version, best.version)) {
        best = { path: join(root, name), name, version };
      }
    }
  }
  return best;
}

function pageFor(zip) {
  const { version, name } = zip;
  return `<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BT Hizmet Yönetimi ${version}</title>
    <style>
      :root { color-scheme: light; }
      body {
        margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
        padding: 24px; font-family: system-ui, "Segoe UI", sans-serif; background: #eff2f5; color: #17181c;
      }
      main {
        width: min(440px, 100%); background: #fff; border: 1px solid #d3dde9; border-radius: 16px;
        padding: 28px 24px; box-shadow: 0 12px 40px rgba(35, 47, 64, 0.08);
      }
      h1 { margin: 0 0 8px; font-size: 1.25rem; }
      p { margin: 0 0 16px; color: #707f93; line-height: 1.5; font-size: 0.95rem; }
      a.btn {
        display: block; text-align: center; text-decoration: none; background: #276dd9; color: #fff;
        font-weight: 600; padding: 14px 16px; border-radius: 10px;
      }
      a.btn:hover { filter: brightness(0.95); }
      ol { margin: 20px 0 0; padding-left: 1.2rem; color: #17181c; font-size: 0.9rem; line-height: 1.6; }
      code { font-size: 0.85rem; }
    </style>
  </head>
  <body>
    <main>
      <h1>BT Hizmet Yönetimi ${version}</h1>
      <p>Kurulum zip’i budur (sürüm ${version}). Zip’i Docker Desktop’a sürüklemeyin. Açın, <code>yukle-docker.bat</code> çalıştırın.</p>
      <a class="btn" href="/${name}" download="${name}">${version} paketini indir</a>
      <ol>
        <li>Zip’i ayrı klasöre açın (eski sürüm klasörünün üstüne yazmayın).</li>
        <li><code>yukle-docker.bat</code> dosyasına çift tıklayın.</li>
        <li>Zip’i Docker’a sürüklemeyin. <code>down -v</code> yazmayın.</li>
      </ol>
    </main>
  </body>
</html>`;
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const zip = newestZip();

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (!zip) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Kurulum paketi henüz hazır değil.");
    return;
  }

  if (path === "/" || path === "/indir") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(pageFor(zip));
    return;
  }

  if (path === `/${zip.name}` || path === "/api/paket" || path === "/indir.zip") {
    const size = statSync(zip.path).size;
    res.writeHead(200, {
      "Content-Type": "application/zip",
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename="${zip.name}"`,
    });
    createReadStream(zip.path).pipe(res);
    return;
  }

  if (path === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(302, { Location: "/" });
  res.end();
  void extname;
});

const boot = newestZip();
if (!boot) {
  console.error("Kurulum zip’i bulunamadı.");
  process.exit(1);
}

server.listen(PORT, "0.0.0.0", () => {
  console.log(`${boot.version} indirme: http://127.0.0.1:${PORT}/`);
  console.log(`Zip: http://127.0.0.1:${PORT}/${boot.name}`);
});
