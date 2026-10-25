"use server";

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { revalidatePath } from "next/cache";

import { probeActiveDirectory } from "@/lib/integrations/ad";
import { sendSiemEvent } from "@/lib/integrations/cef";
import { probeSmtp, sendMail } from "@/lib/integrations/mail";
import { probeScanner } from "@/lib/integrations/scanner";
import { ACL_VERSION, isAppModule, isModuleLevel, isModuleScope, MODULE_LEVEL_RANK, type ModuleGrant } from "@/lib/auth/acl";
import { isPersonnelRole, type AdRoleMap } from "@/lib/auth/rbac";
import { requireModule } from "@/lib/auth/viewer";
import { isUnitType, UNIT_TYPE_LABELS } from "@/lib/itil/unit-types";
import { defaultOfficeNames } from "@/lib/itil/office-names";
import { mergeRequestGroups } from "@/lib/itil/request-groups";
import { ALL_REQUEST_TYPES, REQUEST_OFFICE_LABELS, REQUEST_OFFICES, slugifyRequestGroup } from "@/lib/itil/request-types";
import {
  applySecret,
  isSiemLogFormat,
  OFFICER_DEFS,
  publicSettings,
  SCANNER_VENDORS,
  type Officers,
  type ScannerVendor,
  type SystemSettings,
} from "@/lib/settings";
import { isSafeHostname, safeApiPath } from "@/lib/security/http";
import { isPatternId, isThemeId } from "@/lib/theme";
import { prisma } from "@/lib/prisma";
import {
  buildConfigBackup,
  configBackupFilename,
  mergeImportedSecrets,
  parseConfigBackup,
  validateImportedHosts,
} from "@/lib/settings-backup";
import { getSystemSettings, saveSystemSettings } from "@/lib/settings-store";
import { defaultScorePoints, SCORE_ACTIONS, SCORE_MODULES, SCORE_SEVERITIES } from "@/lib/scoring-defs";
import { saved, type ActionState } from "./shared";

function flag(formData: FormData, key: string) {
  return String(formData.get(key) ?? "") === "true";
}

function num(formData: FormData, key: string, fallback: number) {
  const value = Number(String(formData.get(key) ?? ""));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function saveAdSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const host = text(formData, "host");
  if (host && !isSafeHostname(host)) return { ok: false, message: "AD sunucu adresi geçersiz." };
  current.ad = {
    enabled: flag(formData, "enabled"),
    host,
    port: num(formData, "port", current.ad.useLdaps || flag(formData, "useLdaps") ? 636 : 389),
    useLdaps: flag(formData, "useLdaps"),
    baseDn: text(formData, "baseDn"),
    bindDn: text(formData, "bindDn"),
    bindPassword: applySecret(text(formData, "bindPassword"), current.ad.bindPassword),
    userFilter: text(formData, "userFilter") || current.ad.userFilter,
    groupFilter: text(formData, "groupFilter") || current.ad.groupFilter,
    defaultRole: current.ad.defaultRole,
    roleMaps: current.ad.roleMaps,
  };
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  return saved(undefined, "Active Directory ayarları kaydedildi.");
}

export async function saveSiemSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const formatRaw = text(formData, "logFormat");
  const facility = Number(text(formData, "syslogFacility"));
  const host = text(formData, "host");
  if (host && !isSafeHostname(host)) return { ok: false, message: "SIEM adresi geçersiz." };
  const protocolRaw = text(formData, "protocol");
  const protocol: SystemSettings["siem"]["protocol"] =
    protocolRaw === "TCP" || protocolRaw === "TLS" || protocolRaw === "UDP" ? protocolRaw : "UDP";
  current.siem = {
    enabled: flag(formData, "enabled"),
    host,
    port: num(formData, "port", 514),
    protocol,
    logFormat: isSiemLogFormat(formatRaw) ? formatRaw : "CEF",
    cefVendor: text(formData, "cefVendor") || current.siem.cefVendor || "Kurum",
    cefProduct: text(formData, "cefProduct") || current.siem.cefProduct || "BTHizmetYonetimi",
    cefVersion: text(formData, "cefVersion") || current.siem.cefVersion || "1.0",
    syslogFacility: Number.isFinite(facility) ? facility : current.siem.syslogFacility || 16,
    syslogAppName: text(formData, "syslogAppName") || current.siem.syslogAppName || "BTHizmetYonetimi",
  };
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  return saved(undefined, "SIEM ayarları kaydedildi.");
}

