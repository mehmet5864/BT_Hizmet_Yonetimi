export const AUDIENCE_KINDS = ["CLIENT", "ADMIN", "PARTNER", "OTHER"] as const;
export type AudienceKind = (typeof AUDIENCE_KINDS)[number];

export const AUDIENCE_KIND_LABELS: Record<AudienceKind, string> = {
  CLIENT: "İstemci / son kullanıcı",
  ADMIN: "Yönetici",
  PARTNER: "Tedarikçi / dış erişim",
  OTHER: "Diğer",
};

export const AUDIENCE_KIND_COLORS: Record<AudienceKind, string> = {
  CLIENT: "#16a34a",
  ADMIN: "#dc2626",
  PARTNER: "#ea580c",
  OTHER: "#2563eb",
};

export function isAudienceKind(value: string | null | undefined): value is AudienceKind {
  return !!value && (AUDIENCE_KINDS as readonly string[]).includes(value);
}

export type TopoShape =
  | "person"
  | "department"
  | "role"
  | "group"
  | "modules"
  | "vendor"
  | "server"
  | "database"
  | "firewall"
  | "network"
  | "computer"
  | "printer"
  | "tablet"
  | "phone"
  | "ipphone"
  | "application"
  | "software"
  | "antivirus"
  | "peripheral"
  | "fixture"
  | "location"
  | "storage"
  | "os";

export type TopoNode = {
  id: string;
  shape: TopoShape;
  label: string;
  sub?: string;
  /** Soldan sağa sütun numarası */
  col: number;
  /** Aynı sütun içinde gruplama/sıralama anahtarı */
  order?: string;
  /** Kritiklik: HIGH | MEDIUM | LOW */
  criticality?: string;
  dimmed?: boolean;
  focus?: boolean;
  vulnCount?: number;
  /** modules kartı için satırlar */
  lines?: string[];
  meta?: [string, string][];
  href?: string;
  /** Bu nesnenin bağlantılarını düzenleme bağlantısı */
  editHref?: string;
};

export type TopoEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  color?: string;
  dashed?: boolean;
};

export type TopoGraph = {
  nodes: TopoNode[];
  edges: TopoEdge[];
  note?: string;
  columnTitles?: string[];
};
