import { ASSET_TYPE_SLUGS, type AssetTypeKey } from "./constants";
import { FORM_FACTOR_LABELS } from "./constants";
import { resolveField, type FieldDef, type FieldRef } from "./fields";

export type FieldGroup = {
  title: string;
  description?: string;
  fields: FieldRef[];
};

export type AssetTypeDef = {
  key: AssetTypeKey;
  label: string;
  /** Liste başlıklarında kullanılan çoğul ad */
  plural: string;
  slug: string;
  icon: string;
  accent: string;
  description: string;
  groups: FieldGroup[];
  /** Envanter listesinde türe özel gösterilecek ek kolonlar */
  listColumns: string[];
};

/** Neredeyse tüm türlerde tekrar eden bakım/destek bloğu. */
const SUPPORT_GROUP: FieldGroup = {
  title: "Bakım ve destek",
  fields: [
    "supportStatus",
    "contractorVendor",
    "supportVendor",
    "supportStartDate",
    "supportEndDate",
    "transactionDate",
  ],
};

const OWNERSHIP_GROUP: FieldGroup = {
  title: "Sahiplik ve kritiklik",
  fields: ["owner", "department", "criticality", "status"],
};

const NOTES_GROUP: FieldGroup = {
  title: "Ek bilgiler",
  fields: ["location", "image", "description"],
};

const HARDWARE_GROUP: FieldGroup = {
  title: "Donanım",
  fields: ["cpu", "ram", "disk"],
};

const NETWORK_GROUP: FieldGroup = {
  title: "Ağ bilgileri",
  fields: ["ipAddress", "macAddress"],
};