export async function saveOfficerSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const officers = { ...current.officers } as Officers;
  for (const def of OFFICER_DEFS) {
    officers[def.key] = text(formData, `officer_${def.key}`);
  }
  const used = new Map<string, string>();
  for (const def of OFFICER_DEFS) {
    const id = officers[def.key];
    if (!id) continue;
    const other = used.get(id);
    if (other) {
      return { ok: false, message: `Bir kişi yalnızca tek bir modülün yöneticisi olabilir: "${other}" ve "${def.label}" aynı kişiye atanmış.` };
    }
    used.set(id, def.label);
  }
  const ids = [...new Set(Object.values(officers).filter(Boolean))];
  if (ids.length) {
    const found = await prisma.person.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    const known = new Set(found.map((row) => row.id));
    if (ids.some((id) => !known.has(id))) {
      return { ok: false, message: "Seçilen yöneticilerden biri personel kaydında yok." };
    }
  }
  current.officers = officers;
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/");
  return saved(undefined, "Modül yöneticileri kaydedildi.");
}

export async function saveOfficeNameSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const names = defaultOfficeNames();
  for (const office of REQUEST_OFFICES) {
    const label = text(formData, `office_label_${office}`);
    const navLabel = text(formData, `office_nav_${office}`);
    if (!label) {
      return { ok: false, message: `${REQUEST_OFFICE_LABELS[office]} için tam ad zorunludur.` };
    }
    names[office] = {
      label: label.slice(0, 80),
      navLabel: (navLabel || label).slice(0, 40),
    };
  }
  current.officeNames = names;
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/talepler");
  revalidatePath("/personel");
  revalidatePath("/", "layout");
  return saved(undefined, "Talep birimi isimleri kaydedildi.");
}

export async function saveRequestGroupSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const incoming: Record<string, string> = {};
  for (const t of ALL_REQUEST_TYPES) {
    const name = `cat_${t.office}__${slugifyRequestGroup(t.group)}`;
    if (!formData.has(name)) continue;
    const value = text(formData, name);
    if (value && !/^[A-Za-z0-9_.\- ğüşöçıİĞÜŞÖÇ]+$/.test(value)) {
      return { ok: false, message: `${t.group}: grup adında geçersiz karakter var.` };
    }
    incoming[t.key] = value.slice(0, 80);
  }
  current.requestGroups = mergeRequestGroups(incoming);
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/talepler");
  return saved(undefined, "Talep türü – AD grubu eşlemesi kaydedildi.");
}

export async function saveApprovalSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  current.approval = {
    unitManager: flag(formData, "unitManager"),
    seniorManager: flag(formData, "seniorManager"),
    infosec: flag(formData, "infosec"),
    notifyMail: flag(formData, "notifyMail"),
    slaHours: num(formData, "slaHours", 24),
    applyToRequests: flag(formData, "applyToRequests"),
    applyToChanges: flag(formData, "applyToChanges"),
    applyToPatches: flag(formData, "applyToPatches"),
  };
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  return saved(undefined, "Onay ayarları kaydedildi.");
}

