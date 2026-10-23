"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  BookMarked,
  BookOpen,
  Bug,
  Building2,
  ChevronDown,
  ClipboardList,
  Gauge,
  Layers,
  LifeBuoy,
  ShieldAlert,
  Workflow,
  Wrench,
} from "lucide-react";
import { Suspense, useState } from "react";

import { InventoryNav } from "@/components/inventory-nav";

import { useT } from "@/components/i18n-provider";
import { ITIL_PROCESSES } from "@/lib/itil/processes";
import { cn } from "@/lib/utils";

function navLinkClass(active: boolean, extra?: string) {
  return cn(
    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
    extra,
  );
}

const PROCESS_ICON: Record<string, typeof BookOpen> = {
  DESIGN: Layers,
  SLA: Gauge,
  AVAILABILITY: Activity,
  CAPACITY: Gauge,
  CONTINUITY: LifeBuoy,
  VALIDATION: ClipboardList,
  RELEASE: Workflow,
  MONITORING: Activity,
  EVALUATION: BookOpen,
};

export function ItilProcessNav({
  onNavigate,
  canCatalog,
  canProcess,
  canOps,
  canInventory = false,
  inventoryAdmin = false,
}: {
  onNavigate?: () => void;
  canCatalog: boolean;
  canProcess: boolean;
  canOps: (href: string) => boolean;
  canInventory?: boolean;
  inventoryAdmin?: boolean;
}) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(() => pathname.startsWith("/envanter") || pathname.startsWith("/surec") || pathname.startsWith("/hizmetler") || pathname.startsWith("/katalog"));

  const tasarim = ITIL_PROCESSES.filter((item) => item.group === "tasarim");
  const opsExtra = ITIL_PROCESSES.filter((item) => item.group === "operasyon");
  const gecis = ITIL_PROCESSES.filter((item) => item.group === "gecis");
  const evals = ITIL_PROCESSES.filter((item) => item.group === "degerlendirme");

  if (!canCatalog && !canProcess && !canOps("/olay") && !canInventory) return null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Link href="/hizmetler" onClick={onNavigate} className={navLinkClass(pathname.startsWith("/hizmetler"), "flex-1")}>
          <ClipboardList className="size-4 shrink-0" />
          {t("nav.itil")}
        </Link>
        <button
          type="button"
          aria-label={open ? t("nav.collapse") : t("nav.expand")}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground me-1 rounded-md p-1"
        >
          <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90 rtl:rotate-90")} />
        </button>
      </div>
      {open ? (
        <div className="mt-0.5 ms-3 space-y-2 border-s ps-1">
          {canCatalog ? (
            <Link href="/katalog" onClick={onNavigate} className={navLinkClass(pathname.startsWith("/katalog"), "py-1.5 text-[13px]")}>
              <BookOpen className="size-4 shrink-0" />
              {t("nav.catalog")}
            </Link>
          ) : null}
          {canProcess ? (
            <NavGroup title={t("nav.design")}>
              {tasarim.map((item) => (
                <ProcessLink key={item.key} href={item.href} label={t(`itil.${item.key}.label`)} active={pathname.startsWith(item.href)} onNavigate={onNavigate} icon={PROCESS_ICON[item.key]} />
              ))}
            </NavGroup>
          ) : null}
          <NavGroup title={t("nav.operations")}>
            {canOps("/talepler") ? (
              <ProcessLink href="/talepler" label={t("nav.desk")} active={pathname.startsWith("/talepler")} onNavigate={onNavigate} icon={LifeBuoy} />
            ) : null}
            {canOps("/olay") ? (
              <ProcessLink href="/olay" label={t("nav.incidents")} active={pathname.startsWith("/olay")} onNavigate={onNavigate} icon={AlertTriangle} />
            ) : null}
            {canOps("/problem") ? (
              <ProcessLink href="/problem" label={t("nav.problems")} active={pathname.startsWith("/problem")} onNavigate={onNavigate} icon={Bug} />
            ) : null}
            {canOps("/hizmetler") ? (
              <ProcessLink href="/hizmetler/bilgi" label="Bilgi bankası" active={pathname.startsWith("/hizmetler/bilgi")} onNavigate={onNavigate} icon={BookOpen} />
            ) : null}
            {canOps("/hizmetler") ? (
              <ProcessLink href="/hizmetler/akis" label="Süreç akışları" active={pathname.startsWith("/hizmetler/akis")} onNavigate={onNavigate} icon={Workflow} />
            ) : null}
            {canProcess
              ? opsExtra.map((item) => (
                  <ProcessLink key={item.key} href={item.href} label={t(`itil.${item.key}.label`)} active={pathname.startsWith(item.href)} onNavigate={onNavigate} icon={PROCESS_ICON[item.key]} />
                ))
              : null}
          </NavGroup>
          <NavGroup title={t("nav.transition")}>
            {canOps("/degisiklik") ? (
              <ProcessLink href="/degisiklik" label={t("nav.changeEnablement")} active={pathname.startsWith("/degisiklik")} onNavigate={onNavigate} icon={Workflow} />
            ) : null}
            {canProcess
              ? gecis.map((item) => (
                  <ProcessLink key={item.key} href={item.href} label={t(`itil.${item.key}.label`)} active={pathname.startsWith(item.href)} onNavigate={onNavigate} icon={PROCESS_ICON[item.key]} />
                ))
              : null}
            {canOps("/yama") ? (
              <ProcessLink href="/yama" label={t("nav.patches")} active={pathname.startsWith("/yama")} onNavigate={onNavigate} icon={Wrench} />
            ) : null}
          </NavGroup>
          <NavGroup title={t("nav.assets")}>
            {canInventory ? (
              <Suspense fallback={<div className="text-sidebar-foreground/60 px-3 py-2 text-sm">{t("nav.inventory")}</div>}>
                <InventoryNav onNavigate={onNavigate} showApprovals={inventoryAdmin} />
              </Suspense>
            ) : null}
            {canOps("/konfigurasyon") ? (
              <ProcessLink href="/konfigurasyon" label={t("nav.config")} active={pathname.startsWith("/konfigurasyon")} onNavigate={onNavigate} icon={BookMarked} />
            ) : null}
            {canOps("/zafiyet") ? (
              <ProcessLink href="/zafiyet" label={t("nav.vulns")} active={pathname.startsWith("/zafiyet")} onNavigate={onNavigate} icon={ShieldAlert} />
            ) : null}
            {canOps("/firma-sla") ? (
              <ProcessLink href="/firma-sla" label={t("nav.vendorSla")} active={pathname.startsWith("/firma-sla")} onNavigate={onNavigate} icon={Building2} />
            ) : null}
          </NavGroup>
          {canProcess ? (
            <NavGroup title={t("nav.evaluation")}>
              {evals.map((item) => (
                <ProcessLink key={item.key} href={item.href} label={t(`itil.${item.key}.label`)} active={pathname.startsWith(item.href)} onNavigate={onNavigate} icon={PROCESS_ICON[item.key]} />
              ))}
            </NavGroup>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sidebar-foreground/45 px-3 pt-1 text-[10px] font-semibold tracking-wide uppercase">{title}</p>
      {children}
    </div>
  );
}

function ProcessLink({
  href,
  label,
  active,
  onNavigate,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  icon: typeof BookOpen;
}) {
  return (
    <Link href={href} onClick={onNavigate} className={navLinkClass(active, "py-1.5 text-[13px]")}>
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}
