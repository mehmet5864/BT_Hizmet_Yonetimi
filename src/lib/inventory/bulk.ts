import ExcelJS from "exceljs";

import { ASSET_TYPE_DEFS, ASSET_TYPE_LIST } from "@/lib/inventory/asset-types";
import {
  CRITICALITY_LABELS,
  CRITICALITY_LEVELS,
  FORM_FACTOR_LABELS,
  LIFECYCLE_STATUS_LABELS,
  LIFECYCLE_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUSES,
  type AssetTypeKey,
} from "@/lib/inventory/constants";
import { formatLocation } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";

export const BULK_COLUMNS = [
  { key: "tur", header: "Tür", width: 18, required: true },
  { key: "stockNo", header: "Stok no", width: 16 },
  { key: "name", header: "Ad", width: 22, required: true },
  { key: "formFactor", header: "Envanter tipi", width: 14 },
  { key: "brand", header: "Marka", width: 14 },
  { key: "model", header: "Model", width: 18 },
  { key: "serialNo", header: "Seri no", width: 18 },
  { key: "deviceId", header: "Device ID", width: 16 },
  { key: "ipAddress", header: "IP adresi", width: 14 },
  { key: "macAddress", header: "MAC adresi", width: 18 },
  { key: "operatingSystem", header: "İşletim sistemi", width: 20 },
  { key: "version", header: "Sürüm", width: 12 },
  { key: "cpu", header: "İşlemci", width: 22 },
  { key: "ram", header: "RAM", width: 10 },
  { key: "disk", header: "Disk", width: 16 },
  { key: "servedApplication", header: "Hizmet verdiği uygulama", width: 24 },
  { key: "owner", header: "Sahibi", width: 22, required: true },
  { key: "department", header: "Birim", width: 28 },
  { key: "criticality", header: "Kritiklik", width: 12 },
  { key: "status", header: "Durum", width: 18 },
  { key: "location", header: "Konum", width: 16 },
  { key: "supportStatus", header: "Bakım durumu", width: 18 },
  { key: "contractorVendor", header: "Yüklenici firma", width: 20 },
  { key: "supportVendor", header: "Destek firma", width: 20 },
  { key: "supportStartDate", header: "Bakım başlangıç", width: 16 },
  { key: "supportEndDate", header: "Bakım bitiş", width: 14 },
  { key: "transactionDate", header: "İşlem tarihi", width: 14 },
  { key: "description", header: "Açıklama", width: 32 },
] as const;

export type BulkColumnKey = (typeof BULK_COLUMNS)[number]["key"];

export type BulkRowError = { row: number; message: string };

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR");
}

function cellText(value: unknown) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object" && "text" in (value as object)) return String((value as { text: string }).text ?? "").trim();
  if (typeof value === "object" && "result" in (value as object)) return cellText((value as { result: unknown }).result);
  return String(value).trim();
}

function parseDate(value: unknown): Date | null {
  const text = cellText(value);
  if (!text) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 12);
  const tr = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (tr) return new Date(Number(tr[3]), Number(tr[2]) - 1, Number(tr[1]), 12);
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseLocationCode(value: string) {
  const result: { locRoom?: number; locCorridor?: number; locCabinet?: number; locShelf?: number } = {};
  for (const part of value.trim().split(/[-/\s]+/).filter(Boolean)) {
    const room = part.match(/^(\d+)O$/i);
    const cabinet = part.match(/^(\d+)Ka$/i);
    const corridor = part.match(/^(\d+)K$/i);
    const shelf = part.match(/^(\d+)$/);
    if (room) result.locRoom = Number(room[1]);
    else if (cabinet) result.locCabinet = Number(cabinet[1]);
    else if (corridor) result.locCorridor = Number(corridor[1]);
    else if (shelf) result.locShelf = Number(shelf[1]);
  }
  return result;
}

function matchLabel<T extends string>(value: string, labels: Record<T, string>, keys: readonly T[]): T | null {
  const n = normalize(value);
  if (!n) return null;
  for (const key of keys) {
    if (normalize(key) === n || normalize(labels[key]) === n) return key;
  }
  return null;
}

function matchType(value: string): AssetTypeKey | null {
  const n = normalize(value);
  if (!n) return null;
  for (const item of ASSET_TYPE_LIST) {
    if (
      normalize(item.key) === n ||
      normalize(item.label) === n ||
      normalize(item.plural) === n ||
      normalize(item.slug) === n
    ) {
      return item.key;
    }
  }
  return null;
}

function findByName<T extends { id: string; name?: string | null; fullName?: string }>(
  list: T[],
  value: string,
): T | undefined {
  const n = normalize(value);
  if (!n) return undefined;
  return list.find((item) => normalize(item.fullName ?? item.name ?? "") === n);
}