export async function saveScannerSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const vendorRaw = text(formData, "vendor") as ScannerVendor;
  const vendor = (SCANNER_VENDORS as string[]).includes(vendorRaw) ? vendorRaw : current.scanner.vendor;
  const host = text(formData, "host");
  if (host && !isSafeHostname(host)) return { ok: false, message: "Tarama cihazı adresi geçersiz." };
  current.scanner = {
    ...current.scanner,
    enabled: flag(formData, "enabled"),
    vendor,
    host,
    port: num(formData, "port", current.scanner.port || 443),
    protocol: text(formData, "protocol") === "HTTP" ? "HTTP" : "HTTPS",
    apiPath: safeApiPath(text(formData, "apiPath") || current.scanner.apiPath, current.scanner.apiPath),
    accessKey: applySecret(text(formData, "accessKey"), current.scanner.accessKey),
    secretKey: applySecret(text(formData, "secretKey"), current.scanner.secretKey),
    username: text(formData, "username"),
    password: applySecret(text(formData, "password"), current.scanner.password),
    verifyTls: flag(formData, "verifyTls"),
    autoMatchAssets: flag(formData, "autoMatchAssets"),
    useDemoFeed: flag(formData, "useDemoFeed"),
    dueDaysCritical: num(formData, "dueDaysCritical", 7),
    dueDaysHigh: num(formData, "dueDaysHigh", 14),
  };
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/zafiyet");
  return saved(undefined, "Zafiyet tarama cihazı ayarları kaydedildi.");
}

export async function saveMailSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const host = text(formData, "host");
  if (host && !isSafeHostname(host)) return { ok: false, message: "SMTP sunucu adresi geçersiz." };
  const secureRaw = text(formData, "secure");
  const secure: SystemSettings["mail"]["secure"] =
    secureRaw === "NONE" || secureRaw === "STARTTLS" || secureRaw === "SSL" ? secureRaw : "STARTTLS";
  current.mail = {
    enabled: flag(formData, "enabled"),
    host,
    port: num(formData, "port", 587),
    secure,
    user: text(formData, "user"),
    password: applySecret(text(formData, "password"), current.mail.password),
    from: text(formData, "from"),
    fromName: text(formData, "fromName") || "BT Hizmet Yönetimi",
    testRecipient: text(formData, "testRecipient"),
  };
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  return saved(undefined, "E-posta ayarları kaydedildi.");
}

export async function saveAppearanceSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const access = await requireModule("/ayarlar");
    if (access.error) return access.error;
    const current = await getSystemSettings();
    const theme = text(formData, "theme");
    if (!isThemeId(theme)) return { ok: false, message: "Geçersiz tema.", stamp: Date.now() };
    const patternRaw = text(formData, "pattern");
    current.appearance = { theme, pattern: isPatternId(patternRaw) ? patternRaw : "nokta" };
    current.layout = { itilV2: flag(formData, "itilV2") };
    await saveSystemSettings(current);
    return saved(undefined, "Görünüm kaydedildi.");
  } catch {
    return { ok: false, message: "Tema kaydedilemedi.", stamp: Date.now() };
  }
}

export async function saveModuleAclSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const modules = formData.getAll("grantModule").map((value) => String(value).trim());
  const groups = formData.getAll("grantGroup").map((value) => String(value).trim());
  const levels = formData.getAll("grantLevel").map((value) => String(value).trim());
  const scopeLists = formData.getAll("grantScopes").map((value) => String(value).trim());
  const grants: ModuleGrant[] = [];
  for (let i = 0; i < Math.max(modules.length, groups.length, levels.length); i += 1) {
    const moduleName = modules[i];
    const group = groups[i];
    const level = levels[i];
    if (!moduleName || !group || !level || !isAppModule(moduleName) || !isModuleLevel(level)) continue;
    const scopes = (scopeLists[i] ?? "").split(",").map((x) => x.trim()).filter(isModuleScope);
    grants.push(scopes.length ? { module: moduleName, group, level, scopes } : { module: moduleName, group, level });
  }
  // Mükerrer (aynı modül + grup) satırlar tek satıra iner; en yüksek düzey korunur.
  const merged = new Map<string, ModuleGrant>();
  for (const grant of grants) {
    const key = `${grant.module}|${grant.group.toLocaleLowerCase("tr-TR")}`;
    const prev = merged.get(key);
    if (!prev || MODULE_LEVEL_RANK[grant.level] > MODULE_LEVEL_RANK[prev.level]) merged.set(key, grant);
  }
  const unique = [...merged.values()];
  current.acl.grants = unique.length ? unique : current.acl.grants;
  current.acl.version = ACL_VERSION;
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/", "layout");
  return saved(undefined, "Modül yetkileri kaydedildi.");
}

