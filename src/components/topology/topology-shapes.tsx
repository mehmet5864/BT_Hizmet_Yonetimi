import type { ReactNode } from "react";

import type { TopoShape } from "@/lib/topology/types";

const S = "#334155";

type ShapeDef = { fill: string; body: ReactNode };

/** 64×52 kutusuna çizilen Visio tarzı sade şekiller. */
export const SHAPES: Record<Exclude<TopoShape, "modules">, ShapeDef> = {
  server: {
    fill: "#dbeafe",
    body: (
      <>
        {[2, 18, 34].map((y) => (
          <g key={y}>
            <rect x="4" y={y} width="56" height="14" rx="2" />
            <circle cx="12" cy={y + 7} r="2" fill="#16a34a" stroke="none" />
            <line x1="20" y1={y + 7} x2="52" y2={y + 7} />
          </g>
        ))}
      </>
    ),
  },
  database: {
    fill: "#ede9fe",
    body: (
      <>
        <path d="M10 10v30a22 7 0 0 0 44 0V10" />
        <ellipse cx="32" cy="10" rx="22" ry="7" />
        <path d="M10 22a22 7 0 0 0 44 0M10 32a22 7 0 0 0 44 0" fill="none" />
      </>
    ),
  },
  firewall: {
    fill: "#fee2e2",
    body: (
      <>
        <rect x="5" y="5" width="54" height="42" rx="2" />
        <path d="M5 19h54M5 33h54M20 5v14M44 5v14M32 19v14M12 19v14M52 19v14M20 33v14M44 33v14" fill="none" />
      </>
    ),
  },
  network: {
    fill: "#cffafe",
    body: (
      <>
        <rect x="3" y="14" width="58" height="24" rx="3" />
        {[10, 18, 26, 34, 42, 50].map((x) => (
          <rect key={x} x={x - 2} y="24" width="6" height="8" fill="#ffffff" />
        ))}
        <path d="M14 14V6M50 14V6" fill="none" />
      </>
    ),
  },
  computer: {
    fill: "#e0f2fe",
    body: (
      <>
        <rect x="8" y="3" width="48" height="31" rx="3" />
        <rect x="12" y="7" width="40" height="23" fill="#ffffff" />
        <path d="M32 34v8M20 44h24" fill="none" />
      </>
    ),
  },
  printer: {
    fill: "#f1f5f9",
    body: (
      <>
        <rect x="16" y="4" width="32" height="14" fill="#ffffff" />
        <rect x="6" y="18" width="52" height="22" rx="3" />
        <rect x="16" y="32" width="32" height="14" fill="#ffffff" />
      </>
    ),
  },
  tablet: {
    fill: "#e0f2fe",
    body: (
      <>
        <rect x="14" y="2" width="36" height="48" rx="4" />
        <rect x="18" y="7" width="28" height="35" fill="#ffffff" />
        <circle cx="32" cy="46" r="1.8" />
      </>
    ),
  },
  phone: {
    fill: "#e0f2fe",
    body: (
      <>
        <rect x="21" y="2" width="22" height="48" rx="4" />
        <rect x="24" y="8" width="16" height="32" fill="#ffffff" />
        <circle cx="32" cy="45" r="1.8" />
      </>
    ),
  },
  ipphone: {
    fill: "#e0e7ff",
    body: (
      <>
        <rect x="4" y="10" width="56" height="9" rx="4" />
        <rect x="6" y="19" width="52" height="27" rx="3" />
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={38 + c * 7} cy={26 + r * 6} r="1.6" fill={S} stroke="none" />),
        )}
        <rect x="10" y="24" width="16" height="10" fill="#ffffff" />
      </>
    ),
  },
  application: {
    fill: "#fef9c3",
    body: (
      <>
        <rect x="4" y="5" width="56" height="42" rx="4" />
        <path d="M4 16h56" fill="none" />
        <circle cx="10" cy="10.5" r="1.6" fill="#ef4444" stroke="none" />
        <circle cx="16" cy="10.5" r="1.6" fill="#f59e0b" stroke="none" />
        <circle cx="22" cy="10.5" r="1.6" fill="#22c55e" stroke="none" />
        <path d="M10 24h30M10 31h40M10 38h22" fill="none" />
      </>
    ),
  },
  software: {
    fill: "#fae8ff",
    body: (
      <>
        <circle cx="32" cy="26" r="21" />
        <circle cx="32" cy="26" r="6" fill="#ffffff" />
        <path d="M32 5v8" fill="none" />
      </>
    ),
  },
  antivirus: {
    fill: "#dcfce7",
    body: (
      <>
        <path d="M32 2 56 11v15c0 13-10 21-24 25C18 47 8 39 8 26V11Z" />
        <path d="m21 26 8 8 15-16" fill="none" strokeWidth="3" />
      </>
    ),
  },
  peripheral: {
    fill: "#f1f5f9",
    body: (
      <>
        <rect x="19" y="4" width="26" height="44" rx="13" />
        <path d="M32 4v18M19 22h26" fill="none" />
      </>
    ),
  },
  fixture: {
    fill: "#f5f5f4",
    body: (
      <>
        <path d="M8 18 20 6h36L44 18Z" />
        <rect x="8" y="18" width="36" height="28" />
        <path d="M44 18 56 6v28L44 46Z" />
      </>
    ),
  },
  person: {
    fill: "#fde68a",
    body: (
      <>
        <circle cx="32" cy="14" r="10" />
        <path d="M10 49c0-17 44-17 44 0Z" />
      </>
    ),
  },
  department: {
    fill: "#e2e8f0",
    body: (
      <>
        <rect x="14" y="3" width="36" height="46" />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={19 + c * 10} y={8 + r * 8} width="5" height="5" fill="#ffffff" />),
        )}
        <rect x="28" y="40" width="8" height="9" fill="#ffffff" />
      </>
    ),
  },
  vendor: {
    fill: "#fed7aa",
    body: (
      <>
        <rect x="8" y="14" width="48" height="35" />
        <path d="M8 14 32 3l24 11" />
        <rect x="26" y="32" width="12" height="17" fill="#ffffff" />
        <rect x="13" y="22" width="8" height="8" fill="#ffffff" />
        <rect x="43" y="22" width="8" height="8" fill="#ffffff" />
      </>
    ),
  },
  role: {
    fill: "#fef3c7",
    body: (
      <>
        <path d="M32 2 56 11v15c0 13-10 21-24 25C18 47 8 39 8 26V11Z" />
        <path d="m32 15 3.8 8 8.7 1-6.4 6 1.7 8.6L32 34.2 24.2 38.6l1.7-8.6-6.4-6 8.7-1Z" fill={S} stroke="none" />
      </>
    ),
  },
  group: {
    fill: "#fde68a",
    body: (
      <>
        <circle cx="18" cy="16" r="7" />
        <circle cx="46" cy="16" r="7" />
        <path d="M3 40c0-13 26-13 26 0ZM35 40c0-13 26-13 26 0Z" />
        <circle cx="32" cy="22" r="8" />
        <path d="M14 50c0-15 36-15 36 0Z" />
      </>
    ),
  },
  os: {
    fill: "#e2e8f0",
    body: (
      <>
        <rect x="6" y="4" width="52" height="40" rx="4" />
        <rect x="12" y="10" width="19" height="13" fill="#bfdbfe" />
        <rect x="33" y="10" width="19" height="13" fill="#bfdbfe" />
        <rect x="12" y="25" width="19" height="13" fill="#bfdbfe" />
        <rect x="33" y="25" width="19" height="13" fill="#bfdbfe" />
        <path d="M22 48h20" fill="none" />
      </>
    ),
  },
  storage: {
    fill: "#fef3c7",
    body: (
      <>
        {[4, 20, 36].map((y) => (
          <g key={y}>
            <rect x="6" y={y} width="52" height="12" rx="2" />
            <circle cx="14" cy={y + 6} r="2" fill="#d97706" stroke="none" />
            <line x1="24" y1={y + 6} x2="50" y2={y + 6} />
          </g>
        ))}
      </>
    ),
  },
  location: {
    fill: "#e2e8f0",
    body: (
      <>
        <path d="M32 50C18 34 12 27 12 19a20 17 0 0 1 40 0c0 8-6 15-20 31Z" />
        <circle cx="32" cy="19" r="6" fill="#ffffff" />
      </>
    ),
  },
};

export function ShapeIcon({ shape }: { shape: Exclude<TopoShape, "modules"> }) {
  const def = SHAPES[shape] ?? SHAPES.fixture;
  return (
    <g fill={def.fill} stroke={S} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round">
      {def.body}
    </g>
  );
}

export const SHAPE_LEGEND: { shape: Exclude<TopoShape, "modules">; label: string }[] = [
  { shape: "person", label: "Kişi" },
  { shape: "department", label: "Birim" },
  { shape: "role", label: "Rol" },
  { shape: "group", label: "AD grubu" },
  { shape: "firewall", label: "Güvenlik duvarı" },
  { shape: "network", label: "Ağ cihazı" },
  { shape: "server", label: "Sunucu" },
  { shape: "database", label: "Veritabanı" },
  { shape: "storage", label: "Depolama / SAN" },
  { shape: "application", label: "Uygulama" },
  { shape: "antivirus", label: "Antivirüs / EDR" },
  { shape: "software", label: "Yazılım / lisans" },
  { shape: "computer", label: "Bilgisayar" },
  { shape: "os", label: "İşletim sistemi" },
  { shape: "vendor", label: "Firma" },
  { shape: "location", label: "Konum" },
];
