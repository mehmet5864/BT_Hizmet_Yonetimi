import { getSession } from "@/lib/auth/session";
import { getInventoryAccess, viewerCanSeeAsset } from "@/lib/auth/inventory";
import { APP_NAME } from "@/lib/app-version";
import { getAssetTypeDef } from "@/lib/inventory/asset-types";
import { assetDisplayName, describeLocation, formatDate, formatLocation } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";
import { getSystemSettings } from "@/lib/settings-store";

export type ZimmetLine = {
  index: number;
  stockNo: string;
  kind: string;
  name: string;
  brand: string;
  model: string;
  serial: string;
  quantity: string;
  location: string;
  note: string;
};

export type ZimmetParty = {
  fullName: string;
  title: string;
  sicilNo: string;
  tcNo: string;
  department: string;
  workplace: string;
  phone: string;
  email: string;
};

export type ZimmetDocument = {
  mode: "person";
  documentNo: string;
  issuedAt: string;
  institution: string;
  unitTitle: string;
  recipient: ZimmetParty;
  issuer: ZimmetParty;
  managerName: string;
  lines: ZimmetLine[];
  filenameBase: string;
};

const DASH = "—";

function dash(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : DASH;
}

function slugPart(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ç", "c")
    .replaceAll("ğ", "g")
    .replaceAll("ı", "i")
    .replaceAll("ö", "o")
    .replaceAll("ş", "s")
    .replaceAll("ü", "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function partyFrom(person: {
  fullName: string;
  title?: string | null;
  sicilNo?: string | null;
  tcNo?: string | null;
  duty?: string | null;
  workplace?: string | null;
  phone?: string | null;
  email?: string | null;
  department?: { name: string } | null;
}): ZimmetParty {
  return {
    fullName: person.fullName,
    title: dash(person.title ?? person.duty),
    sicilNo: dash(person.sicilNo),
    tcNo: dash(person.tcNo),
    department: dash(person.department?.name),
    workplace: dash(person.workplace),
    phone: dash(person.phone),
    email: dash(person.email),
  };
}

const emptyParty: ZimmetParty = {
  fullName: DASH,
  title: DASH,
  sicilNo: DASH,
  tcNo: DASH,
  department: DASH,
  workplace: DASH,
  phone: DASH,
  email: DASH,
};

function lineFrom(
  asset: {
    id: string;
    assetType: string;
    stockNo?: string | null;
    name?: string | null;
    brand?: string | null;
    model?: string | null;
    serialNo?: string | null;
    deviceId?: string | null;
    description?: string | null;
    locRoom?: number | null;
    locCorridor?: number | null;
    locCabinet?: number | null;
    locShelf?: number | null;
  },
  index: number,
): ZimmetLine {
  const typeDef = getAssetTypeDef(asset.assetType);
  return {
    index,
    stockNo: dash(asset.stockNo),
    kind: typeDef?.label ?? asset.assetType,
    name: assetDisplayName(asset),
    brand: dash(asset.brand),
    model: dash(asset.model),
    serial: dash(asset.serialNo ?? asset.deviceId),
    quantity: "1",
    location: formatLocation(asset) ?? describeLocation(asset) ?? DASH,
    note: dash(asset.description),
  };
}

function documentNo(seed: string) {
  const day = new Date();
  const ymd = `${day.getFullYear()}${String(day.getMonth() + 1).padStart(2, "0")}${String(day.getDate()).padStart(2, "0")}`;
  const tail = seed.replace(/[^a-zA-Z0-9]/g, "").slice(-4).toUpperCase() || "0001";
  return `ZMT-${ymd}-${tail}`;
}

export function parseAssetIds(raw: string | string[] | null | undefined) {
  const parts = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return [...new Set(parts.flatMap((value) => value.split(",")).map((id) => id.trim()).filter(Boolean))];
}