export async function buildInventoryTemplate() {
  const [people, departments, vendors] = await Promise.all([
    prisma.person.findMany({ orderBy: { fullName: "asc" }, select: { fullName: true } }),
    prisma.department.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.vendor.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BT Hizmet Yönetimi";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Envanter", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = BULK_COLUMNS.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  sheet.getRow(1).alignment = { vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 22;

  const sampleOwner = people[0]?.fullName ?? "Ahmet Yılmaz";
  const sampleDept = departments[0]?.name ?? "";
  sheet.addRow({
    tur: "Bilgisayar",
    stockNo: "BIM-TOPLU-0001",
    name: "PC-ORNEK-001",
    formFactor: "Fiziksel",
    brand: "Dell",
    model: "OptiPlex 7010",
    ipAddress: "10.20.30.40",
    macAddress: "A4:BB:6D:1F:90:2C",
    operatingSystem: "Windows 11 Pro",
    version: "23H2",
    owner: sampleOwner,
    department: sampleDept,
    criticality: "Orta",
    status: "Kullanımda",
    location: "1O-3K-4Ka-10",
    supportStatus: "Sözleşmeli",
    description: "Örnek satır — yüklemeden önce silin veya düzenleyin.",
  });

  const lists = workbook.addWorksheet("Listeler");
  lists.columns = [
    { header: "Türler", width: 22 },
    { header: "Envanter tipi", width: 16 },
    { header: "Kritiklik", width: 12 },
    { header: "Durum", width: 22 },
    { header: "Bakım durumu", width: 20 },
    { header: "Personel", width: 28 },
    { header: "Birimler", width: 32 },
    { header: "Firmalar", width: 28 },
  ];
  lists.getRow(1).font = { bold: true };
  const typeLabels = ASSET_TYPE_LIST.map((item) => item.label);
  const formFactors = Object.values(FORM_FACTOR_LABELS);
  const crits = CRITICALITY_LEVELS.map((key) => CRITICALITY_LABELS[key]);
  const statuses = LIFECYCLE_STATUSES.map((key) => LIFECYCLE_STATUS_LABELS[key]);
  const supports = SUPPORT_STATUSES.map((key) => SUPPORT_STATUS_LABELS[key]);
  const max = Math.max(
    typeLabels.length,
    formFactors.length,
    crits.length,
    statuses.length,
    supports.length,
    people.length,
    departments.length,
    vendors.length,
    1,
  );
  for (let i = 0; i < max; i += 1) {
    lists.addRow([
      typeLabels[i] ?? "",
      formFactors[i] ?? "",
      crits[i] ?? "",
      statuses[i] ?? "",
      supports[i] ?? "",
      people[i]?.fullName ?? "",
      departments[i]?.name ?? "",
      vendors[i]?.name ?? "",
    ]);
  }

  const help = workbook.addWorksheet("Talimat");
  help.columns = [{ width: 110 }];
  help.addRow(["Toplu envanter yükleme şablonu"]);
  help.getRow(1).font = { bold: true, size: 14 };
  help.addRows([
    [],
    ["1. Envanter sayfasına her varlık için bir satır yazın. İlk satır başlıktır, değiştirmeyin."],
    ["2. Zorunlu sütunlar: Tür, Ad, Sahibi. Sahibi personel kartındaki ad soyad ile birebir aynı olmalıdır."],
    ["3. Tür, kritiklik, durum ve bakım değerlerini Listeler sayfasından kopyalayın."],
    ["4. Konum biçimi: 1O-3K-4Ka-10 (oda / koridor / kabin / raf)."],
    ["5. Tarihler YYYY-AA-GG veya GG.AA.YYYY olabilir."],
    ["6. Örnek satırı silin veya düzenleyin. Boş satırlar atlanır."],
    ["7. Aynı stok no varsa satır hata verir; yeni stok no kullanın."],
    ["8. Doldurduğunuz dosyayı Envanter → Toplu yükleme sayfasından gönderin."],
  ]);

  for (let row = 2; row <= 200; row += 1) {
    sheet.getCell(`A${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`Listeler!$A$2:$A$${typeLabels.length + 1}`],
    };
  }

  return workbook;
}

export async function importInventoryWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet("Envanter") ?? workbook.worksheets[0];
  if (!sheet) return { created: 0, errors: [{ row: 1, message: "Excel sayfası bulunamadı." }] as BulkRowError[] };

  const headerRow = sheet.getRow(1);
  const indexByKey = new Map<string, number>();
  headerRow.eachCell((cell, col) => {
    const header = cellText(cell.value);
    const column = BULK_COLUMNS.find((item) => normalize(item.header) === normalize(header) || item.key === header);
    if (column) indexByKey.set(column.key, col);
  });
  if (!indexByKey.has("tur") || !indexByKey.has("name") || !indexByKey.has("owner")) {
    return {
      created: 0,
      errors: [{ row: 1, message: "Başlık satırı eksik. Şablonu indirip o dosyayı kullanın (Tür, Ad, Sahibi zorunlu)." }],
    };
  }

  const [people, departments, vendors] = await Promise.all([
    prisma.person.findMany({ select: { id: true, fullName: true, departmentId: true } }),
    prisma.department.findMany({ select: { id: true, name: true } }),
    prisma.vendor.findMany({ select: { id: true, name: true } }),
  ]);

  const errors: BulkRowError[] = [];
  let created = 0;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const read = (key: BulkColumnKey) => {
      const col = indexByKey.get(key);
      return col ? cellText(row.getCell(col).value) : "";
    };
    const values = Object.fromEntries(BULK_COLUMNS.map((column) => [column.key, read(column.key)])) as Record<
      BulkColumnKey,
      string
    >;
    if (Object.values(values).every((value) => !value)) continue;

    const assetType = matchType(values.tur);
    if (!assetType) {
      errors.push({ row: rowNumber, message: `Geçersiz tür: ${values.tur || "boş"}` });
      continue;
    }
    if (!values.name) {
      errors.push({ row: rowNumber, message: "Ad zorunludur." });
      continue;
    }
    const owner = findByName(people, values.owner);
    if (!owner) {
      errors.push({ row: rowNumber, message: `Sahibi bulunamadı: ${values.owner || "boş"}` });
      continue;
    }
    const department = values.department ? findByName(departments, values.department) : undefined;
    if (values.department && !department) {
      errors.push({ row: rowNumber, message: `Birim bulunamadı: ${values.department}` });
      continue;
    }
    const contractor = values.contractorVendor ? findByName(vendors, values.contractorVendor) : undefined;
    if (values.contractorVendor && !contractor) {
      errors.push({ row: rowNumber, message: `Yüklenici bulunamadı: ${values.contractorVendor}` });
      continue;
    }
    const support = values.supportVendor ? findByName(vendors, values.supportVendor) : undefined;
    if (values.supportVendor && !support) {
      errors.push({ row: rowNumber, message: `Destek firma bulunamadı: ${values.supportVendor}` });
      continue;
    }
    if (values.stockNo) {
      const exists = await prisma.asset.findUnique({ where: { stockNo: values.stockNo }, select: { id: true } });
      if (exists) {
        errors.push({ row: rowNumber, message: `Stok no zaten kayıtlı: ${values.stockNo}` });
        continue;
      }
    }

    const location = parseLocationCode(values.location);
    const typeDef = ASSET_TYPE_DEFS[assetType];

    try {
      const createdAsset = await prisma.asset.create({
        data: {
          assetType,
          name: values.name,
          stockNo: values.stockNo || null,
          formFactor: matchLabel(values.formFactor, FORM_FACTOR_LABELS, ["PHYSICAL", "VIRTUAL", "FIXTURE"]),
          brand: values.brand || null,
          model: values.model || null,
          serialNo: values.serialNo || null,
          deviceId: values.deviceId || null,
          ipAddress: values.ipAddress || null,
          macAddress: values.macAddress || null,
          operatingSystem: values.operatingSystem || null,
          version: values.version || null,
          cpu: values.cpu || null,
          ram: values.ram || null,
          disk: values.disk || null,
          servedApplication: values.servedApplication || null,
          ownerId: owner.id,
          departmentId: department?.id ?? owner.departmentId ?? null,
          criticality: matchLabel(values.criticality, CRITICALITY_LABELS, CRITICALITY_LEVELS) ?? "MEDIUM",
          status: matchLabel(values.status, LIFECYCLE_STATUS_LABELS, LIFECYCLE_STATUSES) ?? "ACTIVE",
          locRoom: location.locRoom ?? null,
          locCorridor: location.locCorridor ?? null,
          locCabinet: location.locCabinet ?? null,
          locShelf: location.locShelf ?? null,
          supportStatus: matchLabel(values.supportStatus, SUPPORT_STATUS_LABELS, SUPPORT_STATUSES),
          contractorVendorId: contractor?.id ?? null,
          supportVendorId: support?.id ?? null,
          supportStartDate: parseDate(values.supportStartDate),
          supportEndDate: parseDate(values.supportEndDate),
          transactionDate: parseDate(values.transactionDate),
          description: values.description || null,
        },
      });
      await prisma.activityLog.create({
        data: {
          assetId: createdAsset.id,
          action: "CREATE",
          note: `Toplu Excel yüklemesi (${typeDef.label})`,
        },
      });
      created += 1;
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Satır kaydedilemedi.",
      });
    }
  }

  return { created, errors };
}

export function locationOf(asset: Parameters<typeof formatLocation>[0]) {
  return formatLocation(asset) ?? "";
}
