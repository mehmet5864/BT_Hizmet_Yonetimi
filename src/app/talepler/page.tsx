import Link from "next/link";
import { Plus } from "lucide-react";

import { RequestDashboard } from "@/components/dashboard/request-dashboard";
import { ListFilters } from "@/components/list-filters";
import { StatusBadge } from "@/components/itil/status-badge";
import { EmptyState, PageHeader } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  ESCALATION_STATUS_LABELS,
  REQUEST_SEVERITIES,
  REQUEST_SEVERITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  type EscalationStatus,
  type RequestSeverity,
  type TicketStatus,
} from "@/lib/itil/constants";
import { param } from "@/lib/search-params";
import { getViewer } from "@/lib/auth/viewer";
import {
  canViewOffice,
  listRequestWhere,
  scopedRequestOffices,
  visibleRequestWhere,
} from "@/lib/itil/request-scope";
import { officeLabel } from "@/lib/itil/office-names";
import {
  REQUEST_TYPE_LIST,
  findRequestGroup,
  getRequestType,
  slugifyRequestGroup,
} from "@/lib/itil/request-types";
import { formatDate } from "@/lib/inventory/format";
import { prisma } from "@/lib/prisma";
import { getRequestDashboard } from "@/lib/queries";
import { getOfficeNames } from "@/lib/settings-store";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const scope = scopedRequestOffices({
    role: viewer?.role,
    requestOffice: viewer?.requestOffice,
    requestScopes: viewer?.requestScopes,
  });

  const params = await searchParams;
  const office = param(params, "ofis");
  const groupSlug = param(params, "grup");
  const type = param(params, "tur");
  const query = param(params, "q");
  const status = param(params, "durum");
  const severity = param(params, "onem");
  const group = groupSlug ? findRequestGroup(groupSlug) : undefined;
  const typeDef = type ? getRequestType(type) : undefined;
  const groupTypeKeys = group?.types.map((item) => item.key);

  const filters = (
    <ListFilters
      searchPlaceholder="Talep no, gerekçe, sahip veya birim ara…"
      searchAriaLabel="Talep ara"
      selects={[
        {
          key: "durum",
          label: "Durum",
          allLabel: "Tüm durumlar",
          options: TICKET_STATUSES.map((item) => ({ value: item, label: TICKET_STATUS_LABELS[item] })),
        },
        {
          key: "onem",
          label: "Önem",
          allLabel: "Tüm önemler",
          className: "w-40",
          options: REQUEST_SEVERITIES.map((item) => ({ value: item, label: REQUEST_SEVERITY_LABELS[item] })),
        },
      ]}
    />
  );

  const officeNames = await getOfficeNames();
  const menuSelected = Boolean(office || group || type);
  const extraFilter = Boolean(query || status || severity);
  if (!menuSelected && !extraFilter) {
    const data = await getRequestDashboard(scope, viewer ? visibleRequestWhere(viewer) : undefined);
    return <RequestDashboard data={data} offices={scope} toolbar={filters} officeNames={officeNames} />;
  }
  const officeAllowed = !office || canViewOffice(scope, office);
  const scopedOfficeFilter = office && officeAllowed ? office : undefined;
  const namedOffice = office ? officeLabel(office, officeNames) : undefined;

  const heading = typeDef?.label ?? group?.label ?? namedOffice ?? "Talepler";

  const newHref = typeDef
    ? `/talepler/yeni?tur=${typeDef.slug}`
    : group
      ? `/talepler/yeni?grup=${group.slug}`
      : office
        ? `/talepler/yeni?ofis=${office}`
        : "/talepler/yeni";

  const requests = viewer
    ? await prisma.serviceRequest.findMany({
        where: listRequestWhere(viewer, {
          office,
          type,
          types: !type && groupTypeKeys ? groupTypeKeys : undefined,
          status,
          severity,
          query,
        }),
        include: { requester: true, requestingDept: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      })
    : [];

  const typeChips = REQUEST_TYPE_LIST.filter((item) => {
        if (type) return item.key === type;
        if (group) return group.types.some((entry) => entry.key === item.key);
        if (office) return item.office === office;
        return officeAllowed && (scope === "ALL" || scope.includes(item.office));
      });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader
        title={heading}
        description={
          typeDef
            ? officeAllowed
              ? `${namedOffice ?? officeLabel(typeDef.office, officeNames)} kuyruğu ve kendi talepleriniz.`
              : `${namedOffice ?? officeLabel(typeDef.office, officeNames)} — yalnızca kendi açtığınız kayıtlar.`
            : group
              ? officeAllowed
                ? `${namedOffice ?? officeLabel(group.office, officeNames)} · ${group.label} kuyruğu.`
                : `${namedOffice ?? officeLabel(group.office, officeNames)} · ${group.label} — kendi talepleriniz.`
              : officeAllowed && scopedOfficeFilter
                ? "Bu şubeye gelen talepler ve kendi kayıtlarınız."
                : office
                  ? "Bu şubeye yaptığınız talepler. Gelen kuyruk yalnızca o birimin yetkililerine açıktır."
                  : "Görüntüleme yetkiniz olan talepler."
        }
        actions={
          <Button asChild>
            <Link href={newHref}>
              <Plus className="size-4" />
              Yeni talep
            </Link>
          </Button>
        }
      />

      {filters}

      {typeChips.length ? (
        <div className="flex flex-wrap gap-1.5">
          {typeChips.map((item) => (
            <Link
              key={item.key}
              href={`/talepler?ofis=${item.office}&grup=${slugifyRequestGroup(item.group)}&tur=${item.key}`}
              className="text-muted-foreground hover:text-foreground rounded-full border px-2 py-0.5 text-xs"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      <p className="text-muted-foreground text-sm">{requests.length} kayıt listeleniyor</p>

      {requests.length ? (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Talep</th>
                <th className="px-3 py-2 font-medium">Tür</th>
                {!scopedOfficeFilter ? <th className="px-3 py-2 font-medium">Şube</th> : null}
                <th className="px-3 py-2 font-medium">Sahibi</th>
                <th className="px-3 py-2 font-medium">Önem</th>
                <th className="px-3 py-2 font-medium">Tarih</th>
                <th className="px-3 py-2 font-medium">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {requests.map((request) => {
                const rowType = getRequestType(request.requestType);
                return (
                  <tr key={request.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <Link href={`/talepler/${request.id}`} className="font-mono text-xs font-medium hover:underline">
                        {request.requestNo}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{rowType?.label ?? request.requestType}</td>
                    {!scopedOfficeFilter ? (
                      <td className="px-3 py-2">
                        {officeLabel(request.office, officeNames)}
                      </td>
                    ) : null}
                    <td className="px-3 py-2">
                      {request.requester.fullName}
                      <p className="text-muted-foreground text-xs">{request.requestingDept?.name ?? "—"}</p>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        value={request.severity}
                        label={REQUEST_SEVERITY_LABELS[request.severity as RequestSeverity] ?? request.severity}
                      />
                      {request.escalationStatus !== "NONE" ? (
                        <p className="text-muted-foreground mt-1 text-xs">
                          {ESCALATION_STATUS_LABELS[request.escalationStatus as EscalationStatus] ?? request.escalationStatus}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">{formatDate(request.requestDate)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge
                        value={request.status}
                        label={TICKET_STATUS_LABELS[request.status as TicketStatus] ?? request.status}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Kayıt bulunamadı" description="Filtrelerinizi gevşetin veya bu kırılımda yeni talep açın." />
      )}
    </div>
  );
}
