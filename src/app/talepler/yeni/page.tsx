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
import { getOfficeNames } from "@/lib/settings-store";

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

  const [{ t }, officeNames] = await Promise.all([getTranslator(), getOfficeNames()]);
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
          return (
            <section key={office} className="space-y-2">
              <h2 className="text-sm font-semibold">{officeLabel(office, officeNames)}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <Link key={item.key} href={`/talepler/yeni?tur=${item.slug}`}>
                    <Card className="h-full transition-colors hover:border-primary/40">
                      <CardContent className="py-4">
                        <p className="text-muted-foreground text-xs">{tx(t, `requestGroups.${item.group}`, item.group)}</p>
                        <p className="font-medium">{tx(t, `requestTypes.${item.key}`, item.label)}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  const catalog = await getItilCatalog();
  const extras = typeDef.extraFields.map((field) => ({ ...field, id: field.id }));
  const viewer = await getViewer();
  const canProcess = viewer ? canProcessRequest(viewer, { office: typeDef.office }) : false;
  const officeManagerId = await resolveOfficeApprover(typeDef.office, viewer?.id);
  const viewerPerson = viewer ? catalog.people.find((person) => person.id === viewer.id) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={tx(t, `requestTypes.${key}`, typeDef.label)} description={officeLabel(typeDef.office, officeNames)} />
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