export async function saveRbacSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const current = await getSystemSettings();
  const groups = formData.getAll("mapGroup").map((value) => String(value).trim());
  const roles = formData.getAll("mapRole").map((value) => String(value).trim());
  const roleMaps: AdRoleMap[] = [];
  for (let i = 0; i < Math.max(groups.length, roles.length); i += 1) {
    const group = groups[i];
    const role = roles[i];
    if (!group || !role || !isPersonnelRole(role)) continue;
    roleMaps.push({ group, role });
  }
  const defaultRole = text(formData, "defaultRole");
  current.ad.defaultRole = isPersonnelRole(defaultRole) ? defaultRole : "USER";
  current.ad.roleMaps = roleMaps.length ? roleMaps : current.ad.roleMaps;
  await saveSystemSettings(current);
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  return saved(undefined, "AD grup → rol eşlemesi kaydedildi.");
}

export async function testAdConnection(): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  try {
    const settings = await getSystemSettings();
    const message = await probeActiveDirectory(settings.ad);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "AD bağlantısı başarısız." };
  }
}

export async function testSiemConnection(): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  try {
    const settings = await getSystemSettings();
    const enabled = { ...settings.siem, enabled: true };
    const formatLabel = settings.siem.logFormat === "SYSLOG" ? "Syslog" : "CEF";
    await sendSiemEvent(enabled, {
      signatureId: "HEARTBEAT",
      name: `SIEM ${formatLabel} test kaydı`,
      severity: 1,
      extensions: { msg: `Ayarlar sayfasından gönderilen test ${formatLabel} olayı`, act: "test" },
    });
    return {
      ok: true,
      message: `${formatLabel} test kaydı ${settings.siem.protocol} ile ${settings.siem.host}:${settings.siem.port} adresine gönderildi.`,
    };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "SIEM gönderimi başarısız." };
  }
}

export async function testScannerConnection(): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  try {
    const settings = await getSystemSettings();
    const message = await probeScanner(settings.scanner);
    return { ok: true, message };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Tarama cihazı bağlantısı başarısız." };
  }
}

export async function testMailConnection(): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  try {
    const settings = await getSystemSettings();
    const probe = await probeSmtp(settings.mail);
    const to = settings.mail.testRecipient || settings.mail.from;
    if (settings.mail.enabled && to && settings.mail.user && settings.mail.password) {
      await sendMail({ ...settings.mail, enabled: true }, {
        to: [to],
        subject: "BT Hizmet Yönetimi e-posta testi",
        text: "Bu ileti Ayarlar sayfasındaki SMTP testinden gönderildi.",
      });
      return { ok: true, message: `${probe} Test iletisi ${to} adresine gönderildi.` };
    }
    return { ok: true, message: `${probe} Kimlik bilgisi veya test alıcısı olmadığı için ileti gönderilmedi.` };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "E-posta testi başarısız." };
  }
}

export async function loadPublicSettings() {
  const access = await requireModule("/ayarlar");
  if (access.error) return null;
  const settings = await getSystemSettings();
  return publicSettings(settings);
}

async function writeConfigBackupFile(json: string, filename: string) {
  try {
    const dir = join(process.cwd(), "yedek", "config");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), json, "utf8");
    return true;
  } catch {
    return false;
  }
}

async function sanitizeOfficers(settings: SystemSettings) {
  const ids = [...new Set(Object.values(settings.officers).filter(Boolean))];
  if (!ids.length) return { settings, dropped: 0 };
  const found = await prisma.person.findMany({
    where: { id: { in: ids } },
    select: { id: true },
  });
  const known = new Set(found.map((row) => row.id));
  let dropped = 0;
  const officers = { ...settings.officers };
  for (const key of Object.keys(officers) as (keyof typeof officers)[]) {
    if (officers[key] && !known.has(officers[key])) {
      officers[key] = "";
      dropped += 1;
    }
  }
  return { settings: { ...settings, officers }, dropped };
}

