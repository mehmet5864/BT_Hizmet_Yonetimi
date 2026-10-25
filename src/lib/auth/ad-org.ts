import { type UnitType } from "@/lib/itil/unit-types";
import { REQUEST_OFFICES, type RequestOffice } from "@/lib/itil/request-types";
import { prisma } from "@/lib/prisma";

/** Birim sayılmayan, genel amaçlı OU adları. */
const SKIP_OU = new Set(["users", "user", "computers", "groups", "domain controllers", "kullanıcılar", "kullanicilar", "gruplar", "bilgisayarlar"]);
const MAX_LEVELS = 8;

const lower = (value: string) => value.toLocaleLowerCase("tr-TR");

/** DN'deki OU bileşenlerini kökten yaprağa doğru döndürür. Örn. CN=Ali,OU=Şube,OU=Daire,OU=GM,DC=x → [GM, Daire, Şube]. */
export function ouPathFromDn(dn: string): string[] {
  const parts = dn.match(/(?:\\.|[^,])+/g) ?? [];
  const ous = parts
    .map((part) => /^\s*OU=(.+)$/i.exec(part)?.[1]?.replace(/\\(.)/g, "$1").trim())
    .filter((name): name is string => Boolean(name) && name!.length <= 100 && !SKIP_OU.has(lower(name!)));
  return ous.reverse().slice(0, MAX_LEVELS);
}

/** OU adından birim türü; tanınmazsa null. */
export function unitTypeFromName(name: string): UnitType | null {
  const n = lower(name);
  if (/yardımcı|yrd/.test(n)) return "BAKAN_YARDIMCILIGI";
  if (/genel müdür|genel mudur/.test(n)) return "GENEL_MUDURLUK";
  if (/daire/.test(n)) return "DAIRE_BASKANLIGI";
  if (/şube|sube/.test(n)) return "SUBE_MUDURLUGU";
  if (/özel kalem|ozel kalem/.test(n)) return "OZEL_KALEM";
  if (/bakanlık|bakanlik/.test(n)) return "BAKANLIK";
  if (/başkanlık|baskanlik/.test(n)) return "BASKANLIK";
  if (/şeflik|seflik|birim|servis/.test(n)) return "BIRIM_SEFLIGI";
  return null;
}

/** OU yolundan (yapraktan köke) talep birimi; bulunamazsa null. */
export function officeFromPath(path: string[]): RequestOffice | null {
  const rules: [RegExp, RequestOffice][] = [
    [/siber|güvenlik|guvenlik|security/, "SIBER"],
    [/veri\s?tabanı|veritabani|database/, "VERITABANI"],
    [/yazılım|yazilim|geliştirme|gelistirme|software/, "YAZILIM"],
    [/(^|\s)ağ(\s|$)|network|haberleşme|haberlesme/, "NETWORK"],
    [/sistem/, "SISTEM"],
    [/servis masası|servis masasi|destek|helpdesk/, "SERVIS"],
  ];
  for (const name of [...path].reverse()) {
    const n = lower(name);
    for (const [pattern, office] of rules) if (pattern.test(n) && (REQUEST_OFFICES as readonly string[]).includes(office)) return office;
  }
  return null;
}

/**
 * Girişte çağrılır: OU yolundaki birimleri (yoksa) oluşturur ve kişiyi en alttaki birime bağlar.
 * Hiçbir hata girişi engellemez; çağıran try/catch ile sarar.
 */
export async function syncPersonOrgFromDn(
  person: { id: string; departmentId: string | null; requestOffice: string | null },
  dn: string,
) {
  const path = ouPathFromDn(dn);
  if (!path.length) return;
  let parentId: string | null = null;
  let parentName = "";
  for (const name of path) {
    const found: { id: string; parentId: string | null } | null = await prisma.department.findUnique({
      where: { name },
      select: { id: true, parentId: true },
    });
    let id: string;
    if (found && found.parentId === parentId) {
      id = found.id;
    } else {
      // Aynı ad başka bir üst birimin altındaysa karışmaması için üst birim adıyla ayrıştırılır.
      const finalName: string = found ? `${name} - ${parentName}` : name;
      const again: { id: string } | null = found
        ? await prisma.department.findUnique({ where: { name: finalName }, select: { id: true } })
        : null;
      id =
        again?.id ??
        (
          await prisma.department.create({
            data: { name: finalName, unitType: unitTypeFromName(name), parentId },
            select: { id: true },
          })
        ).id;
    }
    parentId = id;
    parentName = name;
  }
  const data: { departmentId?: string; requestOffice?: string } = {};
  if (parentId && person.departmentId !== parentId) data.departmentId = parentId;
  if (!person.requestOffice) {
    const office = officeFromPath(path);
    if (office) data.requestOffice = office;
  }
  if (Object.keys(data).length) await prisma.person.update({ where: { id: person.id }, data });
}

