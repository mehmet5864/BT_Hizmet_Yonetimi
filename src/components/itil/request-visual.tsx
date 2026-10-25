import {
  Activity,
  Bug,
  Cloud,
  Code,
  Database,
  FileSearch,
  GitBranch,
  Globe,
  HardDrive,
  KeyRound,
  Layers,
  LifeBuoy,
  Lock,
  Mail,
  Monitor,
  Network,
  Server,
  Shield,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import type { RequestOffice } from "@/lib/itil/request-types";

export const OFFICE_STYLE: Record<RequestOffice, { icon: string; border: string; bar: string; soft: string }> = {
  SISTEM: { icon: "bg-blue-500/15 text-blue-600 dark:text-blue-300", border: "border-l-blue-500", bar: "bg-blue-500", soft: "bg-blue-500/5" },
  NETWORK: { icon: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300", border: "border-l-cyan-500", bar: "bg-cyan-500", soft: "bg-cyan-500/5" },
  SIBER: { icon: "bg-rose-500/15 text-rose-600 dark:text-rose-300", border: "border-l-rose-500", bar: "bg-rose-500", soft: "bg-rose-500/5" },
  YAZILIM: { icon: "bg-violet-500/15 text-violet-600 dark:text-violet-300", border: "border-l-violet-500", bar: "bg-violet-500", soft: "bg-violet-500/5" },
  VERITABANI: { icon: "bg-amber-500/15 text-amber-600 dark:text-amber-300", border: "border-l-amber-500", bar: "bg-amber-500", soft: "bg-amber-500/5" },
  SERVIS: { icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", border: "border-l-emerald-500", bar: "bg-emerald-500", soft: "bg-emerald-500/5" },
};

const OFFICE_ICON: Record<RequestOffice, LucideIcon> = {
  SISTEM: Server,
  NETWORK: Network,
  SIBER: Shield,
  YAZILIM: Code,
  VERITABANI: Database,
  SERVIS: LifeBuoy,
};

const CATEGORY_ICON: Record<string, LucideIcon> = {
  "Güvenlik duvarı": Shield,
  "DNS / VPN": Globe,
  "NAC istisna": Lock,
  "AD grup ve yetki": Users,
  "Uygulama güvenliği": Shield,
  "Yük dengeleme": Layers,
  "SIEM / Log": Activity,
  "Ayrıcalıklı erişim": KeyRound,
  Zafiyet: Bug,
  "Güvenlik testi": Bug,
  "Adli bilişim": FileSearch,
  Yedekleme: HardDrive,
  "Yedek ve kurtarma": HardDrive,
  Depolama: HardDrive,
  "Mail relay": Mail,
  "E-posta": Mail,
  Sanallaştırma: Cloud,
  "Sunucu işlemleri": Server,
  Kablosuz: Wifi,
  "Uç nokta yönetimi": Monitor,
  "Kaynak kod": GitBranch,
  "CI / CD": GitBranch,
};

export function categoryIcon(group: string, office: RequestOffice): LucideIcon {
  return CATEGORY_ICON[group] ?? OFFICE_ICON[office];
}

export function officeIcon(office: RequestOffice): LucideIcon {
  return OFFICE_ICON[office];
}