export async function exportSystemConfig(): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const settings = await getSystemSettings();
  const doc = buildConfigBackup(settings);
  const filename = configBackupFilename();
  const payload = `${JSON.stringify(doc, null, 2)}\n`;
  await writeConfigBackupFile(payload, filename);
  await prisma.activityLog.create({
    data: {
      entityType: "SystemConfig",
      entityId: "default",
      action: "EXPORT",
      actor: access.viewer.id,
      note: `Ayar yedeği dışa aktarıldı (${filename})`,
    },
  });
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  return { ...saved(undefined, "Ayar yedeği indirildi."), payload, filename };
}

export async function importSystemConfig(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Bir yedek JSON dosyası seçin.", stamp: Date.now() };
  }
  if (file.size > 1_000_000) {
    return { ok: false, message: "Yedek dosyası 1 MB’dan büyük olamaz.", stamp: Date.now() };
  }
  const raw = await file.text();
  const parsed = parseConfigBackup(raw);
  if (!parsed.ok) return { ok: false, message: parsed.message, stamp: Date.now() };

  const current = await getSystemSettings();
  const before = buildConfigBackup(current);
  const beforeName = `onceki-${configBackupFilename()}`;
  await writeConfigBackupFile(`${JSON.stringify(before, null, 2)}\n`, beforeName);

  let next = mergeImportedSecrets(parsed.doc.settings, current);
  const hostError = validateImportedHosts(next);
  if (hostError) return { ok: false, message: hostError, stamp: Date.now() };
  const cleaned = await sanitizeOfficers(next);
  next = cleaned.settings;

  await saveSystemSettings(next);
  await prisma.activityLog.create({
    data: {
      entityType: "SystemConfig",
      entityId: "default",
      action: "IMPORT",
      actor: access.viewer.id,
      note: cleaned.dropped
        ? `Ayar yedeği içe aktarıldı. ${cleaned.dropped} süreç yöneticisi bu kurulumda olmadığı için boşaltıldı.`
        : "Ayar yedeği içe aktarıldı.",
      changes: JSON.stringify({ from: before.exportedAt, file: file.name }),
    },
  });
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/");
  const extra = cleaned.dropped
    ? ` ${cleaned.dropped} süreç yöneticisi bu personel listesinde yoktu, boş bırakıldı.`
    : "";
  return saved(undefined, `Ayarlar içe aktarıldı.${extra} Önceki yedek yedek/config altında duruyor.`);
}

/** Puanlama kuralları — yalnızca süper yönetici. Girdi adı: p|modül|işlem|önem */
export async function saveScoreRules(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  if (access.viewer.role !== "SUPER_ADMIN") return { ok: false, message: "Puanlamayı yalnızca süper yönetici düzenleyebilir." };
  const reset = formData.get("reset") === "1";
  try {
    if (reset) {
      await prisma.scoreRule.deleteMany({});
      revalidatePath("/ayarlar");
      revalidatePath("/ayarlar/yetkiler");
      return saved(undefined, "Puanlar varsayılana döndürüldü.");
    }
    const ops = [];
    for (const mod of SCORE_MODULES) {
      for (const action of SCORE_ACTIONS) {
        for (const severity of SCORE_SEVERITIES) {
          const raw = String(formData.get(`p|${mod.key}|${action}|${severity}`) ?? "").trim();
          if (raw === "") continue;
          const points = Math.round(Number(raw));
          if (!Number.isFinite(points) || points < -10000 || points > 10000) {
            return { ok: false, message: `${mod.label}: geçersiz puan (${raw}). -10000 ile 10000 arası tam sayı (negatif puan girilebilir) girin.` };
          }
          if (points === defaultScorePoints(mod.key, action, severity)) {
            ops.push(prisma.scoreRule.deleteMany({ where: { module: mod.key, action, severity } }));
          } else {
            ops.push(
              prisma.scoreRule.upsert({
                where: { module_action_severity: { module: mod.key, action, severity } },
                create: { module: mod.key, action, severity, points },
                update: { points },
              }),
            );
          }
        }
      }
    }
    await prisma.$transaction(ops);
    revalidatePath("/ayarlar");
    revalidatePath("/ayarlar/yetkiler");
    return saved(undefined, "Puanlama kaydedildi. Yeni puanlar bundan sonraki işlemlere uygulanır.");
  } catch {
    return { ok: false, message: "Puanlama kaydedilemedi." };
  }
}