export const ASSET_TYPE_DEFS: Record<AssetTypeKey, AssetTypeDef> = {
  COMPUTER: {
    key: "COMPUTER",
    label: "Bilgisayar",
    plural: "Bilgisayarlar",
    slug: ASSET_TYPE_SLUGS.COMPUTER,
    icon: "Monitor",
    accent: "text-sky-600 dark:text-sky-400",
    description: "Masaüstü ve dizüstü istemciler, sanal masaüstleri.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["formFactor", "stockNo", "serialNo", { id: "name", label: "Bilgisayar adı", required: true }, "brand", "model"],
      },
      NETWORK_GROUP,
      { title: "İşletim sistemi", fields: ["operatingSystem", "version"] },
      HARDWARE_GROUP,
      OWNERSHIP_GROUP,
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["ipAddress", "operatingSystem"],
  },

  SERVER: {
    key: "SERVER",
    label: "Sunucu",
    plural: "Sunucular",
    slug: ASSET_TYPE_SLUGS.SERVER,
    icon: "Server",
    accent: "text-violet-600 dark:text-violet-400",
    description: "Fiziksel ve sanal sunucular, hizmet verdikleri uygulamalar.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: [
          "formFactor",
          "stockNo", "serialNo",
          { id: "name", label: "Sunucu adı", required: true },
          "servedApplication",
          "brand",
          "model",
          "serviceKind",
        ],
      },
      NETWORK_GROUP,
      { title: "İşletim sistemi", fields: ["operatingSystem", "version"] },
      HARDWARE_GROUP,
      OWNERSHIP_GROUP,
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["ipAddress", "servedApplication"],
  },

  PRINTER: {
    key: "PRINTER",
    label: "Yazıcı",
    plural: "Yazıcılar",
    slug: ASSET_TYPE_SLUGS.PRINTER,
    icon: "Printer",
    accent: "text-orange-600 dark:text-orange-400",
    description: "Yazıcılar, tarayıcılar ve çok fonksiyonlu cihazlar.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["stockNo", "serialNo", { id: "name", label: "Yazıcı adı", required: true }, "brand", "model", "version"],
      },
      NETWORK_GROUP,
      OWNERSHIP_GROUP,
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["ipAddress", "model"],
  },

  TABLET: {
    key: "TABLET",
    label: "Tablet",
    plural: "Tabletler",
    slug: ASSET_TYPE_SLUGS.TABLET,
    icon: "Tablet",
    accent: "text-teal-600 dark:text-teal-400",
    description: "Tablet ve mobil uç cihazlar.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["stockNo", "serialNo", { id: "name", label: "Tablet adı", required: true }, "brand", "model"],
      },
      NETWORK_GROUP,
      { title: "İşletim sistemi", fields: ["operatingSystem", "version"] },
      HARDWARE_GROUP,
      OWNERSHIP_GROUP,
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["operatingSystem", "version"],
  },

  MOBILE_PHONE: {
    key: "MOBILE_PHONE",
    label: "Mobil telefon",
    plural: "Mobil telefonlar",
    slug: ASSET_TYPE_SLUGS.MOBILE_PHONE,
    icon: "Smartphone",
    accent: "text-sky-600 dark:text-sky-400",
    description: "Kurumsal cep telefonları ve akıllı telefonlar.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["stockNo", "serialNo", { id: "name", label: "Telefon adı", required: true }, "brand", "model"],
      },
      NETWORK_GROUP,
      { title: "İşletim sistemi", fields: ["operatingSystem", "version"] },
      HARDWARE_GROUP,
      OWNERSHIP_GROUP,
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["operatingSystem", "version"],
  },

  SOFTWARE: {
    key: "SOFTWARE",
    label: "Yazılım / Lisans",
    plural: "Yazılım ve lisanslar",
    slug: ASSET_TYPE_SLUGS.SOFTWARE,
    icon: "AppWindow",
    accent: "text-indigo-600 dark:text-indigo-400",
    description: "Uygulama yazılımları ve lisans kayıtları.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["formFactor", "stockNo", { id: "name", label: "Yazılım / lisans adı", required: true }, "version", "serviceKind"],
      },
      {
        title: "Çalıştığı altyapı",
        description: "Lisansın hizmet aldığı sunucular; değişiklik ve yama yönetiminde etki analizi için kullanılır.",
        fields: ["hostServers"],
      },
      OWNERSHIP_GROUP,
      {
        title: "Lisans ve destek",
        fields: [
          "contractorVendor",
          "supportVendor",
          { id: "supportStartDate", label: "Lisans başlangıç tarihi" },
          { id: "supportEndDate", label: "Lisans bitiş tarihi" },
          "transactionDate",
        ],
      },
      { title: "Ek bilgiler", fields: ["description"] },
    ],
    listColumns: ["version", "supportEndDate"],
  },

  APPLICATION: {
    key: "APPLICATION",
    label: "Uygulama",
    plural: "Uygulamalar",
    slug: ASSET_TYPE_SLUGS.APPLICATION,
    icon: "Layers",
    accent: "text-teal-600 dark:text-teal-400",
    description: "Kurumun iş uygulamaları: çalıştığı sunucular ve servis verdiği hizmetler.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["stockNo", { id: "name", label: "Uygulama adı", required: true }, "version", "appEnvironment", "appTechnology", "serviceKind"],
      },
      {
        title: "Çalıştığı sunucular",
        description: "Uygulamanın üzerinde çalıştığı sunucular; değişiklik ve yama yönetiminde etki analizi için kullanılır.",
        fields: [{ id: "hostServers", label: "Çalıştığı sunucular" }],
      },
      {
        title: "Servis verdiği hizmetler",
        description: "Uygulamanın sunduğu hizmet kataloğu girişleri ve entegre olduğu diğer sistemler.",
        fields: [
          "servedServices",
          { id: "servedApplication", label: "Entegre / bağımlı sistemler", placeholder: "e-Devlet, Personel Bilgi Sistemi", fullWidth: true, hint: "Servis verdiği veya veri alıp verdiği diğer sistemler (serbest metin)." },
        ],
      },
      OWNERSHIP_GROUP,
      {
        title: "Kullanım ve süreklilik",
        fields: ["appUrl", "appUserCount", "appRto"],
      },
      {
        title: "Destek",
        fields: [
          "contractorVendor",
          "supportVendor",
          { id: "supportStartDate", label: "Destek / lisans başlangıcı" },
          { id: "supportEndDate", label: "Destek / lisans bitişi" },
        ],
      },
      { title: "Ek bilgiler", fields: ["description"] },
    ],
    listColumns: ["appEnvironment", "version"],
  },

  IP_PHONE: {
    key: "IP_PHONE",
    label: "IP telefon",
    plural: "IP telefonlar",
    slug: ASSET_TYPE_SLUGS.IP_PHONE,
    icon: "Phone",
    accent: "text-cyan-600 dark:text-cyan-400",
    description: "IP telefon setleri ve konferans cihazları.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["stockNo", "serialNo", { id: "name", label: "Cihaz adı / dahili no" }, "brand", "model"],
      },
      NETWORK_GROUP,
      OWNERSHIP_GROUP,
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["ipAddress", "model"],
  },

  NETWORK_DEVICE: {
    key: "NETWORK_DEVICE",
    label: "Router / Switch",
    plural: "Router ve switchler",
    slug: ASSET_TYPE_SLUGS.NETWORK_DEVICE,
    icon: "Network",
    accent: "text-emerald-600 dark:text-emerald-400",
    description: "Yönlendirici, anahtar ve diğer ağ cihazları.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: [
          {
            id: "formFactor",
            options: (["PHYSICAL", "VIRTUAL", "FIXTURE"] as const).map((value) => ({
              value,
              label: FORM_FACTOR_LABELS[value],
            })),
          },
          "stockNo", "serialNo",
          { id: "name", label: "Router / switch adı", required: true },
          "deviceId",
          "brand",
          "model",
          "serviceKind",
        ],
      },
      NETWORK_GROUP,
      { title: "İşletim sistemi", fields: ["operatingSystem", "version"] },
      HARDWARE_GROUP,
      OWNERSHIP_GROUP,
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["ipAddress", "serialNo"],
  },

  PERIPHERAL: {
    key: "PERIPHERAL",
    label: "Çevre birimi",
    plural: "Çevre birimleri",
    slug: ASSET_TYPE_SLUGS.PERIPHERAL,
    icon: "Keyboard",
    accent: "text-rose-600 dark:text-rose-400",
    description: "Monitör, klavye, barkod okuyucu gibi çevre birimleri.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["stockNo", "serialNo", { id: "name", label: "Cihaz adı", required: true }, "deviceId", "brand", "model"],
      },
      { title: "Sahiplik ve kritiklik", fields: ["owner", "department", "criticality", "status"] },
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["serialNo", "model"],
  },

  FIXTURE: {
    key: "FIXTURE",
    label: "Demirbaş",
    plural: "Demirbaşlar",
    slug: ASSET_TYPE_SLUGS.FIXTURE,
    icon: "Package",
    accent: "text-amber-600 dark:text-amber-400",
    description: "Zimmetli demirbaş kayıtları.",
    groups: [
      {
        title: "Tanımlayıcı bilgiler",
        fields: ["stockNo", "serialNo", { id: "name", label: "Demirbaş tanımı", required: true }, "deviceId", "brand", "model"],
      },
      { title: "Sahiplik ve kritiklik", fields: ["owner", "department", "criticality", "status"] },
      SUPPORT_GROUP,
      NOTES_GROUP,
    ],
    listColumns: ["serialNo", "model"],
  },
};

export const ASSET_TYPE_LIST = Object.values(ASSET_TYPE_DEFS);

export function getAssetTypeDef(key: string): AssetTypeDef | undefined {
  return ASSET_TYPE_DEFS[key as AssetTypeKey];
}

export function getFieldsFor(key: AssetTypeKey): FieldDef[] {
  return ASSET_TYPE_DEFS[key].groups.flatMap((group) => group.fields.map(resolveField));
}

export function getResolvedGroups(key: AssetTypeKey): { title: string; description?: string; fields: FieldDef[] }[] {
  return ASSET_TYPE_DEFS[key].groups.map((group) => ({
    title: group.title,
    description: group.description,
    fields: group.fields.map(resolveField),
  }));
}

export function hasField(key: AssetTypeKey, fieldId: string): boolean {
  return getFieldsFor(key).some((field) => field.id === fieldId);
}
