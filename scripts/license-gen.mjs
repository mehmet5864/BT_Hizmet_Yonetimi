#!/usr/bin/env node
// Lisans üretici. ÖZEL ANAHTAR yalnızca satıcıda durur; uygulama paketine konmaz.
// Kullanım:
//   node license-gen.mjs --key private-key.pem --customer "Kurum Adı" --users 50000 --expires 2027-12-31 [--id LIC-0001] [--note "..."]
//   --expires yoksa süresiz.
//   --modules personel,envanter,olay,...  (virgülle) ya da --modules all (varsayılan: hepsi)
//   Modül adları: personel envanter talepler degisiklik yama konfigurasyon zafiyet firma-sla olay problem cevik katalog surec hareketler raporlar api
import { createPrivateKey, sign } from "node:crypto";
import { readFileSync } from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "true"]);
    return acc;
  }, []),
);
if (!args.key || !args.customer || !args.users) {
  console.error('Kullanım: node license-gen.mjs --key private-key.pem --customer "Kurum" --users 50000 [--expires 2027-12-31] [--id LIC-0001]');
  process.exit(1);
}
const users = Number(args.users);
if (!Number.isInteger(users) || users < 1) {
  console.error("--users pozitif tam sayı olmalı");
  process.exit(1);
}
if (args.expires && Number.isNaN(Date.parse(args.expires))) {
  console.error("--expires geçerli bir tarih olmalı (YYYY-AA-GG)");
  process.exit(1);
}
const ALL = ["personel","envanter","talepler","degisiklik","yama","konfigurasyon","zafiyet","firma-sla","olay","problem","cevik","katalog","surec","hareketler","raporlar","api"];
let modules = ALL;
if (args.modules && args.modules !== "all") {
  modules = args.modules.split(",").map((m) => m.trim()).filter(Boolean);
  const bad = modules.filter((m) => !ALL.includes(m));
  if (bad.length) {
    console.error("Bilinmeyen modül: " + bad.join(", ") + "\nGeçerli: " + ALL.join(" "));
    process.exit(1);
  }
}
const payload = {
  v: 1,
  licenseId: args.id || `LIC-${Date.now().toString(36).toUpperCase()}`,
  customer: args.customer,
  maxUsers: users,
  issued: new Date().toISOString().slice(0, 10),
  expires: args.expires ? new Date(args.expires + "T23:59:59Z").toISOString() : null,
  modules,
  ...(args.note ? { note: args.note } : {}),
};
const b64u = (buf) => Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const body = b64u(JSON.stringify(payload));
const sig = sign(null, Buffer.from(body, "ascii"), createPrivateKey(readFileSync(args.key)));
console.log(`BTHY1.${body}.${b64u(sig)}`);
