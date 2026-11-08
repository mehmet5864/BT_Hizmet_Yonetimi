import { notFound } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { savePerson } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { getItilCatalog } from "@/lib/itil/catalog";
import { personnelFields } from "@/lib/itil/form-fields";
import { getOfficeNames, getSystemSettings } from "@/lib/settings-store";
import { parsePersonGroups } from "@/lib/auth/acl";
import { mapAdGroupsToProcessRoles, parseProcessRoles } from "@/lib/itil/process-roles";

import { ProcessRolesForm } from "./process-roles-form";
import { getScopedDb } from "@/lib/auth/data-scope";
import { canHandleModule } from "@/lib/auth/viewer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditPersonPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await canHandleModule("/personel"))) redirect("/yetkisiz");
  const db = await getScopedDb();
  const { id } = await params;
  const [{ t }, person, catalog, officeNames, settings] = await Promise.all([
    getTranslator(),
    db.person.findUnique({ where: { id } }),
    getItilCatalog(),
    getOfficeNames(),
    getSystemSettings(),
  ]);
  if (!person) notFound();
  const manualRoles = parseProcessRoles(person.processRoles);
  const adRoles = mapAdGroupsToProcessRoles(parsePersonGroups(person.adGroups), settings.ad.processRoleMaps ?? []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editName", { name: person.fullName })} />
      <SimpleForm
        action={savePerson}
        fields={personnelFields(officeNames, person.role)}
        catalog={catalog}
        values={person as unknown as Record<string, unknown>}
        hidden={{ id: person.id }}
        cancelHref={`/personel/${person.id}`}
      />
      <ProcessRolesForm personId={person.id} manual={manualRoles} fromAd={adRoles} />
    </div>
  );
}
