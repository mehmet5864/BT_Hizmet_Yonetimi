import net from "node:net";
import tls from "node:tls";

import { isIpAddress, tlsVerifyOptions } from "@/lib/integrations/net";
import type { SystemSettings } from "@/lib/settings";
import { isSafeHostname, isSafeUsername } from "@/lib/security/http";

export type AdBindResult = {
  ok: boolean;
  groups: string[];
  message: string;
  /** Kullanıcı kaydının distinguishedName değeri (OU yolu için). */
  dn?: string;
};

const SESSION_TIMEOUT_MS = 8000;

/* ---- Küçük BER/LDAP kodlayıcı ---- */

function lenBytes(length: number) {
  if (length < 128) return Buffer.from([length]);
  if (length < 256) return Buffer.from([0x81, length]);
  return Buffer.from([0x82, (length >> 8) & 0xff, length & 0xff]);
}

function tlv(tag: number, ...parts: Buffer[]) {
  const body = Buffer.concat(parts);
  return Buffer.concat([Buffer.from([tag]), lenBytes(body.length), body]);
}

const int = (n: number) => tlv(0x02, Buffer.from([n]));
const enumerated = (n: number) => tlv(0x0a, Buffer.from([n]));
const octet = (value: string) => tlv(0x04, Buffer.from(value, "utf8"));

function bindRequest(id: number, dn: string, password: string) {
  return tlv(0x30, int(id), tlv(0x60, int(3), octet(dn), tlv(0x80, Buffer.from(password, "utf8"))));
}

function searchRequest(id: number, baseDn: string, samAccountName: string) {
  return tlv(
    0x30,
    int(id),
    tlv(
      0x63,
      octet(baseDn),
      enumerated(2), // wholeSubtree
      enumerated(0), // neverDerefAliases
      int(2), // sizeLimit
      int(10), // timeLimit
      tlv(0x01, Buffer.from([0])), // typesOnly=false
      tlv(0xa3, octet("sAMAccountName"), octet(samAccountName)),
      tlv(0x30, octet("memberOf")),
    ),
  );
}

function unbindRequest(id: number) {
  return tlv(0x30, int(id), Buffer.from([0x42, 0x00]));
}

/* ---- Ayrıştırıcı ---- */

type Tlv = { tag: number; start: number; end: number; next: number };

function readTlv(buf: Buffer, offset: number): Tlv | null {
  if (offset + 2 > buf.length) return null;
  const tag = buf[offset];
  const first = buf[offset + 1];
  let length = first;
  let header = 2;
  if (first & 0x80) {
    const count = first & 0x7f;
    if (count < 1 || count > 4 || offset + 2 + count > buf.length) return null;
    length = 0;
    for (let i = 0; i < count; i += 1) length = length * 256 + buf[offset + 2 + i];
    header = 2 + count;
  }
  const start = offset + header;
  const end = start + length;
  if (end > buf.length) return null;
  return { tag, start, end, next: end };
}

function children(buf: Buffer, parent: Tlv): Tlv[] {
  const out: Tlv[] = [];
  let cursor = parent.start;
  while (cursor < parent.end) {
    const item = readTlv(buf, cursor);
    if (!item) break;
    out.push(item);
    cursor = item.next;
  }
  return out;
}

function groupFromDn(dn: string) {
  const match = /^CN=((?:\\.|[^,])+)/i.exec(dn.trim());
  if (!match) return null;
  const name = match[1].replace(/\\(.)/g, "$1").trim();
  return name && name.length < 120 ? name : null;
}

type LdapMessage = { op: number; body: Tlv; buf: Buffer };

function takeMessage(pending: Buffer): { message: LdapMessage; rest: Buffer } | null {
  const outer = readTlv(pending, 0);
  if (!outer || outer.tag !== 0x30) return null;
  const msg = pending.subarray(0, outer.next);
  const parts = children(msg, { tag: 0x30, start: outer.start, end: outer.end, next: outer.next });
  const op = parts[1];
  if (!op) return null;
  return { message: { op: op.tag, body: op, buf: msg }, rest: pending.subarray(outer.next) };
}

function entryGroups(message: LdapMessage): string[] {
  // SearchResultEntry: objectName, attributes SEQUENCE OF { type, SET OF value }
  const parts = children(message.buf, message.body);
  const attrs = parts[1];
  if (!attrs) return [];
  const groups: string[] = [];
  for (const attr of children(message.buf, attrs)) {
    const pair = children(message.buf, attr);
    const type = pair[0] ? message.buf.subarray(pair[0].start, pair[0].end).toString("utf8").toLowerCase() : "";
    if (type !== "memberof" || !pair[1]) continue;
    for (const value of children(message.buf, pair[1])) {
      const dn = message.buf.subarray(value.start, value.end).toString("utf8");
      const name = groupFromDn(dn);
      if (name) groups.push(name);
    }
  }
  return groups;
}

