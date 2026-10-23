// @ts-nocheck
/**
 * Kurumsal hiyerarşi (örnek veri) — mevcut kişilere ve birimlere dokunmadan yalnızca üst yapıyı kurar.
 *
 *   Bakanlık
 *    ├─ Bakan Yardımcılığı 1
 *    │   ├─ Bilgi İşlem Genel Müdürlüğü   → 2 Genel Müdür Yardımcılığı → Daire Başkanlıkları → Şube Müdürlükleri
 *    │   └─ Strateji Geliştirme Genel Müdürlüğü → …
 *    └─ Bakan Yardımcılığı 2
 *        ├─ Personel Genel Müdürlüğü → …
 *        └─ Mali Hizmetler Genel Müdürlüğü → …
 *
 * Rol tutarlılığı: Bakan / Bakan Yrd. / Genel Müdür / GMY → SENIOR_MANAGER; Daire Başkanı / Şube Müdürü → UNIT_MANAGER.
 * Bilgi güvenliği yöneticisi (INFOSEC_MANAGER) hiçbir yönetici kadrosuna atanmaz.
 * Yalnızca boş kadrolara yeni kişi eklenir; var olan kişi/birim adı değişmez. Tekrar çalıştırılırsa aynı kayıtları bulur.
 * Elle: npx tsx prisma/seed-org-hierarchy.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const FIRST = [
  "Hakan", "Nurten", "Murat", "Süleyman", "Hülya", "Kerem", "Nilüfer", "Cem", "Tuğba", "İsmail",
  "Sevgi", "Volkan", "Kadir", "Dilek", "Emre", "Orhan", "Gülşen", "Aylin", "Reşat", "Leyla",
  "Barış", "Ebru", "Taner", "Seda", "Onur", "Yasemin", "Erkan", "Gamze", "Levent", "Işıl",
  "Serkan", "Derya", "Alper", "Hatice", "Ufuk", "Melek", "Coşkun", "Nazlı", "Bülent", "Sinem",
  "Tarık", "Özlem", "Ferhat", "Canan", "Rüstem", "Berna", "Selçuk", "Aslı",
];
const LAST = [
  "Doğan", "Çakır", "Eren", "Aksu", "Tarhan", "Altun", "Sönmez", "Başaran", "Işık", "Yavuz",
  "Öncü", "Tunç", "Sezer", "Aras", "Sarı", "Taşkın", "Ay", "Kaya", "Kurt", "Ersoy",
  "Aktaş", "Karaca", "Bozkurt", "Çınar", "Duman", "Ekinci", "Gür", "Hançer", "İnce", "Koçak",
  "Mutlu", "Nalbant", "Oral", "Pamuk", "Sevim", "Turan", "Uysal", "Varol", "Yazıcı", "Zengin",
  "Akbulut", "Bayram", "Cevik", "Dalgıç", "Erol", "Fidan", "Gökçe", "Hazar",
];
let nameIdx = 0;
function nextName() {
  for (;;) {
    const i = nameIdx++;
    const first = FIRST[i % FIRST.length];
    const last = LAST[(i * 7 + 3) % LAST.length];
    return `${first} ${last}`;
  }
}
const slug = (s: string) =>
  s.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/\s+/g, ".");

type Kind = "BAKANLIK" | "BAKAN_YARDIMCILIGI" | "GENEL_MUDURLUK" | "GMY" | "DAIRE_BASKANLIGI" | "SUBE_MUDURLUGU";
const POST: Record<Kind, { title: string; role: string; unitType: string }> = {
  BAKANLIK: { title: "Bakan", role: "SENIOR_MANAGER", unitType: "BAKANLIK" },
  BAKAN_YARDIMCILIGI: { title: "Bakan Yardımcısı", role: "SENIOR_MANAGER", unitType: "BAKAN_YARDIMCILIGI" },
  GENEL_MUDURLUK: { title: "Genel Müdür", role: "SENIOR_MANAGER", unitType: "GENEL_MUDURLUK" },
  GMY: { title: "Genel Müdür Yardımcısı", role: "SENIOR_MANAGER", unitType: "GENEL_MUDURLUK" },
  DAIRE_BASKANLIGI: { title: "Daire Başkanı", role: "UNIT_MANAGER", unitType: "DAIRE_BASKANLIGI" },
  SUBE_MUDURLUGU: { title: "Şube Müdürü", role: "UNIT_MANAGER", unitType: "SUBE_MUDURLUGU" },
};

type Node = {
  name: string;
  kind: Kind;
  code?: string;
  /** var olan birim (kod veya ad ile bulunur) — adı değiştirilmez */
  existing?: boolean;
  /** var olan birimin mevcut amiri yerine yeni kişi atanır */
  replaceHead?: boolean;
  /** boşsa bu kullanıcı amir olur */
  headUser?: string;
  headTitle?: string;
  children?: Node[];
};

