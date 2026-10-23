import type { JSX } from "react";

import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

function TrFlag() {
  return (
    <svg viewBox="0 0 1200 800" className="size-full" aria-hidden>
      <rect width="1200" height="800" fill="#E30A17" />
      <circle cx="425" cy="400" r="200" fill="#fff" />
      <circle cx="475" cy="400" r="160" fill="#E30A17" />
      <polygon
        fill="#fff"
        points="630.0,330.0 646.5,377.3 696.6,378.4 656.6,408.7 671.1,456.6 630.0,428.0 588.9,456.6 603.4,408.7 563.4,378.4 613.5,377.3"
      />
    </svg>
  );
}

function GbFlag() {
  return (
    <svg viewBox="0 0 60 40" className="size-full" aria-hidden>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" strokeWidth="5" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  );
}

function SaFlag() {
  return (
    <svg viewBox="0 0 750 500" className="size-full" aria-hidden>
      <rect width="750" height="500" fill="#165d31" />
      <text
        x="375"
        y="190"
        textAnchor="middle"
        fill="#fff"
        fontSize="52"
        fontWeight="700"
        style={{ fontFamily: "var(--font-arabic), Tahoma, serif" }}
      >
        لا إله إلا الله
      </text>
      <text
        x="375"
        y="258"
        textAnchor="middle"
        fill="#fff"
        fontSize="46"
        fontWeight="700"
        style={{ fontFamily: "var(--font-arabic), Tahoma, serif" }}
      >
        محمد رسول الله
      </text>
      <path
        fill="#fff"
        d="M96 348h470c8 0 14 6 14 14s-6 14-14 14H178l-22 48h-28l22-48H96c-8 0-14-6-14-14s6-14 14-14z"
      />
      <path
        fill="#fff"
        d="M566 336c22 0 40 14 40 32s-18 32-40 32c-10 0-18-3-24-8l8-12c4 3 10 5 16 5 12 0 22-8 22-17s-10-17-22-17c-6 0-12 2-16 5l-8-12c6-5 14-8 24-8z"
      />
    </svg>
  );
}

function EsFlag() {
  return (
    <svg viewBox="0 0 750 500" className="size-full" aria-hidden>
      <rect width="750" height="500" fill="#AA151B" />
      <rect y="125" width="750" height="250" fill="#F1BF00" />
      <g transform="translate(168 168)">
        <rect x="-36" y="28" width="12" height="132" rx="2" fill="#C4A35A" />
        <rect x="174" y="28" width="12" height="132" rx="2" fill="#C4A35A" />
        <circle cx="-30" cy="24" r="10" fill="#C4A35A" />
        <circle cx="180" cy="24" r="10" fill="#C4A35A" />
        <rect x="-48" y="70" width="36" height="10" rx="2" fill="#AA151B" />
        <rect x="162" y="70" width="36" height="10" rx="2" fill="#AA151B" />
        <path
          d="M18 18h114c6 0 10 4 10 10v78c0 36-57 62-67 68-10-6-67-32-67-68V28c0-6 4-10 10-10z"
          fill="#F4E7C3"
          stroke="#7A1F16"
          strokeWidth="4"
        />
        <path d="M20 30h54v48H20z" fill="#AA151B" />
        <path fill="#F1BF00" d="M38 40h18v8H48v6h8v8h-8v10h-10V62h-8v-8h8v-6h-8z" />
        <path d="M74 30h54v48H74z" fill="#F4E7C3" />
        <path fill="#8B1E6D" d="M92 38c10-8 28-2 28 14 0 16-10 24-20 32-10-8-20-16-20-32 0-8 4-14 12-14z" />
        <path d="M20 78h54v48H20z" fill="#F1BF00" />
        <path stroke="#AA151B" strokeWidth="7" d="M20 90h54M20 106h54M20 122h54" />
        <path d="M74 78h54v48H74z" fill="#AA151B" />
        <path fill="none" stroke="#F1BF00" strokeWidth="3" d="M86 90h30M86 106h30M86 122h30M101 82v40" />
        <path fill="#AA151B" d="M64 126c8 10 22 10 30 0v8c-10 12-20 12-30 0z" />
        <path fill="#F1BF00" d="M70 8h20l6 12H64z" />
        <path fill="#AA151B" d="M74 2h12v10H74z" />
      </g>
    </svg>
  );
}

function AzFlag() {
  return (
    <svg viewBox="0 0 1200 600" className="size-full" aria-hidden>
      <rect width="1200" height="200" fill="#00B5E2" />
      <rect y="200" width="1200" height="200" fill="#EF3340" />
      <rect y="400" width="1200" height="200" fill="#509E2F" />
      <circle cx="560" cy="300" r="72" fill="#fff" />
      <circle cx="582" cy="300" r="58" fill="#EF3340" />
      <polygon
        fill="#fff"
        points="690.0,258.0 696.9,283.4 719.7,270.3 706.6,293.1 732.0,300.0 706.6,306.9 719.7,329.7 696.9,316.6 690.0,342.0 683.1,316.6 660.3,329.7 673.4,306.9 648.0,300.0 673.4,293.1 660.3,270.3 683.1,283.4"
      />
    </svg>
  );
}

const FLAGS: Record<Locale, () => JSX.Element> = {
  tr: TrFlag,
  en: GbFlag,
  ar: SaFlag,
  es: EsFlag,
  az: AzFlag,
};

export function FlagMark({ code, className }: { code: Locale; className?: string }) {
  const Svg = FLAGS[code];
  return (
    <span
      dir="ltr"
      className={cn(
        "relative inline-flex h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/20",
        className,
      )}
    >
      <Svg />
    </span>
  );
}
