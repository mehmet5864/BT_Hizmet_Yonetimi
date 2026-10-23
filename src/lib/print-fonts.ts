import { existsSync } from "node:fs";
import { join } from "node:path";

function firstExisting(paths: string[]) {
  return paths.find((path) => path && existsSync(path)) ?? null;
}

export function printFontPaths() {
  const cwd = process.cwd();
  const regular = firstExisting([
    join(cwd, "fonts", "DejaVuSans.ttf"),
    join(cwd, "public", "fonts", "DejaVuSans.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ]);
  const bold = firstExisting([
    join(cwd, "fonts", "DejaVuSans-Bold.ttf"),
    join(cwd, "public", "fonts", "DejaVuSans-Bold.ttf"),
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  ]);
  if (!regular || !bold) {
    throw new Error("DejaVu yazı tipleri bulunamadı. fonts/ klasörü paketle birlikte gelmelidir.");
  }
  return { regular, bold };
}
