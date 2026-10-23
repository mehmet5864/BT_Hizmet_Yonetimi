"use server";

import { licenseSeatError } from "@/lib/license";
import { redirect } from "next/navigation";

import { headers } from "next/headers";

import { bindActiveDirectory } from "@/lib/auth/ad-login";
import { DEMO_PASSWORD, hashPassword, verifyPassword } from "@/lib/auth/password";
import { resolveEffectiveRole, type RoleSource } from "@/lib/auth/rbac";
import { clearSessionCookie, setSessionCookie, type SessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { isRequestOffice } from "@/lib/itil/request-scope";
import { isSafeUsername, rateLimit } from "@/lib/security/http";
import { getSecurityPolicy, passwordPolicyError } from "@/lib/security/policy";
import { getSystemSettings } from "@/lib/settings-store";
import type { ActionState } from "./shared";

function demoBootstrapEnabled() {
  return process.env.ALLOW_DEMO_BOOTSTRAP === "true" || process.env.NODE_ENV !== "production";
}

async function authLimit(action: string, username: string) {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() || hdrs.get("x-real-ip") || "local";
  const limited = rateLimit(`auth:${action}:${ip}:${username.toLowerCase()}`);
  if (!limited.ok) return { ok: false, message: "Çok fazla deneme. 15 dakika sonra tekrar deneyin." } as const;
  return null;
}

async function startSession(user: SessionUser) {
  const policy = await getSecurityPolicy();
  await setSessionCookie(user, policy.sessionHours);
}

function parseGroups(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.map(String) : [];
  } catch {
    return raw.split(",").map((item) => item.trim()).filter(Boolean);
  }
}

async function toSession(person: {
  id: string;
  fullName: string;
  email: string | null;
  role: string;
  roleSource: string;
  title: string | null;
  adUsername: string | null;
  adGroups: string | null;
  requestOffice?: string | null;
}): Promise<SessionUser> {
  const settings = await getSystemSettings();
  const role = resolveEffectiveRole({
    roleSource: person.roleSource,
    manualRole: person.role,
    adGroups: parseGroups(person.adGroups),
    maps: settings.ad.roleMaps,
    defaultAdRole: settings.ad.defaultRole,
  });
  return {
    id: person.id,
    fullName: person.fullName,
    email: person.email,
    role,
    roleSource: (["MANUAL", "AD", "BOTH"].includes(person.roleSource)
      ? person.roleSource
      : "MANUAL") as RoleSource,
    title: person.title,
    adUsername: person.adUsername,
    requestOffice: isRequestOffice(person.requestOffice) ? person.requestOffice : null,
  };
}

