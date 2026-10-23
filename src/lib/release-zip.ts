import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { APP_VERSION } from "@/lib/app-version";

const VERSIONED = /^BT-Hizmet-Yonetimi-(\d+\.\d+\.\d+)\.zip$/;

export function releaseZipName() {
  return `BT-Hizmet-Yonetimi-${APP_VERSION}.zip`;
}

function versionParts(value: string) {
  return value.split(".").map((part) => Number(part));
}

function newerVersion(left: string, right: string) {
  const a = versionParts(left);
  const b = versionParts(right);
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

export function findReleaseZip() {
  const roots = [join(process.cwd(), "public"), join(process.cwd(), "release")];
  let best: { path: string; name: string; version: string } | null = null;

  for (const root of roots) {
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

  if (best) return best;

  for (const root of roots) {
    const name = "BT-Hizmet-Yonetimi-kurulum.zip";
    const path = join(root, name);
    if (existsSync(path)) return { path, name, version: APP_VERSION };
  }

  return null;
}
