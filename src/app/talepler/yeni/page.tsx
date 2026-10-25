import { withInventoryOptions } from "@/lib/itil/inventory-options";
import Link from "next/link";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { Card, CardContent } from "@/components/ui/card";
import { saveRequest } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { tx } from "@/lib/i18n/form";
import { getViewer } from "@/lib/auth/viewer";
import { getItilCatalog } from "@/lib/itil/catalog";
import { resolveOfficeApprover } from "@/lib/itil/office-officers";
import { officeLabel } from "@/lib/itil/office-names";
import { requestCommonFields } from "@/lib/itil/form-fields";
import { canProcessRequest } from "@/lib/itil/request-scope";
import {
  REQUEST_OFFICES,
  REQUEST_TYPE_LIST,
  SLUG_TO_REQUEST_TYPE,
  findRequestGroup,
  getRequestType,
  type RequestOffice,
} from "@/lib/itil/request-types";
import { getOfficeNames, getSystemSettings } from "@/lib/settings-store";
import { categoryIcon, officeIcon, OFFICE_STYLE } from "@/components/itil/request-visual";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const slug = typeof params.tur === "string" ? params.tur : undefined;
  const officeFilter = typeof params.ofis === "string" ? (params.ofis as RequestOffice) : undefined;
  const group = typeof params.grup === "string" ? findRequestGroup(params.grup) : undefined;
  const key = slug
    ? (SLUG_TO_REQUEST_TYPE[slug] ?? (getRequestType(slug)?.key))
    : undefined;
  const typeDef = key ? getRequestType(key) : undefined;

  const [{ t }, officeNames, settings] = await Promise.all([getTranslator(), getOfficeNames(), getSystemSettings()]);
  if (!typeDef || !key) {
    const offices = officeFilter && REQUEST_OFFICES.includes(officeFilter)
      ? [officeFilter]
      : group
        ? [group.office]
        : [...REQUEST_OFFICES];
    const types = REQUEST_TYPE_LIST.filter((item) => {
      if (group) return group.types.some((type) => type.key === item.key);
      if (officeFilter) return item.office === officeFilter;
      return offices.includes(item.office);
    });
    const desc = group
      ? tx(t, `requestGroups.${group.label}`, group.label)
      : officeFilter
        ? officeLabel(officeFilter, officeNames)
        : t("pages.newRequestDesc");
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-8">
        <PageHeader title={t("pages.newRequest")} description={desc} />
        {offices.map((office) => {
          const items = types.filter((item) => item.office === office);
          if (!items.length) return null;
          const style = OFFICE_STYLE[office];
          const OfficeIcon = officeIcon(office);
          const groups: { label: string; items: typeof items }[] = [];
          for (const item of items) {
            const found = groups.find((g) => g.label === item.group);
            if (found) found.items.push(item);
            else groups.push({ label: item.group, items: [item] });
          }
          return (
            <section key={office} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={cn("flex size-9 items-center justify-center rounded-lg", style.icon)}>
                  <OfficeIcon className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">{officeLabel(office, officeNames)}</h2>
                  <p className="text-muted-foreground text-xs">{items.length} talep türü · {groups.length} kategori</p>
                </div>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {groups.map((g) => {
                  const Icon = categoryIcon(g.label, office);
                  const adGroup = settings.requestGroups[g.items[0].key];
                  return (
                    <Card key={g.label} className={cn("border-l-4", style.border)}>
                      <CardContent className="space-y-3 py-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Icon className="text-muted-foreground size-4" />
                            <p className="text-sm font-semibold">{tx(t, `requestGroups.${g.label}`, g.label)}</p>
                          </div>
                          {adGroup ? (
                            <Badge variant="secondary" className="font-mono text-[11px]" title="Bu kategorideki talepleri karşılayan AD güvenlik grubu">
                              {adGroup}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {g.items.map((item) => (
                            <Link
                              key={item.key}
                              href={`/talepler/yeni?tur=${item.slug}`}
                              className={cn("hover:border-primary/50 rounded-lg border p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm", style.soft)}
                            >
                              <p className="text-sm font-medium">{tx(t, `requestTypes.${item.key}`, item.label)}</p>
                              {item.description ? <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{item.description}</p> : null}
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const catalog = await getItilCatalog();
  const extras = await withInventoryOptions(typeDef.extraFields.map((field) => ({ ...field, id: field.id })));
  const viewer = await getViewer();
  const canProcess = viewer ? canProcessRequest(viewer, { office: typeDef.office }) : false;
  const officeManagerId = await resolveOfficeApprover(typeDef.office, viewer?.id);
  const viewerPerson = viewer ? catalog.people.find((person) => person.id === viewer.id) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={tx(t, `requestTypes.${key}`, typeDef.label)} description={officeLabel(typeDef.office, officeNames)} />
      {(() => {
        const style = OFFICE_STYLE[typeDef.office];
        const Icon = categoryIcon(typeDef.group, typeDef.office);
        const adGroup = settings.requestGroups[key];
        return (
          <div className={cn("flex flex-wrap items-center gap-4 rounded-xl border border-l-4 p-4", style.border, style.soft)}>
            <span className={cn("flex size-12 items-center justify-center rounded-xl", style.icon)}>
              <Icon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground text-xs">{officeLabel(typeDef.office, officeNames)} · {tx(t, `requestGroups.${typeDef.group}`, typeDef.group)}</p>
              <p className="text-sm">{typeDef.description || typeDef.label}</p>
            </div>
            {adGroup ? (
              <div className="text-right">
                <p className="text-muted-foreground text-[11px]">Karşılayan grup</p>
                <Badge variant="secondary" className="font-mono">{adGroup}</Badge>
              </div>
            ) : null}
          </div>
        );
      })()}
      <SimpleForm
        action={saveRequest}
        fields={[...requestCommonFields({ canProcess }), ...extras]}
        catalog={catalog}
        hidden={{ requestType: key }}
        values={{
          status: "OPEN",
          requestDate: new Date(),
          requesterId: viewer?.id,
          severity: "MEDIUM",
          requestingDeptId: viewerPerson?.departmentId,
          requestingManagerId: officeManagerId ?? viewerPerson?.unitManagerId,
        }}
        cancelHref="/talepler"
      />
    </div>
  );
}