const S = (name: string, extra: Partial<Node> = {}): Node => ({ name, kind: "SUBE_MUDURLUGU", ...extra });
const D = (name: string, children: Node[] = [], extra: Partial<Node> = {}): Node => ({ name, kind: "DAIRE_BASKANLIGI", children, ...extra });
const GMY = (name: string, children: Node[]): Node => ({ name, kind: "GMY", children });
const GM = (name: string, children: Node[]): Node => ({ name, kind: "GENEL_MUDURLUK", children });

const TREE: Node = {
  name: "Bakanlık",
  kind: "BAKANLIK",
  children: [
    {
      name: "Bakan Yardımcılığı 1",
      kind: "BAKAN_YARDIMCILIGI",
      children: [
        GM("Bilgi İşlem Genel Müdürlüğü", [
          GMY("Bilgi İşlem Genel Müdür Yardımcılığı 1", [
            D("Bilgi İşlem Daire Başkanlığı", [
              S("Veri Merkezi Operasyon", { existing: true, code: "VMO" }),
              S("Veritabanı Şube Müdürlüğü", { existing: true, code: "VTB" }),
              S("Servis Masası / Yardım Masası", { existing: true, code: "SDM" }),
            ], { existing: true, code: "BIDB", replaceHead: true }),
            D("Siber Güvenlik Daire Başkanlığı", [
              S("Siber Olay Müdahale Şube Müdürlüğü"),
              S("Zafiyet ve Risk Yönetimi Şube Müdürlüğü"),
            ], { code: "SGD" }),
          ]),
          GMY("Bilgi İşlem Genel Müdür Yardımcılığı 2", [
            D("Yazılım Daire Başkanlığı", [
              S("Uygulama Geliştirme Şube Müdürlüğü", { headUser: "can.yildiz" }),
              S("Kalite ve Test Şube Müdürlüğü"),
            ], { existing: true, code: "YAZ", replaceHead: true }),
            D("Destek Hizmetleri Daire Başkanlığı", [
              S("Envanter Şube Müdürlüğü", { existing: true, code: "ENV", headUser: "nihan.celik" }),
              S("Teknik Destek Şube Müdürlüğü"),
            ], { code: "DHD" }),
          ]),
        ]),
        GM("Strateji Geliştirme Genel Müdürlüğü", [
          GMY("Strateji Geliştirme Genel Müdür Yardımcılığı 1", [
            D("Strateji Geliştirme Birimi", [
              S("Planlama ve Bütçe Şube Müdürlüğü"),
              S("Performans İzleme Şube Müdürlüğü"),
            ], { existing: true, code: "SGB", replaceHead: true }),
          ]),
          GMY("Strateji Geliştirme Genel Müdür Yardımcılığı 2", [
            D("Kurumsal Gelişim Daire Başkanlığı", [
              S("Süreç Yönetimi Şube Müdürlüğü"),
              S("Proje Yönetimi Şube Müdürlüğü"),
            ], { code: "KGD" }),
          ]),
        ]),
      ],
    },
    {
      name: "Bakan Yardımcılığı 2",
      kind: "BAKAN_YARDIMCILIGI",
      children: [
        GM("Personel Genel Müdürlüğü", [
          GMY("Personel Genel Müdür Yardımcılığı 1", [
            D("İnsan Kaynakları Müdürlüğü", [
              S("Özlük İşleri Şube Müdürlüğü"),
              S("Eğitim ve Gelişim Şube Müdürlüğü"),
            ], { existing: true, code: "IKM", headUser: "zeynep.aydin", headTitle: "İnsan Kaynakları Daire Başkanı" }),
          ]),
          GMY("Personel Genel Müdür Yardımcılığı 2", [
            D("Sosyal Hizmetler Daire Başkanlığı", [
              S("Sosyal Tesisler Şube Müdürlüğü"),
              S("Sağlık ve Sosyal Yardım Şube Müdürlüğü"),
            ], { code: "SHD" }),
          ]),
        ]),
        GM("Mali Hizmetler Genel Müdürlüğü", [
          GMY("Mali Hizmetler Genel Müdür Yardımcılığı 1", [
            D("Mali Hizmetler Müdürlüğü", [
              S("Muhasebe Şube Müdürlüğü"),
              S("Bütçe ve Ödenek Şube Müdürlüğü"),
            ], { existing: true, code: "MHM", replaceHead: true }),
          ]),
          GMY("Mali Hizmetler Genel Müdür Yardımcılığı 2", [
            D("Satın Alma Daire Başkanlığı", [
              S("İhale Şube Müdürlüğü"),
              S("Taşınır ve Mal Yönetimi Şube Müdürlüğü"),
            ], { code: "SAD" }),
          ]),
        ]),
      ],
    },
  ],
};

let passwordHash: string | null = null;
let created = 0;

