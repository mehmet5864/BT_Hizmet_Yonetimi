export const UNIT_TYPES = [
  "BIRIM_SEFLIGI",
  "SUBE_MUDURLUGU",
  "DAIRE_BASKANLIGI",
  "GENEL_MUDURLUK",
  "BAKAN_YARDIMCILIGI",
  "OZEL_KALEM",
  "BASKANLIK",
  "BAKANLIK",
] as const;
export type UnitType = (typeof UNIT_TYPES)[number];

export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  BIRIM_SEFLIGI: "Birim Şefliği",
  SUBE_MUDURLUGU: "Şube Müdürlüğü",
  DAIRE_BASKANLIGI: "Daire Başkanlığı",
  GENEL_MUDURLUK: "Genel Müdürlük",
  BAKAN_YARDIMCILIGI: "Bakan Yardımcılığı",
  OZEL_KALEM: "Özel Kalem",
  BASKANLIK: "Başkanlık",
  BAKANLIK: "Bakanlık",
};

export const isUnitType = (v: string | null | undefined): v is UnitType =>
  !!v && (UNIT_TYPES as readonly string[]).includes(v);