export async function ensureLocalPasswords() {
  const people = await prisma.person.findMany();
  const missingHash = people.filter((person) => !person.passwordHash);
  if (missingHash.length) {
    const passwordHash = hashPassword(DEMO_PASSWORD);
    for (const person of missingHash) {
      await prisma.person.update({ where: { id: person.id }, data: { passwordHash } });
    }
  }
  if (!demoBootstrapEnabled()) return;
  const needsWork = people.some(
    (person) =>
      !person.passwordHash ||
      !person.adUsername ||
      (person.email?.startsWith("selin.koc@") && person.roleSource === "MANUAL") ||
      (person.email?.startsWith("ahmet.yilmaz@") && person.roleSource === "MANUAL") ||
      (person.adUsername === "ahmet.yilmaz" && person.role !== "SUPER_ADMIN") ||
      (person.adUsername === "ahmet.yilmaz" && !person.requestOffice) ||
      (person.adUsername === "elif.demir" && person.requestOffice !== "NETWORK") ||
      (person.adUsername === "mehmet.kara" && (person.requestOffice || person.role !== "USER")) ||
      (person.adUsername === "kemal.ozkan" && (person.role !== "SYSTEM_ADMIN" || person.requestOffice !== "SISTEM")) ||
      (person.adUsername === "selin.koc" && person.requestOffice !== "SIBER") ||
      (person.adUsername === "elif.demir" && person.role === "USER") ||
      (person.adUsername === "deniz.arslan" && person.role === "USER") ||
      (person.adUsername === "merve.uslu" && person.role === "USER"),
  );
  await ensureOfficeCatalogStaff();
  if (!needsWork) return;
  const passwordHash = hashPassword(DEMO_PASSWORD);
  for (const person of people) {
    const adUsername = person.adUsername ?? person.email?.split("@")[0] ?? null;
    const patch: Record<string, string | null> = {};
    if (!person.passwordHash) patch.passwordHash = passwordHash;
    if (!person.adUsername && adUsername) patch.adUsername = adUsername;
    if (person.email?.startsWith("selin.koc@") && person.roleSource === "MANUAL") {
      patch.roleSource = "AD";
      patch.adGroups = JSON.stringify(["GG_BilgiGuvenligi"]);
    }
    if (person.email?.startsWith("ahmet.yilmaz@") && person.roleSource === "MANUAL") {
      patch.roleSource = "BOTH";
      patch.adGroups = JSON.stringify(["GG_SuperYoneticiler", "GG_SistemYoneticileri"]);
    }
    if (person.adUsername === "ahmet.yilmaz" && person.role !== "SUPER_ADMIN") {
      patch.role = "SUPER_ADMIN";
      patch.adGroups = JSON.stringify(["GG_SuperYoneticiler", "GG_SistemYoneticileri"]);
    }
    if (person.adUsername === "ahmet.yilmaz" && !person.requestOffice) patch.requestOffice = "SISTEM";
    if (person.adUsername === "elif.demir" && person.requestOffice !== "NETWORK") patch.requestOffice = "NETWORK";
    if (person.adUsername === "elif.demir" && person.role === "USER") patch.role = "UNIT_MANAGER";
    if (person.adUsername === "deniz.arslan" && person.role === "USER") patch.role = "UNIT_MANAGER";
    if (person.adUsername === "merve.uslu" && person.role === "USER") patch.role = "UNIT_MANAGER";
    if (person.adUsername === "mehmet.kara") {
      if (person.role !== "USER") patch.role = "USER";
      if (person.requestOffice) patch.requestOffice = null;
    }
    if (person.adUsername === "kemal.ozkan") {
      if (person.role !== "SYSTEM_ADMIN") patch.role = "SYSTEM_ADMIN";
      if (person.requestOffice !== "SISTEM") patch.requestOffice = "SISTEM";
    }
    if (person.adUsername === "selin.koc" && person.requestOffice !== "SIBER") patch.requestOffice = "SIBER";
    if (person.adUsername === "can.yildiz" && person.requestOffice !== "YAZILIM") patch.requestOffice = "YAZILIM";
    if (person.adUsername === "deniz.arslan" && person.requestOffice !== "VERITABANI") patch.requestOffice = "VERITABANI";
    if (person.adUsername === "merve.uslu" && person.requestOffice !== "SERVIS") patch.requestOffice = "SERVIS";
    if (Object.keys(patch).length) {
      await prisma.person.update({ where: { id: person.id }, data: patch });
    }
  }
}

