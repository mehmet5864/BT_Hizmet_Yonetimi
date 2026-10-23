import { notFound, redirect } from "next/navigation";

import { SimpleForm } from "@/components/itil/simple-form";
import { PageHeader } from "@/components/ui-bits";
import { saveRequest } from "@/lib/actions/itil";
import { getTranslator } from "@/lib/i18n";
import { tx } from "@/lib/i18n/form";
import { getItilCatalog } from "@/lib/itil/catalog";
import { requestCommonFields } from "@/lib/itil/form-fields";
import { getViewer } from "@/lib/auth/viewer";
import { canEditRequest, canProcessRequest } from "@/lib/itil/request-scope";
import { getRequestType } from "@/lib/itil/request-types";
import { prisma } from "@/lib/prisma";
import { parseJsonRecord } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

export default async function EditRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ t }, request, catalog] = await Promise.all([
    getTranslator(),
    prisma.serviceRequest.findUnique({ where: { id } }),
    getItilCatalog(),
  ]);
  if (!request) notFound();
  const viewer = await getViewer();
  if (!viewer || !canEditRequest(viewer, request)) {
    redirect("/yetkisiz");
  }
  const typeDef = getRequestType(request.requestType);
  if (!typeDef) notFound();
  const extras = parseJsonRecord(request.details);
  const canProcess = canProcessRequest(viewer, request);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <PageHeader title={t("pages.editShort", { name: request.requestNo })} description={tx(t, `requestTypes.${request.requestType}`, typeDef.label)} />
      <SimpleForm
        action={saveRequest}
        fields={[...requestCommonFields({ canProcess }), ...typeDef.extraFields]}
        catalog={catalog}
        hidden={{
          id: request.id,
          requestType: request.requestType,
        }}
        values={{ ...request, ...extras }}
        cancelHref={`/talepler/${request.id}`}
      />
    </div>
  );
}
