"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BookMarked,
  BookOpen,
  ClipboardList,
  Printer,
  Code2,
  Bug,
  KanbanSquare,
  FileBarChart,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldAlert,
  Workflow,
  Wrench,
  Building2,
} from "lucide-react";
import { Suspense, useState } from "react";

import { BackButton } from "@/components/back-button";
import { BrandLogo } from "@/components/brand-logo";
import { HeaderSearch } from "@/components/header-search";
import { InventoryNav } from "@/components/inventory-nav";
import { PersonnelNav } from "@/components/personnel-nav";
import { InboxDrawer } from "@/components/inbox-drawer";
import { OfficeNamesProvider } from "@/components/office-names-provider";
import type { InboxSnapshot } from "@/lib/inbox";
import { RequestNav } from "@/components/request-nav";
import { ItilProcessNav } from "@/components/itil-process-nav";
import { canUseTopology } from "@/lib/topology/access";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { logout } from "@/lib/actions/auth";
import { APP_VERSION } from "@/lib/app-version";
import { moduleForPath, type AppModule } from "@/lib/auth/rbac";
import type { SessionUser } from "@/lib/auth/session";
import type { RequestOffice } from "@/lib/itil/request-types";
import type { OfficeNames } from "@/lib/itil/office-names";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/components/i18n-provider";

const NAV_BEFORE = [{ href: "/", labelKey: "nav.dashboard" as const, icon: LayoutDashboard }];

const NAV_AFTER = [
  { href: "/degisiklik", labelKey: "nav.changes" as const, icon: Workflow },
  { href: "/yama", labelKey: "nav.patches" as const, icon: Wrench },
  { href: "/konfigurasyon", labelKey: "nav.config" as const, icon: BookMarked },
  { href: "/zafiyet", labelKey: "nav.vulns" as const, icon: ShieldAlert },
  { href: "/firma-sla", labelKey: "nav.vendorSla" as const, icon: Building2 },
  { href: "/olay", labelKey: "nav.incidents" as const, icon: AlertTriangle },
  { href: "/problem", labelKey: "nav.problems" as const, icon: Bug },
  { href: "/cevik", labelKey: "nav.agile" as const, icon: KanbanSquare },
];