async function ensureOfficeCatalogStaff() {
  const usernames = ["can.yildiz", "deniz.arslan", "merve.uslu", "kemal.ozkan"] as const;
  const existing = await prisma.person.findMany({
    where: { adUsername: { in: [...usernames] } },
    select: { adUsername: true },
  });
  const have = new Set(existing.map((person) => person.adUsername));
  if (usernames.every((name) => have.has(name))) return;

  const passwordHash = hashPassword(DEMO_PASSWORD);
  const bidb = await prisma.department.findFirst({
    where: { OR: [{ code: "BIDB" }, { name: "Bilgi İşlem Daire Başkanlığı" }] },
  });
  const ahmet = await prisma.person.findFirst({ where: { adUsername: "ahmet.yilmaz" } });

  async function dept(name: string, code: string) {
    const found = await prisma.department.findFirst({ where: { OR: [{ name }, { code }] } });
    if (found) return found;
    return prisma.department.create({
      data: { name, code, parentId: bidb?.id },
    });
  }

  const yazilim = await dept("Yazılım Daire Başkanlığı", "YAZ");
  const veritabani = await dept("Veritabanı Şube Müdürlüğü", "VTB");
  const servisMasasi = await dept("Servis Masası / Yardım Masası", "SDM");

  const staff: Array<{
    fullName: string;
    sicilNo: string;
    tcNo: string;
    title: string;
    duty: string;
    workplace: string;
    email: string;
    phone: string;
    adUsername: (typeof usernames)[number];
    role: string;
    requestOffice: string;
    departmentId: string;
  }> = [
    {
      fullName: "Can Yıldız",
      sicilNo: "S-1007",
      tcNo: "10000000007",
      title: "Yazılım Şube Müdürü",
      duty: "Uygulama geliştirme yönetimi",
      workplace: "Yazılım DB",
      email: "can.yildiz@kurum.gov.tr",
      phone: "0312 555 11 07",
      adUsername: "can.yildiz",
      role: "UNIT_MANAGER",
      requestOffice: "YAZILIM",
      departmentId: yazilim.id,
    },
    {
      fullName: "Deniz Arslan",
      sicilNo: "S-1008",
      tcNo: "10000000008",
      title: "Veritabanı Yöneticisi",
      duty: "Oracle / SQL Server / PostgreSQL işletimi",
      workplace: "Veritabanı Şb.",
      email: "deniz.arslan@kurum.gov.tr",
      phone: "0312 555 11 08",
      adUsername: "deniz.arslan",
      role: "UNIT_MANAGER",
      requestOffice: "VERITABANI",
      departmentId: veritabani.id,
    },
    {
      fullName: "Merve Uslu",
      sicilNo: "S-1009",
      tcNo: "10000000009",
      title: "Servis Masası Uzmanı",
      duty: "Hizmet talebi ve olay karşılama",
      workplace: "Servis Masası",
      email: "merve.uslu@kurum.gov.tr",
      phone: "0312 555 11 09",
      adUsername: "merve.uslu",
      role: "UNIT_MANAGER",
      requestOffice: "SERVIS",
      departmentId: servisMasasi.id,
    },
    {
      fullName: "Kemal Özkan",
      sicilNo: "S-1010",
      tcNo: "10000000010",
      title: "Sistem Yöneticisi",
      duty: "Sistem işletimi ve talep karşılama",
      workplace: "Veri Merkezi",
      email: "kemal.ozkan@kurum.gov.tr",
      phone: "0312 555 11 10",
      adUsername: "kemal.ozkan",
      role: "SYSTEM_ADMIN",
      requestOffice: "SISTEM",
      departmentId: bidb?.id ?? yazilim.id,
    },
  ];

  for (const person of staff) {
    if (have.has(person.adUsername)) continue;
    const clash = await prisma.person.findFirst({
      where: {
        OR: [
          { adUsername: person.adUsername },
          { sicilNo: person.sicilNo },
          { tcNo: person.tcNo },
          { fullName: person.fullName },
        ],
      },
    });
    if (clash) {
      if (clash.requestOffice !== person.requestOffice) {
        await prisma.person.update({
          where: { id: clash.id },
          data: { requestOffice: person.requestOffice, departmentId: person.departmentId },
        });
      }
      continue;
    }
    await prisma.person.create({
      data: {
        ...person,
        roleSource: "MANUAL",
        passwordHash,
        parentDepartmentId: bidb?.id,
        unitManagerId: ahmet?.id,
        parentManagerId: ahmet?.id,
      },
    });
  }
}

export async function loginLocal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await ensureLocalPasswords();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { ok: false, message: "Kullanıcı ve parola zorunludur." };
  if (username.length > 80 || password.length > 128) return { ok: false, message: "Kullanıcı adı veya parola hatalı." };
  const limited = await authLimit("local", username);
  if (limited) return limited;

  const person = await prisma.person.findFirst({
    where: {
      OR: [
        { email: username },
        { adUsername: username },
        { sicilNo: username },
      ],
    },
  });
  if (person?.lockedUntil && person.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((person.lockedUntil.getTime() - Date.now()) / 60_000);
    return { ok: false, message: `Hesap çok sayıda hatalı giriş nedeniyle kilitlendi. ${minutes} dakika sonra tekrar deneyin.` };
  }
  if (!person || !verifyPassword(password, person.passwordHash)) {
    if (person) {
      const policy = await getSecurityPolicy();
      const failed = person.failedLogins + 1;
      const lock = policy.maxFailed > 0 && failed >= policy.maxFailed;
      await prisma.person.update({
        where: { id: person.id },
        data: lock
          ? { failedLogins: 0, lockedUntil: new Date(Date.now() + policy.lockMinutes * 60_000) }
          : { failedLogins: failed },
      });
    }
    return { ok: false, message: "Kullanıcı adı veya parola hatalı." };
  }
  if (person.failedLogins > 0 || person.lockedUntil) {
    await prisma.person.update({ where: { id: person.id }, data: { failedLogins: 0, lockedUntil: null } });
  }
  if (person.roleSource === "AD") {
    return { ok: false, message: "Bu hesap yalnızca Active Directory ile giriş yapabilir." };
  }
  await startSession(await toSession(person));
  redirect("/");
}