async function newPerson(node: Node, deptId: string, parentDeptId: string | null, superiorId: string | null, grandId: string | null) {
  const post = POST[node.kind];
  let fullName = nextName();
  while (await prisma.person.findUnique({ where: { fullName } })) fullName = nextName();
  const adUsername = slug(fullName);
  created++;
  return prisma.person.create({
    data: {
      fullName,
      adUsername,
      title: post.title,
      duty: `${node.name} yönetimi`,
      workplace: node.name,
      email: `${adUsername}@kurum.gov.tr`,
      role: post.role,
      roleSource: "MANUAL",
      departmentId: deptId,
      parentDepartmentId: parentDeptId,
      unitManagerId: superiorId,
      parentManagerId: grandId,
      passwordHash,
    },
  });
}

async function walk(node: Node, parent: any, superior: any, grand: any) {
  const post = POST[node.kind];
  let dept: any = null;
  if (node.existing) {
    dept = (node.code && (await prisma.department.findFirst({ where: { code: node.code } }))) || (await prisma.department.findUnique({ where: { name: node.name } }));
  } else {
    dept = await prisma.department.findUnique({ where: { name: node.name } });
  }
  if (!dept) {
    dept = await prisma.department.create({ data: { name: node.name, code: node.code ?? null, unitType: post.unitType, parentId: parent?.id ?? null } });
  } else {
    dept = await prisma.department.update({ where: { id: dept.id }, data: { unitType: post.unitType, parentId: parent?.id ?? null } });
  }

  // Amir: önce mevcut amir (değiştirilmiyorsa), sonra belirtilen kullanıcı, yoksa yeni kişi
  let head: any = null;
  if (dept.managerId && !node.replaceHead) head = await prisma.person.findUnique({ where: { id: dept.managerId } });
  if (!head && node.headUser) {
    head = await prisma.person.findFirst({ where: { adUsername: node.headUser } });
    if (head && node.headTitle) head = await prisma.person.update({ where: { id: head.id }, data: { title: node.headTitle } });
  }
  if (!head && node.replaceHead && dept.managerId) {
    // önceden bu kadroya yeni kişi atanmışsa onu bul (tekrar çalıştırma)
    const prev = await prisma.person.findUnique({ where: { id: dept.managerId } });
    if (prev && prev.title === post.title) head = prev;
  }
  if (!head) head = await newPerson(node, dept.id, parent?.id ?? null, superior?.id ?? null, grand?.id ?? null);

  // var olan kişilerin boş üst bağlantılarını tamamla (dolu olanlara dokunma)
  const fix: any = {};
  if (!head.departmentId) fix.departmentId = dept.id;
  if (!head.parentDepartmentId && parent) fix.parentDepartmentId = parent.id;
  if (!head.unitManagerId && superior && head.id !== superior.id) fix.unitManagerId = superior.id;
  if (!head.parentManagerId && grand && head.id !== grand.id) fix.parentManagerId = grand.id;
  if (Object.keys(fix).length) head = await prisma.person.update({ where: { id: head.id }, data: fix });

  await prisma.department.update({ where: { id: dept.id }, data: { managerId: head.id, parentManagerId: superior?.id ?? null } });

  for (const child of node.children ?? []) await walk(child, dept, head, superior);
  return dept;
}

async function main() {
  const boss = await prisma.person.findFirst({ where: { adUsername: "ahmet.yilmaz" } });
  passwordHash = boss?.passwordHash ?? null;

  await walk(TREE, null, null, null);

  // Mevcut kişiler: yer değiştirmeden yalnızca birimlerine bağla (Bilgi güvenliği yöneticisi siber birimde çalışır, amir olmaz)
  const siber = await prisma.department.findUnique({ where: { name: "Siber Güvenlik Daire Başkanlığı" } });
  const selin = await prisma.person.findFirst({ where: { adUsername: "selin.koc" } });
  if (siber && selin) {
    await prisma.person.update({
      where: { id: selin.id },
      data: {
        departmentId: siber.id,
        parentDepartmentId: siber.parentId,
        unitManagerId: siber.managerId,
        parentManagerId: siber.parentManagerId,
        workplace: siber.name,
      },
    });
  }
  const uyg = await prisma.department.findUnique({ where: { name: "Uygulama Geliştirme Şube Müdürlüğü" } });
  const can = await prisma.person.findFirst({ where: { adUsername: "can.yildiz" } });
  if (uyg && can) {
    await prisma.person.update({
      where: { id: can.id },
      data: { departmentId: uyg.id, parentDepartmentId: uyg.parentId, unitManagerId: uyg.parentManagerId, parentManagerId: null, title: "Uygulama Geliştirme Şube Müdürü" },
    });
  }

  console.log(`Hiyerarşi hazır — ${created} yeni kadro kişisi eklendi.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
