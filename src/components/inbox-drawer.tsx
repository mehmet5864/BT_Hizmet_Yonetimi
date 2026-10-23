"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Inbox, X } from "lucide-react";

import { useT } from "@/components/i18n-provider";
import { ApproveRejectForm } from "@/components/itil/approve-reject-form";
import { StatusBadge } from "@/components/itil/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/inventory/format";
import type { InboxApproveKind, InboxItem, InboxSection, InboxSnapshot } from "@/lib/inbox";

const SECTION_KEYS: { key: InboxSection; titleKey: "inbox.approvals" | "inbox.assigned" | "inbox.waiting" }[] = [
  { key: "approval", titleKey: "inbox.approvals" },
  { key: "assigned", titleKey: "inbox.assigned" },
  { key: "waiting", titleKey: "inbox.waiting" },
];

function ApproveButton({ id, kind }: { id: string; kind: InboxApproveKind }) {
  const router = useRouter();
  const t = useT();
  const refresh = useCallback(() => router.refresh(), [router]);
  return <ApproveRejectForm id={id} kind={kind} approveLabel={t("inbox.approve")} rejectLabel={t("inbox.reject")} onDone={refresh} />;
}

export function InboxDrawer({ inbox }: { inbox: InboxSnapshot }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const alertCount = inbox.approvalCount + inbox.assignedCount;
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    router.refresh();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, router]);

  const panel =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[80]">
            <button
              type="button"
              aria-label={t("inbox.closePanel")}
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <aside
              id="hizli-islemler-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="bg-popover text-popover-foreground absolute inset-y-0 end-0 flex h-dvh w-full flex-col border-s shadow-2xl sm:max-w-md"
            >
              <div className="flex items-start justify-between gap-3 border-b p-4">
                <div>
                  <p id={titleId} className="font-medium">
                    {t("inbox.title")}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {alertCount
                      ? t("inbox.summaryAlert", { approval: inbox.approvalCount, assigned: inbox.assignedCount })
                      : inbox.waitingCount
                        ? t("inbox.summaryWaiting", { count: inbox.waitingCount })
                        : t("inbox.summaryEmpty")}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("inbox.close")} onClick={() => setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {inbox.items.length ? (
                  <div className="space-y-5">
                    {SECTION_KEYS.map((section) => {
                      const rows = inbox.items.filter((row) => row.section === section.key);
                      if (!rows.length) return null;
                      return (
                        <section key={section.key} className="space-y-2">
                          <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                            {t(section.titleKey)}
                          </h2>
                          <ul className="space-y-2">
                            {rows.map((row) => (
                              <InboxRow key={row.key} row={row} onNavigate={() => setOpen(false)} />
                            ))}
                          </ul>
                        </section>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("inbox.empty")}
                  </p>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={alertCount ? t("inbox.ariaAlert", { count: alertCount }) : t("inbox.aria")}
        aria-expanded={open}
        aria-controls="hizli-islemler-panel"
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <Inbox className="size-5" />
        {alertCount ? (
          <span className="bg-destructive text-white absolute -top-0.5 -end-0.5 flex size-4 items-center justify-center rounded-full text-[10px] leading-none">
            {alertCount > 9 ? "9+" : alertCount}
          </span>
        ) : null}
      </Button>
      {panel}
    </>
  );
}

function InboxRow({ row, onNavigate }: { row: InboxItem; onNavigate: () => void }) {
  return (
    <li className="rounded-xl border p-3">
      <div className="flex items-start gap-3">
        <Link href={row.href} onClick={onNavigate} className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-mono text-xs font-medium">{row.code}</p>
            <StatusBadge value={row.status} label={row.statusLabel} />
          </div>
          <p className="mt-1 text-sm font-medium">{row.title}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            {row.meta}
            {row.meta ? " · " : ""}
            {formatDate(row.date)}
          </p>
        </Link>
      </div>
      {row.canApprove && row.approveKind ? (
        <div className="mt-3">
          <ApproveButton id={row.id} kind={row.approveKind} />
        </div>
      ) : null}
    </li>
  );
}
