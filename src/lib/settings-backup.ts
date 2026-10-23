import { APP_VERSION } from "@/lib/app-version";
import { applySecret, parseSettings, type SystemSettings } from "@/lib/settings";
import { isSafeHostname } from "@/lib/security/http";

export const CONFIG_BACKUP_KIND = "bt-hizmet-yonetimi-config";
export const CONFIG_BACKUP_FORMAT = 1;

export type ConfigBackupDocument = {
  kind: typeof CONFIG_BACKUP_KIND;
  format: typeof CONFIG_BACKUP_FORMAT;
  exportedAt: string;
  appVersion: string;
  settings: SystemSettings;
};

export function buildConfigBackup(settings: SystemSettings, exportedAt = new Date()): ConfigBackupDocument {
  return {
    kind: CONFIG_BACKUP_KIND,
    format: CONFIG_BACKUP_FORMAT,
    exportedAt: exportedAt.toISOString(),
    appVersion: APP_VERSION,
    settings,
  };
}

export function configBackupFilename(at = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `bt-ayarlar-${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}.json`;
}

export function parseConfigBackup(raw: string): { ok: true; doc: ConfigBackupDocument } | { ok: false; message: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, message: "Dosya geçerli bir JSON değil." };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "Yedek dosyası boş veya geçersiz." };
  }
  const obj = parsed as Record<string, unknown>;
  const settingsRaw =
    obj.kind === CONFIG_BACKUP_KIND && obj.settings && typeof obj.settings === "object"
      ? obj.settings
      : looksLikeSettings(obj)
        ? obj
        : null;
  if (!settingsRaw) {
    return { ok: false, message: "Bu dosya BT Hizmet Yönetimi ayar yedeği değil." };
  }
  const settings = parseSettings(JSON.stringify(settingsRaw));
  return {
    ok: true,
    doc: {
      kind: CONFIG_BACKUP_KIND,
      format: CONFIG_BACKUP_FORMAT,
      exportedAt: typeof obj.exportedAt === "string" ? obj.exportedAt : new Date().toISOString(),
      appVersion: typeof obj.appVersion === "string" ? obj.appVersion : APP_VERSION,
      settings,
    },
  };
}

function looksLikeSettings(value: Record<string, unknown>) {
  return Boolean(value.ad || value.siem || value.mail || value.scanner || value.acl || value.officers || value.officeNames);
}

export function mergeImportedSecrets(incoming: SystemSettings, current: SystemSettings): SystemSettings {
  return {
    ...incoming,
    ad: {
      ...incoming.ad,
      bindPassword: applySecret(incoming.ad.bindPassword, current.ad.bindPassword),
    },
    mail: {
      ...incoming.mail,
      password: applySecret(incoming.mail.password, current.mail.password),
    },
    scanner: {
      ...incoming.scanner,
      accessKey: applySecret(incoming.scanner.accessKey, current.scanner.accessKey),
      secretKey: applySecret(incoming.scanner.secretKey, current.scanner.secretKey),
      password: applySecret(incoming.scanner.password, current.scanner.password),
    },
  };
}

export function validateImportedHosts(settings: SystemSettings): string | null {
  const checks: [string, string][] = [
    ["Active Directory", settings.ad.host],
    ["SIEM", settings.siem.host],
    ["SMTP", settings.mail.host],
    ["Zafiyet tarama", settings.scanner.host],
  ];
  for (const [label, host] of checks) {
    if (host && !isSafeHostname(host)) return `${label} sunucu adresi geçersiz: ${host}`;
  }
  return null;
}