function entryDn(message: LdapMessage): string | null {
  const first = children(message.buf, message.body)[0];
  if (!first) return null;
  const dn = message.buf.subarray(first.start, first.end).toString("utf8").trim();
  return dn && dn.length < 600 ? dn : null;
}

function resultCode(message: LdapMessage): number {
  const first = children(message.buf, message.body)[0];
  return first ? message.buf[first.start] : -1;
}

/* ---- Oturum ---- */

function bindName(ad: SystemSettings["ad"], username: string) {
  if (username.includes("@") || username.includes("\\")) return username;
  const domain = ad.baseDn
    .split(",")
    .map((part) => part.trim())
    .filter((part) => /^DC=/i.test(part))
    .map((part) => part.slice(3))
    .join(".");
  return domain ? `${username}@${domain}` : username;
}

function samName(username: string) {
  if (username.includes("\\")) return username.split("\\").pop() ?? username;
  if (username.includes("@")) return username.split("@")[0];
  return username;
}

function describeCode(code: number) {
  if (code === 49) return "AD kimlik doğrulaması reddedildi.";
  if (code === 53) return "AD sunucusu isteği reddetti (bağlantı güvenli olmalı olabilir; LDAPS deneyin).";
  if (code === 50) return "AD hesabının bu işlem için yetkisi yok.";
  return `AD sunucusu hata döndürdü (kod ${code}).`;
}

function connectSocket(ad: SystemSettings["ad"], port: number, onReady: () => void): net.Socket {
  return ad.useLdaps
    ? tls.connect(
        { host: ad.host, port, ...(isIpAddress(ad.host) ? {} : { servername: ad.host }), ...tlsVerifyOptions() },
        onReady,
      )
    : net.connect({ host: ad.host, port }, onReady);
}

async function ldapSession(
  ad: SystemSettings["ad"],
  bindDn: string,
  password: string,
  search: { baseDn: string; sam: string } | null,
): Promise<AdBindResult> {
  const port = ad.port || (ad.useLdaps ? 636 : 389);
  return new Promise<AdBindResult>((resolve, reject) => {
    let pending: Buffer = Buffer.alloc(0);
    let done = false;
    let phase: "bind" | "search" = "bind";
    const groups = new Set<string>();
    let userDn: string | undefined;

    const finish = (result: AdBindResult | Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        socket.write(unbindRequest(3));
      } catch {
        /* bağlantı zaten kapanmış olabilir */
      }
      socket.destroy();
      if (result instanceof Error) reject(result);
      else resolve(result);
    };

    const socket = connectSocket(ad, port, () => socket.write(bindRequest(1, bindDn, password)));
    const timer = setTimeout(() => finish(new Error("AD oturumu zaman aşımına uğradı.")), SESSION_TIMEOUT_MS);

    socket.on("error", (error) => finish(error));
    socket.on("close", () => finish(new Error("AD sunucusu bağlantıyı beklenmedik şekilde kapattı.")));
    socket.on("data", (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      for (;;) {
        const taken = takeMessage(pending);
        if (!taken) return;
        pending = Buffer.from(taken.rest);
        const { message } = taken;
        if (phase === "bind" && message.op === 0x61) {
          const code = resultCode(message);
          if (code !== 0) return finish({ ok: false, groups: [], message: describeCode(code) });
          if (!search) return finish({ ok: true, groups: [], message: "Active Directory oturumu açıldı." });
          phase = "search";
          socket.write(searchRequest(2, search.baseDn, search.sam));
        } else if (phase === "search" && message.op === 0x64) {
          for (const name of entryGroups(message)) groups.add(name);
          userDn ??= entryDn(message) ?? undefined;
        } else if (phase === "search" && message.op === 0x65) {
          // Grup araması başarısız olsa da oturum açıldı sayılır (yetkiler varsayılan role düşer).
          return finish({ ok: true, groups: [...groups], message: "Active Directory oturumu açıldı.", dn: userDn });
        }
      }
    });
  });
}

/** Kullanıcı kimlik bilgileriyle bind eder, ardından kullanıcının memberOf gruplarını okur. */
export async function bindActiveDirectory(
  ad: SystemSettings["ad"],
  username: string,
  password: string,
): Promise<AdBindResult> {
  if (!ad.host || !isSafeHostname(ad.host)) throw new Error("AD sunucusu tanımlı değil.");
  if (!isSafeUsername(username) || username.includes("=")) {
    return { ok: false, groups: [], message: "AD kimlik doğrulaması reddedildi." };
  }
  if (!password || password.length > 120) {
    return { ok: false, groups: [], message: "AD kimlik doğrulaması reddedildi." };
  }
  const upn = bindName(ad, username);
  if (upn.length > 120) return { ok: false, groups: [], message: "AD kimlik doğrulaması reddedildi." };
  const base = ad.baseDn.trim();
  return ldapSession(ad, upn, password, base ? { baseDn: base, sam: samName(username) } : null);
}