export async function loginAd(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await ensureLocalPasswords();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { ok: false, message: "AD kullanıcı adı ve parola zorunludur." };
  if (!isSafeUsername(username) || password.length > 128) {
    return { ok: false, message: "AD kullanıcı adı veya parola hatalı." };
  }
  const limited = await authLimit("ad", username);
  if (limited) return limited;

  const settings = await getSystemSettings();
  const person = await prisma.person.findFirst({
    where: {
      OR: [{ adUsername: username }, { email: username }, { email: { startsWith: `${username}@` } }],
    },
  });

  let groups = parseGroups(person?.adGroups);
  let adOk = false;
  if (settings.ad.enabled && settings.ad.host) {
    try {
      const bind = await bindActiveDirectory(settings.ad, username, password);
      adOk = bind.ok;
      if (bind.groups.length) groups = bind.groups;
      if (!bind.ok) return { ok: false, message: bind.message };
    } catch {
      adOk = false;
    }
  }

  if (!adOk) {
    if (!person || !verifyPassword(password, person.passwordHash)) {
      return {
        ok: false,
        message: settings.ad.enabled
          ? "AD sunucusuna bağlanılamadı ve yerel AD hesabı doğrulanamadı."
          : "AD kapalı. Kayıtlı AD kullanıcı adı ve parola ile denendi, eşleşme yok.",
      };
    }
  }

  if (!person) return { ok: false, message: "AD hesabı personel kaydıyla eşleşmedi." };
  if (person.roleSource === "MANUAL") {
    return { ok: false, message: "Bu hesap manuel yetkilidir. Yerel giriş sekmesini kullanın." };
  }

  if (groups.length) {
    await prisma.person.update({
      where: { id: person.id },
      data: { adGroups: JSON.stringify(groups) },
    });
  }

  const session = await toSession({ ...person, adGroups: JSON.stringify(groups) });
  await startSession(session);
  redirect("/");
}

export async function registerLocal(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (fullName.length < 3 || fullName.length > 120) return { ok: false, message: "Ad soyad 3–120 karakter olmalı." };
  if (!email.includes("@") || email.length > 180) return { ok: false, message: "Geçerli bir e-posta girin." };
  if (username.length < 3 || !isSafeUsername(username)) return { ok: false, message: "Kullanıcı adı en az 3 karakter olmalı." };
  const policy = await passwordPolicyError(password);
  if (policy) return { ok: false, message: policy };
  if (password !== confirm) return { ok: false, message: "Parolalar eşleşmiyor." };
  const limited = await authLimit("register", username);
  if (limited) return limited;

  const exists = await prisma.person.findFirst({
    where: { OR: [{ email }, { adUsername: username }, { fullName }] },
  });
  if (exists) return { ok: false, message: "Bu e-posta, kullanıcı adı veya ad soyad kayıtlı." };

  const seatError = await licenseSeatError();
  if (seatError) return { ok: false, message: seatError };

  const person = await prisma.person.create({
    data: {
      fullName,
      email,
      adUsername: username,
      passwordHash: hashPassword(password),
      role: "USER",
      roleSource: "MANUAL",
    },
  });
  await startSession(await toSession(person));
  redirect("/");
}

export async function registerAd(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!username || !password) return { ok: false, message: "AD kullanıcı adı ve parola zorunludur." };
  if (!isSafeUsername(username) || password.length > 128) {
    return { ok: false, message: "AD kullanıcı adı veya parola hatalı." };
  }
  const limited = await authLimit("ad-register", username);
  if (limited) return limited;

  const settings = await getSystemSettings();
  if (!settings.ad.enabled || !settings.ad.host) {
    return { ok: false, message: "Active Directory kaydı için Ayarlar’da AD sunucusu açılmalı." };
  }

  let groups: string[] = [];
  try {
    const bind = await bindActiveDirectory(settings.ad, username, password);
    if (!bind.ok) return { ok: false, message: bind.message };
    groups = bind.groups;
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "AD kaydı başarısız." };
  }

  const existing = await prisma.person.findFirst({
    where: { OR: [{ adUsername: username }, { email: { startsWith: `${username}@` } }] },
  });
  if (!existing) {
    const seatError = await licenseSeatError();
    if (seatError) return { ok: false, message: seatError };
  }
  const person = existing
    ? await prisma.person.update({
        where: { id: existing.id },
        data: {
          roleSource: existing.roleSource === "MANUAL" ? "BOTH" : "AD",
          adGroups: JSON.stringify(groups),
          adUsername: username,
        },
      })
    : await prisma.person.create({
        data: {
          fullName: fullName || username,
          adUsername: username,
          email: username.includes("@") ? username : null,
          role: "USER",
          roleSource: "AD",
          adGroups: JSON.stringify(groups),
        },
      });

  await startSession(await toSession({ ...person, adGroups: JSON.stringify(groups) }));
  redirect("/");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/giris");
}
