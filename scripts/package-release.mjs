#!/usr/bin/env node
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const RELEASE = join(ROOT, "release");
const NAME = "BT-Hizmet-Yonetimi-kurulum";
const VERSION = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
const DEST = join(RELEASE, NAME);

const SKIP_DIR = new Set([
  ".git",
  ".next",
  "node_modules",
  "release",
  "coverage",
  ".vercel",
  ".cursor",
  "lisans-uretici",
  "yedekler",
]);

const SKIP_FILE = new Set([
  ".env",
  "next-env.d.ts",
  "AGENTS.md",
  "CLAUDE.md",
  "indir.html",
  "BT-Hizmet-Yonetimi-kurulum.zip",
]);
SKIP_FILE.add(`BT-Hizmet-Yonetimi-${VERSION}.zip`);

function skip(name, rel) {
  if (SKIP_DIR.has(name) || SKIP_FILE.has(name)) return true;
  if (name.endsWith(".db") || name.endsWith(".db-journal") || name.endsWith(".tsbuildinfo")) return true;
  if (name.endsWith(".key") || name === "private-key.pem") return true;
  if (name.endsWith(".bak") || name === "__pycache__") return true;
  if (name.endsWith(".zip") || name.endsWith(".tar.gz")) return true;
  if (rel.startsWith("public/uploads/") && name !== ".gitkeep") return true;
  if (name === ".seeded" || name === ".kurulum-ok") return true;
  return false;
}

function walk(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const rel = relative(ROOT, src).replaceAll("\\", "/");
    if (skip(entry.name, rel)) continue;
    const dst = join(to, entry.name);
    if (entry.isDirectory()) {
      walk(src, dst);
    } else if (entry.isFile()) {
      cpSync(src, dst);
    }
  }
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
walk(ROOT, DEST);
mkdirSync(join(DEST, "public", "uploads"), { recursive: true });
writeFileSync(join(DEST, "public", "uploads", ".gitkeep"), "");

for (const script of [
  "install-docker.sh",
  "baslat-docker.sh",
  "yukle-docker.sh",
  "guncelle-docker.sh",
  "durdur-docker.sh",
  "yedekle-docker.sh",
  "geri-yukle-docker.sh",
  "scripts/docker-desktop.sh",
  "scripts/write-env.sh",
]) {
  const path = join(DEST, script);
  if (existsSync(path)) execSync(`chmod +x "${path}"`);
}

writeFileSync(
  join(DEST, "OKU.txt"),
  [
    `BT Hizmet Yonetimi  ${VERSION}`,
    "",
    "Docker Desktop (PostgreSQL ile, Node.js gerekmez):",
    "  Zip'i Docker penceresine SURUKLEMEYIN.",
    "  1. Docker Desktop acik, balina sabit.",
    "  2. Windows:  install-docker.bat   (ilk kurulum / guncelleme)",
    "     macOS/Linux:  ./install-docker.sh",
    "  3. Sonra:  baslat-docker.bat   Durdur: durdur-docker.bat",
    "  4. down -v YASAK (veritabanini siler).",
    "",
    "Sunucu (on-premise): ON-PREMISE-KURULUM.md",
    "Lisans: Ayarlar > Lisans (anahtar yoksa kisitli mod: 25 kullanici, cekirdek moduller).",
    "Yedek: yedekle-docker.bat   Geri yukle: geri-yukle-docker.bat <dosya>",
    "",
    "Tarayici: http://127.0.0.1:43130",
    "Giris: ahmet.yilmaz   Parola: Kurum123!",
    "",
    "Ayrinti: KURULUM.md  ve  SURUM.md",
    "",
  ].join("\n"),
);

const zipName = `${NAME}.zip`;
const zipPath = join(RELEASE, zipName);
if (existsSync(zipPath)) rmSync(zipPath);

const hasZip = (() => {
  try {
    execSync("zip -v", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const versionedName = `BT-Hizmet-Yonetimi-${VERSION}.zip`;
if (hasZip) {
  execSync(`zip -qry "${zipName}" "${NAME}"`, { cwd: RELEASE, stdio: "inherit" });
  cpSync(zipPath, join(RELEASE, versionedName));
} else {
  execSync(`tar -czf "${NAME}.tar.gz" "${NAME}"`, { cwd: RELEASE, stdio: "inherit" });
}

const publicDir = join(ROOT, "public");
if (hasZip) {
  mkdirSync(publicDir, { recursive: true });
  cpSync(zipPath, join(publicDir, zipName));
  cpSync(join(RELEASE, versionedName), join(publicDir, versionedName));
}

const artifactDir = "/opt/cursor/artifacts";
if (existsSync(artifactDir)) {
  const built = hasZip ? zipPath : join(RELEASE, `${NAME}.tar.gz`);
  const out = join(artifactDir, hasZip ? zipName : `${NAME}.tar.gz`);
  cpSync(built, out);
  if (hasZip) cpSync(zipPath, join(artifactDir, versionedName));
  console.log(`Artifact: ${out}`);
}

console.log(`Paket hazır: ${hasZip ? zipPath : join(RELEASE, `${NAME}.tar.gz`)}  (sürüm ${VERSION})`);
if (hasZip) console.log(`İndirme: /${versionedName}  ve  /indir.html`);