/** Ayarlardaki servis hesabıyla (bindDn + parola) bağlanmayı dener; bağlantı testinde kullanılır. */
export async function testServiceBind(ad: SystemSettings["ad"]): Promise<AdBindResult> {
  if (!ad.host || !isSafeHostname(ad.host)) throw new Error("AD sunucusu tanımlı değil.");
  if (!ad.bindDn || !ad.bindPassword) {
    return { ok: true, groups: [], message: "Servis hesabı tanımlı değil; yalnızca ağ bağlantısı denendi." };
  }
  return ldapSession(ad, ad.bindDn, ad.bindPassword, null);
}

/* ---- Grup listesi (Ayarlar → Talep grupları eşlemesi için) ---- */

const intN = (n: number) => {
  const bytes: number[] = [];
  let v = n;
  do {
    bytes.unshift(v & 0xff);
    v >>= 8;
  } while (v > 0);
  if (bytes[0] & 0x80) bytes.unshift(0);
  return tlv(0x02, Buffer.from(bytes));
};

function groupListRequest(id: number, baseDn: string) {
  return tlv(
    0x30,
    int(id),
    tlv(
      0x63,
      octet(baseDn),
      enumerated(2),
      enumerated(0),
      intN(1500),
      int(20),
      tlv(0x01, Buffer.from([0])),
      tlv(0xa3, octet("objectClass"), octet("group")),
      tlv(0x30, octet("cn")),
    ),
  );
}

function entryValues(message: LdapMessage, attrName: string): string[] {
  const parts = children(message.buf, message.body);
  const attrs = parts[1];
  if (!attrs) return [];
  const out: string[] = [];
  for (const attr of children(message.buf, attrs)) {
    const pair = children(message.buf, attr);
    const type = pair[0] ? message.buf.subarray(pair[0].start, pair[0].end).toString("utf8").toLowerCase() : "";
    if (type !== attrName || !pair[1]) continue;
    for (const value of children(message.buf, pair[1])) {
      const text = message.buf.subarray(value.start, value.end).toString("utf8").trim();
      if (text && text.length < 120) out.push(text);
    }
  }
  return out;
}

/** Servis hesabıyla AD'deki grupları (cn) okur. En çok 1500 grup döner. */
export async function listAdGroups(ad: SystemSettings["ad"]): Promise<{ ok: boolean; groups: string[]; message: string }> {
  if (!ad.host || !isSafeHostname(ad.host)) return { ok: false, groups: [], message: "AD sunucusu tanımlı değil." };
  if (!ad.bindDn || !ad.bindPassword) return { ok: false, groups: [], message: "Servis hesabı (Bind DN / parola) tanımlı değil; grup listesi okunamaz." };
  const base = ad.baseDn.trim();
  if (!base) return { ok: false, groups: [], message: "Base DN tanımlı değil." };
  const port = ad.port || (ad.useLdaps ? 636 : 389);
  return new Promise((resolve) => {
    let pending: Buffer = Buffer.alloc(0);
    let done = false;
    let phase: "bind" | "search" = "bind";
    const groups = new Set<string>();
    const finish = (result: { ok: boolean; groups: string[]; message: string }) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        socket.write(unbindRequest(4));
      } catch {
        /* kapalı olabilir */
      }
      socket.destroy();
      resolve(result);
    };
    const socket = connectSocket(ad, port, () => socket.write(bindRequest(1, ad.bindDn, ad.bindPassword)));
    const timer = setTimeout(() => finish({ ok: groups.size > 0, groups: [...groups], message: "AD yanıtı zaman aşımına uğradı." }), 20000);
    socket.on("error", (error) => finish({ ok: false, groups: [], message: error.message }));
    socket.on("close", () => finish({ ok: groups.size > 0, groups: [...groups], message: "AD bağlantısı kapandı." }));
    socket.on("data", (chunk) => {
      pending = Buffer.concat([pending, chunk]);
      for (;;) {
        const taken = takeMessage(pending);
        if (!taken) return;
        pending = Buffer.from(taken.rest);
        const { message } = taken;
        if (phase === "bind" && message.op === 0x61) {
          const code = resultCode(message);
          if (code !== 0) return finish({ ok: false, groups: [], message: describeCode(code) });
          phase = "search";
          socket.write(groupListRequest(2, base));
        } else if (phase === "search" && message.op === 0x64) {
          for (const name of entryValues(message, "cn")) groups.add(name);
        } else if (phase === "search" && message.op === 0x65) {
          return finish({ ok: true, groups: [...groups], message: `${groups.size} grup okundu.` });
        }
      }
    });
  });
}