export async function buildZimmetDocument(input: {
  personId?: string;
  assetIds?: string[];
}): Promise<{ ok: true; document: ZimmetDocument } | { ok: false; status: number; message: string }> {
  const access = await getInventoryAccess();
  if (!access) return { ok: false, status: 401, message: "Oturum gerekli." };
  if (!access.canView) return { ok: false, status: 403, message: "Envanter zimmet formuna yetkiniz yok." };

  const [settings, session, issuerRow] = await Promise.all([
    getSystemSettings(),
    getSession(),
    prisma.person.findUnique({
      where: { id: access.viewer.id },
      include: { department: true },
    }),
  ]);

  const issuer = issuerRow
    ? partyFrom(issuerRow)
    : session
      ? {
          ...emptyParty,
          fullName: session.fullName,
          title: dash(session.title),
          email: dash(session.email),
        }
      : emptyParty;

  const institution = settings.mail.fromName?.trim() || APP_NAME;
  const today = formatDate(new Date());

  if (!input.personId) return { ok: false, status: 400, message: "Personel seçin." };
  const person = await prisma.person.findUnique({
    where: { id: input.personId },
    include: { department: true, unitManager: true },
  });
  if (!person) return { ok: false, status: 404, message: "Personel bulunamadı." };

  const wanted = (input.assetIds ?? []).filter(Boolean);
  if (!wanted.length) {
    return { ok: false, status: 400, message: "Çıktı için en az bir zimmet kaydı seçin." };
  }

  const assets = await prisma.asset.findMany({
    where: { AND: [{ id: { in: wanted } }, access.assetWhere] } as never,
    include: { department: true, owner: { select: { id: true, fullName: true } } },
    orderBy: [{ stockNo: "asc" }, { name: "asc" }],
  });

  if (assets.length !== wanted.length) {
    return { ok: false, status: 404, message: "Seçilen kayıtlardan biri bulunamadı veya yetkiniz yok." };
  }

  const released = assets.filter((asset) => asset.custody === "FREE");
  if (released.length) {
    const first = released[0];
    return {
      ok: false,
      status: 409,
      message: `${assetDisplayName(first)} zimmetten düşmüş. Önce yeni kişiye zimmetleyin, sonra tutanak çıkarın.`,
    };
  }

  const foreign = assets.filter((asset) => asset.ownerId !== person.id);
  if (foreign.length) {
    const first = foreign[0];
    return {
      ok: false,
      status: 409,
      message: `${assetDisplayName(first)} şu an ${first.owner.fullName} zimmetinde. Önce zimmeti boşa çıkarmanız gerekir.`,
    };
  }

  for (const asset of assets) {
    if (!viewerCanSeeAsset(access, asset)) {
      return { ok: false, status: 403, message: "Bu kaydın zimmet formunu görme yetkiniz yok." };
    }
  }

  const document: ZimmetDocument = {
    mode: "person",
    documentNo: documentNo(person.sicilNo ?? person.id),
    issuedAt: today,
    institution,
    unitTitle: person.department?.name ?? DASH,
    recipient: partyFrom(person),
    issuer,
    managerName: dash(person.unitManager?.fullName),
    lines: assets.map((asset, index) => lineFrom(asset, index + 1)),
    filenameBase: `zimmet-formu-${slugPart(person.fullName)}-${documentNo(person.id).slice(4, 12)}`,
  };
  return { ok: true, document };
}

export const ZIMMET_PLEDGE = [
  "Yukarıda cinsi, miktarı ve özellikleri yazılı taşınır / demirbaşları sağlam, çalışır ve eksiksiz olarak teslim aldım.",
  "Taşınır Mal Yönetmeliği ve ilgili mevzuat hükümleri çerçevesinde kullanım, muhafaza, bakım ve iade yükümlülüğümü kabul ederim.",
  "Görev değişikliğim, işten ayrılmam veya idarece istenmesi halinde taşınırları aynı şekilde, tüm aksesuarlarıyla birlikte teslim edeceğimi; kayıp, hasar, zimmet noksanı veya ihmalimden doğacak zararlardan sorumlu olacağımı beyan ve taahhüt ederim.",
].join(" ");

export const ZIMMET_COPIES =
  "Belge iki nüsha düzenlenir. Bir nüsha teslim alana verilir, bir nüsha taşınır kayıt yetkilisi dosyasında saklanır.";