const NAV_FOOTER = [
  { href: "/ayarlar", labelKey: "nav.settings" as const, icon: Settings },
  { href: "/raporlar", labelKey: "nav.reports" as const, icon: FileBarChart },
  { href: "/api-arayuzu", labelKey: "nav.api" as const, icon: Code2 },
  { href: "/kilavuzlar", labelKey: "nav.guides" as const, icon: BookOpen },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`;
  return letters.toUpperCase() || "?";
}

function firstName(name: string) {
  return name.trim().split(/\s+/).filter(Boolean)[0] ?? name;
}

function roleSourceLabel(source: SessionUser["roleSource"], t: (key: string) => string) {
  if (source === "AD") return t("header.roleAd");
  if (source === "BOTH") return t("header.roleBoth");
  return t("header.roleManual");
}

function roleName(role: string, t: (key: string) => string) {
  const label = t(`roles.${role}`);
  return label === `roles.${role}` ? role : label;
}

function NavContent({
  onNavigate,
  role,
  requestOffices = "ALL",
  allowedModules,
  inventoryAdmin = false,
  itilV2 = true,
}: {
  onNavigate?: () => void;
  role?: string;
  requestOffices?: RequestOffice[] | "ALL";
  allowedModules?: AppModule[];
  inventoryAdmin?: boolean;
  itilV2?: boolean;
}) {
  const pathname = usePathname();
  const { t } = useI18n();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const visible = (href: string) => {
    if (allowedModules) {
      const mod = moduleForPath(href);
      return !mod || allowedModules.includes(mod);
    }
    return true;
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-3">
        <Link href="/" onClick={onNavigate} className="px-1">
          <BrandLogo />
        </Link>

        <nav className="flex flex-col gap-0.5">
          {NAV_BEFORE.filter((item) => visible(item.href)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {t(item.labelKey)}
            </Link>
          ))}
          {visible("/personel") || visible("/personel/hareketler") ? (
            <PersonnelNav onNavigate={onNavigate} canManage={visible("/personel")} />
          ) : null}
          {!itilV2 && visible("/envanter") ? (
            <Suspense fallback={<div className="text-sidebar-foreground/60 px-3 py-2 text-sm">{t("nav.inventory")}</div>}>
              <InventoryNav onNavigate={onNavigate} showApprovals={inventoryAdmin} />
            </Suspense>
          ) : null}
          {!itilV2 && visible("/talepler") ? (
            <Suspense fallback={<div className="text-sidebar-foreground/60 px-3 py-2 text-sm">{t("nav.requests")}</div>}>
              <RequestNav onNavigate={onNavigate} offices={requestOffices} />
            </Suspense>
          ) : null}
          {itilV2 ? (
            <ItilProcessNav
              onNavigate={onNavigate}
              canCatalog={visible("/katalog")}
              canProcess={visible("/surec")}
              canOps={visible}
              canInventory={visible("/envanter")}
              inventoryAdmin={inventoryAdmin}
              canTopology={canUseTopology(role) && visible("/hizmetler")}
            />
          ) : (
            NAV_AFTER.filter((item) => visible(item.href)).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {t(item.labelKey)}
              </Link>
            ))
          )}
          {itilV2 && visible("/cevik") ? (
            <Link
              href="/cevik"
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive("/cevik")
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
              )}
            >
              <KanbanSquare className="size-4" />
              {t("nav.agile")}
            </Link>
          ) : null}
        </nav>
      </div>

      {NAV_FOOTER.some((item) => visible(item.href)) ? (
        <div className="border-sidebar-border mt-auto shrink-0 border-t pt-3">
          {NAV_FOOTER.filter((item) => visible(item.href)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive(item.href)
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4" />
              {t(item.labelKey)}
            </Link>
          ))}
          <p className="text-sidebar-foreground/45 px-3 pt-2 text-[11px]">{t("nav.version", { version: APP_VERSION })}</p>
        </div>
      ) : (
        <p className="text-sidebar-foreground/45 mt-auto px-3 pt-3 text-[11px]">{t("nav.version", { version: APP_VERSION })}</p>
      )}
    </div>
  );
}

/** ITIL formları ve kayıt sayfaları: üst çubukta "Yazdır" düğmesi gösterilir. */
const PRINTABLE_PREFIXES = ["/talepler", "/olay", "/problem", "/degisiklik", "/yama", "/konfigurasyon", "/zafiyet", "/firma-sla", "/surec", "/cevik", "/katalog"];

function UserBar({
  user,
  menu,
  inbox,
}: {
  user: SessionUser;
  menu?: React.ReactNode;
  inbox: InboxSnapshot;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const printable = PRINTABLE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  return (
    <header className="app-header sticky top-0 z-30 flex h-16 items-center justify-between gap-3 overflow-visible px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {menu}
        <BackButton />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold sm:text-base">
            {t("header.welcome", { name: firstName(user.fullName) })}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {user.title ?? roleName(user.role, t)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {printable ? (
          <Button type="button" variant="ghost" size="icon" title="Yazdır" aria-label="Yazdır" onClick={() => window.print()}>
            <Printer className="size-4" />
          </Button>
        ) : null}
        <HeaderSearch />
        <InboxDrawer inbox={inbox} />
        <LanguageSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted flex items-center gap-2 rounded-full p-0.5 pe-1.5 transition-colors"
              aria-label={t("header.account")}
            >
              <Avatar size="default">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials(user.fullName)}
                </AvatarFallback>
              </Avatar>
              <span className="hidden max-w-36 truncate text-start text-sm font-medium xl:block">
                {user.fullName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <p className="truncate font-medium">{user.fullName}</p>
              <p className="text-muted-foreground truncate text-xs font-normal">
                {roleName(user.role, t)} · {roleSourceLabel(user.roleSource, t)}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profilim">
                <ClipboardList className="size-4" />
                Çalışma özetim
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                const form = document.getElementById("app-logout-form");
                if (form instanceof HTMLFormElement) form.requestSubmit();
              }}
            >
              <LogOut className="size-4" />
              {t("header.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <form id="app-logout-form" action={logout} hidden />
      </div>
    </header>
  );
}

export function AppShell({
  children,
  user,
  requestOffices = "ALL",
  allowedModules,
  inventoryAdmin = false,
  inbox = { items: [], approvalCount: 0, assignedCount: 0, waitingCount: 0 },
  officeNames,
  itilV2 = true,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
  requestOffices?: RequestOffice[] | "ALL";
  allowedModules?: AppModule[];
  inventoryAdmin?: boolean;
  inbox?: InboxSnapshot;
  officeNames?: OfficeNames;
  itilV2?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { t, dir } = useI18n();

  if (pathname === "/giris") {
    return <>{children}</>;
  }

  return (
    <OfficeNamesProvider names={officeNames}>
    <div className="flex min-h-svh">
      <aside className="app-sidebar text-sidebar-foreground hidden w-72 shrink-0 border-e border-transparent p-4 lg:block">
        <div className="sticky top-4 h-[calc(100svh-2rem)]">
          <NavContent
            role={user?.role}
            requestOffices={requestOffices}
            allowedModules={allowedModules}
            inventoryAdmin={inventoryAdmin}
            itilV2={itilV2}
          />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {user ? (
          <UserBar
            user={user}
            inbox={inbox}
            menu={
              <div className="lg:hidden">
                <Sheet open={open} onOpenChange={setOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={t("header.menu")}>
                      <Menu className="size-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side={dir === "rtl" ? "right" : "left"}
                    className="bg-sidebar text-sidebar-foreground flex h-full w-72 flex-col border-transparent p-4"
                  >
                    <SheetHeader className="sr-only">
                      <SheetTitle>{t("header.menu")}</SheetTitle>
                    </SheetHeader>
                    <NavContent
                      role={user.role}
                      requestOffices={requestOffices}
                      allowedModules={allowedModules}
                      inventoryAdmin={inventoryAdmin}
                      itilV2={itilV2}
                      onNavigate={() => setOpen(false)}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            }
          />
        ) : null}
        <main className="app-canvas min-w-0 flex-1">
          <p className="print-only border-b px-6 py-3 text-sm" suppressHydrationWarning>
            BT Hizmet Yönetimi · {pathname} · {new Date().toLocaleString("tr-TR")}
            {user ? ` · ${user.fullName}` : ""}
          </p>
          {children}
        </main>
      </div>
    </div>
    </OfficeNamesProvider>
  );
}
