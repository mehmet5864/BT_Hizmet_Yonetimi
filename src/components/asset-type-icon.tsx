import {
  AppWindow,
  Layers,
  Keyboard,
  Monitor,
  Network,
  Package,
  Phone,
  Printer,
  Server,
  Smartphone,
  Tablet,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  AppWindow,
  Layers,
  Keyboard,
  Monitor,
  Network,
  Package,
  Phone,
  Printer,
  Server,
  Smartphone,
  Tablet,
};

export function AssetTypeIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Package;
  return <Icon className={className} />;
}
