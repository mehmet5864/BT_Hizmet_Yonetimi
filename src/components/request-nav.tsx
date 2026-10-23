"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Ticket } from "lucide-react";
import { useState } from "react";

import { requestOfficeTree, type RequestOffice } from "@/lib/itil/request-types";
import { useOfficeNames } from "@/components/office-names-provider";
import { useT } from "@/components/i18n-provider";
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

export function RequestNav({
  onNavigate,
  offices = "ALL",
}: {
  onNavigate?: () => void;
  offices?: RequestOffice[] | "ALL";
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const t = useT();
  const onTalepler = pathname.startsWith("/talepler");
  const ofis = search.get("ofis");
  const grup = search.get("grup");
  const tur = search.get("tur");

  const [openRoot, setOpenRoot] = useState(false);
  const [officeOverrides, setOfficeOverrides] = useState<Record<string, boolean>>({});
  const [groupOverrides, setGroupOverrides] = useState<Record<string, boolean>>({});

  const tree = requestOfficeTree(useOfficeNames());
  const canInbox = (office: RequestOffice) => offices === "ALL" || offices.includes(office);
  const officeHref = (office: RequestOffice, group?: string, typeKey?: string, typeSlug?: string) => {
    if (canInbox(office)) {
      const params = new URLSearchParams({ ofis: office });
      if (group) params.set("grup", group);
      if (typeKey) params.set("tur", typeKey);
      return `/talepler?${params.toString()}`;
    }
    if (typeSlug) return `/talepler/yeni?tur=${typeSlug}`;
    if (group) return `/talepler/yeni?grup=${group}&ofis=${office}`;
    return `/talepler/yeni?ofis=${office}`;
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        <Link
          href="/talepler"
          onClick={onNavigate}
          className={navLinkClass(onTalepler && !ofis && !grup && !tur && pathname === "/talepler", "flex-1")}
        >
          <Ticket className="size-4 shrink-0" />
          {t("nav.requests")}
        </Link>
        <button
          type="button"
          aria-label={openRoot ? t("nav.collapse") : t("nav.expand")}
          aria-expanded={openRoot}
          onClick={() => setOpenRoot((prev) => !prev)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground me-1 rounded-md p-1"
        >
          <ChevronDown className={cn("size-4 transition-transform", !openRoot && "-rotate-90 rtl:rotate-90")} />
        </button>
      </div>

      {openRoot ? (
        <div className="mt-0.5 ms-3 border-s ps-1">
          {tree.map((office) => {
            const officeOpen = officeOverrides[office.office] ?? false;
            const officeActive = onTalepler && ofis === office.office;
            return (
              <div key={office.office} className="flex flex-col">
                <div className="flex items-center">
                  <Link
                    href={officeHref(office.office)}
                    onClick={onNavigate}
                    className={navLinkClass(officeActive && !grup && !tur, "flex-1 py-1 text-[13px]")}
                  >
                    {office.navLabel}
                  </Link>
                  <button
                    type="button"
                    aria-label={`${office.navLabel} alt kırılımları`}
                    aria-expanded={officeOpen}
                    onClick={() =>
                      setOfficeOverrides((prev) => ({
                        ...prev,
                        [office.office]: !(prev[office.office] ?? false),
                      }))
                    }
                    className="text-sidebar-foreground/60 hover:text-sidebar-foreground me-1 rounded-md p-1"
                  >
                    <ChevronDown className={cn("size-3.5 transition-transform", !officeOpen && "-rotate-90 rtl:rotate-90")} />
                  </button>
                </div>

                {officeOpen ? (
                  <div className="ms-3 border-s ps-1">
                    {office.groups.map((group) => {
                      const hasChildren = group.types.length > 1;
                      const groupOpen = groupOverrides[group.slug] ?? false;
                      const groupActive = onTalepler && grup === group.slug;
                      return (
                        <div key={group.slug} className="flex flex-col">
                          <div className="flex items-center">
                            <Link
                              href={officeHref(office.office, group.slug)}
                              onClick={onNavigate}
                              className={navLinkClass(
                                groupActive && !tur,
                                "flex-1 py-1 text-xs",
                              )}
                            >
                              {group.label}
                            </Link>
                            {hasChildren ? (
                              <button
                                type="button"
                                aria-label={`${group.label} türleri`}
                                aria-expanded={groupOpen}
                                onClick={() =>
                                  setGroupOverrides((prev) => ({
                                    ...prev,
                                    [group.slug]: !(prev[group.slug] ?? false),
                                  }))
                                }
                                className="text-sidebar-foreground/60 hover:text-sidebar-foreground me-1 rounded-md p-1"
                              >
                                <ChevronDown
                                  className={cn("size-3.5 transition-transform", !groupOpen && "-rotate-90 rtl:rotate-90")}
                                />
                              </button>
                            ) : null}
                          </div>
                          {hasChildren && groupOpen ? (
                            <div className="ms-3 border-s ps-1">
                              {group.types.map((type) => (
                                <Link
                                  key={type.key}
                                  href={officeHref(office.office, group.slug, type.key, type.slug)}
                                  onClick={onNavigate}
                                  className={navLinkClass(tur === type.key, "py-1 text-xs")}
                                >
                                  {type.label}
                                </Link>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