export async function addUnit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const type = text(formData, "unitType");
  if (!isUnitType(type)) return { ok: false, message: "Birim türünü seçin." };
  const name = (text(formData, "name") ?? UNIT_TYPE_LABELS[type]).slice(0, 120);
  const exists = await prisma.department.findFirst({ where: { name } });
  if (exists) return { ok: false, message: `"${name}" adlı birim zaten kayıtlı. Farklı bir ad yazın.` };
  const parentId = text(formData, "parentId");
  const managerId = text(formData, "managerId");
  await prisma.department.create({ data: { name, unitType: type, parentId: parentId || null, managerId: managerId || null } });
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/personel");
  return saved(undefined, `Birim eklendi: ${name}`);
}

export async function deleteUnit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const id = text(formData, "id");
  if (!id) return { ok: false, message: "Birim bulunamadı." };
  const unit = await prisma.department.findUnique({
    where: { id },
    select: {
      name: true,
      _count: { select: { people: true, parentMembers: true, assets: true, children: true } },
    },
  });
  if (!unit) return { ok: false, message: "Birim bulunamadı." };
  const used = unit._count;
  if (used.people || used.parentMembers) {
    return { ok: false, message: `"${unit.name}" biriminde ${used.people + used.parentMembers} personel var. Önce personelin birimini değiştirin.` };
  }
  if (used.children) return { ok: false, message: `"${unit.name}" biriminin alt birimleri var. Önce onları silin veya başka bir birime bağlayın.` };
  if (used.assets) return { ok: false, message: `"${unit.name}" birimine bağlı ${used.assets} envanter kaydı var.` };
  try {
    await prisma.department.delete({ where: { id } });
  } catch {
    return { ok: false, message: `"${unit.name}" biriminde kayıtlar (talep, olay vb.) bulunduğu için silinemedi.` };
  }
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/personel");
  return saved(undefined, `Birim silindi: ${unit.name}`);
}

export async function updateUnit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const access = await requireModule("/ayarlar");
  if (access.error) return access.error;
  const id = text(formData, "id");
  const name = text(formData, "name")?.slice(0, 120);
  if (!id || !name) return { ok: false, message: "Birim adı zorunludur." };
  const type = text(formData, "unitType");
  const parentId = text(formData, "parentId");
  const managerId = text(formData, "managerId");
  if (parentId === id) return { ok: false, message: "Bir birim kendi üst birimi olamaz." };
  // Döngü: yeni üst birimin atalarında bu birim varsa reddet.
  let cursor: string | null = parentId || null;
  for (let depth = 0; cursor && depth < 20; depth += 1) {
    if (cursor === id) return { ok: false, message: "Bu üst birim seçimi hiyerarşide döngü oluşturur." };
    const up: { parentId: string | null } | null = await prisma.department.findUnique({ where: { id: cursor }, select: { parentId: true } });
    cursor = up?.parentId ?? null;
  }
  const clash = await prisma.department.findFirst({ where: { name, NOT: { id } } });
  if (clash) return { ok: false, message: `"${name}" adlı başka bir birim zaten kayıtlı.` };
  await prisma.department.update({
    where: { id },
    data: { name, unitType: isUnitType(type) ? type : null, parentId: parentId || null, managerId: managerId || null },
  });
  revalidatePath("/ayarlar");
  revalidatePath("/ayarlar/yetkiler");
  revalidatePath("/personel");
  return saved(undefined, `Birim güncellendi: ${name}`);
}

/** Tek formdan: AD grubu → rol eşlemesi ve talep kategorisi → AD grubu eşlemesi. */
export async function saveAccessMappings(prev: ActionState, formData: FormData): Promise<ActionState> {
  const roles = await saveRbacSettings(prev, formData);
  if (!roles.ok) return roles;
  const groups = await saveRequestGroupSettings(prev, formData);
  if (!groups.ok) return groups;
  return saved(undefined, "AD grup eşlemeleri (rol ve talep kategorisi) kaydedildi.");
}
