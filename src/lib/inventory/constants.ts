export const ASSET_TYPES = [
  "COMPUTER",
  "SERVER",
  "PRINTER",
  "TABLET",
  "MOBILE_PHONE",
  "SOFTWARE",
  "APPLICATION",
  "IP_PHONE",
  "NETWORK_DEVICE",
  "PERIPHERAL",
  "FIXTURE",
] as const;

export type AssetTypeKey = (typeof ASSET_TYPES)[number];

/** URL'lerde kullanılan Türkçe slug'lar */
export const ASSET_TYPE_SLUGS: Record<AssetTypeKey, string> = {
  COMPUTER: "bilgisayar",
  SERVER: "sunucu",
  PRINTER: "yazici",
  TABLET: "tablet",
  MOBILE_PHONE: "mobil-telefon",
  SOFTWARE: "yazilim-lisans",
  APPLICATION: "uygulama",
  IP_PHONE: "ip-telefon",
  NETWORK_DEVICE: "router-switch",
  PERIPHERAL: "cevre-birimi",
  FIXTURE: "demirbas",
};

export const SLUG_TO_ASSET_TYPE = Object.fromEntries(
  Object.entries(ASSET_TYPE_SLUGS).map(([key, slug]) => [slug, key as AssetTypeKey]),
) as Record<string, AssetTypeKey>;

export const FORM_FACTORS = ["VIRTUAL", "PHYSICAL", "FIXTURE"] as const;
export type FormFactor = (typeof FORM_FACTORS)[number];

export const FORM_FACTOR_LABELS: Record<FormFactor, string> = {
  VIRTUAL: "Sanal",
  PHYSICAL: "Fiziksel",
  FIXTURE: "Demirbaş",
};

export const CRITICALITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Criticality = (typeof CRITICALITY_LEVELS)[number];

export const CRITICALITY_LABELS: Record<Criticality, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
};

export const CRITICALITY_STYLES: Record<Criticality, string> = {
  LOW: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  MEDIUM: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  HIGH: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
};

export const SUPPORT_STATUSES = ["UNDER_CONTRACT", "IN_WARRANTY", "EXPIRED", "NONE"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  UNDER_CONTRACT: "Sözleşmeli",
  IN_WARRANTY: "Garanti kapsamında",
  EXPIRED: "Süresi dolmuş",
  NONE: "Kapsam dışı",
};

export const LIFECYCLE_STATUSES = ["ACTIVE", "IN_STOCK", "MAINTENANCE", "RETIRED"] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

export const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  ACTIVE: "Kullanımda",
  IN_STOCK: "Depoda",
  MAINTENANCE: "Bakımda",
  RETIRED: "Hurda / Kullanım dışı",
};

export const RELATION_TYPES = ["HOSTED_ON", "DEPENDS_ON", "CONNECTED_TO", "PART_OF"] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

export const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  HOSTED_ON: "Üzerinde çalıştığı",
  DEPENDS_ON: "Bağımlı olduğu",
  CONNECTED_TO: "Bağlı olduğu",
  PART_OF: "Parçası olduğu",
};

/** Bakım/lisans bitişine bu gün sayısından az kaldıysa "yaklaşan" sayılır. */
export const EXPIRY_WARNING_DAYS = 60;

export const APP_ENVIRONMENTS = ["PROD", "TEST", "DEV", "DR"] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];
export const APP_ENVIRONMENT_LABELS: Record<AppEnvironment, string> = {
  PROD: "Üretim",
  TEST: "Test",
  DEV: "Geliştirme",
  DR: "Felaket kurtarma",
};
