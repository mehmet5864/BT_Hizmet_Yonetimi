"use server";

import { revalidatePath } from "next/cache";

import { requireModule } from "@/lib/auth/viewer";
import { nextTicketNo } from "@/lib/itil/constants";
import {
  dueDateForSeverity,
  normalizeHost,
  normalizeIp,
  pullScannerFindings,
  type ScannerFinding,
} from "@/lib/integrations/scanner";
import { prisma } from "@/lib/prisma";
import { getSystemSettings, saveSystemSettings } from "@/lib/settings-store";
import type { ActionState } from "./shared";

function nextVulnNo(last?: string | null, offset = 0) {
  if (offset === 0) return nextTicketNo("ZAF", last);
  const year = new Date().getFullYear();
  const match = last?.match(new RegExp(`^ZAF-${year}-(\\d+)$`));
  const seq = (match ? Number(match[1]) : 0) + 1 + offset;
  return `ZAF-${year}-${String(seq).padStart(4, "0")}`;
}

function matchAsset(
  finding: ScannerFinding,
  assets: { id: string; name: string | null; ipAddress: string | null; ownerId: string; departmentId: string | null }[],
) {
  const ip = normalizeIp(finding.deviceIp);
  if (ip) {
    const byIp = assets.find((asset) => normalizeIp(asset.ipAddress) === ip);
    if (byIp) return byIp;
  }
  const host = normalizeHost(finding.deviceName);
  if (host) {
    return assets.find((asset) => normalizeHost(asset.name) === host) ?? null;
  }
  return null;
}

export async function pullVulnerabilitiesFromScanner(): Promise<ActionState> {
  const access = await requireModule("/zafiyet");
  if (access.error) return access.error;
  try {
    const settings = await getSystemSettings();
    if (!settings.scanner.enabled && !settings.scanner.useDemoFeed) {
      return { ok: false, message: "Zafiyet tarama bağlantısı kapalı. Ayarlar → Zafiyet tarama cihazı bölümünden açın." };
    }

    const pulled = await pullScannerFindings(settings.scanner);
    const assets = settings.scanner.autoMatchAssets
      ? await prisma.asset.findMany({
          select: { id: true, name: true, ipAddress: true, ownerId: true, departmentId: true },
        })
      : [];

    const existing = await prisma.vulnerability.findMany({
      where: { externalId: { in: pulled.findings.map((item) => item.externalId) } },
    });
    const byExternal = new Map(existing.map((row) => [row.externalId, row]));
    const last = await prisma.vulnerability.findFirst({ orderBy: { vulnNo: "desc" }, select: { vulnNo: true } });

    let created = 0;
    let updated = 0;
    let matched = 0;
    let createdOffset = 0;

    for (const finding of pulled.findings) {
      const asset = settings.scanner.autoMatchAssets ? matchAsset(finding, assets) : null;
      if (asset) matched += 1;
      const current = byExternal.get(finding.externalId);
      const nextStatus = current?.status === "ACCEPTED" ? "ACCEPTED" : finding.status;
      const payload = {
        deviceName: finding.deviceName ?? asset?.name ?? current?.deviceName ?? null,
        deviceIp: finding.deviceIp ?? asset?.ipAddress ?? current?.deviceIp ?? null,
        severity: finding.severity,
        status: nextStatus,
        description: finding.description ?? finding.title,
        cve: finding.cve ?? null,
        pluginId: finding.pluginId ?? null,
        source: "SCANNER",
        scannerVendor: settings.scanner.vendor,
        assetId: asset?.id ?? current?.assetId ?? null,
        ownerId: current?.ownerId ?? asset?.ownerId ?? null,
        departmentId: current?.departmentId ?? asset?.departmentId ?? null,
        dueDate: current?.dueDate ?? dueDateForSeverity(finding.severity, settings.scanner),
      };

      if (current) {
        await prisma.vulnerability.update({ where: { id: current.id }, data: payload });
        updated += 1;
      } else {
        await prisma.vulnerability.create({
          data: {
            ...payload,
            externalId: finding.externalId,
            vulnNo: nextVulnNo(last?.vulnNo, createdOffset),
            detectedAt: finding.detectedAt ?? new Date(),
          },
        });
        created += 1;
        createdOffset += 1;
      }
    }

    settings.scanner.lastSyncAt = new Date().toISOString();
    settings.scanner.lastSyncMessage = `${pulled.message} ${created} yeni, ${updated} güncellendi, ${matched} envanter eşleşti.`;
    await saveSystemSettings(settings);

    revalidatePath("/zafiyet");
    revalidatePath("/envanter");
    revalidatePath("/ayarlar");
    return { ok: true, message: settings.scanner.lastSyncMessage };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Tarayıcıdan çekme başarısız." };
  }
}
