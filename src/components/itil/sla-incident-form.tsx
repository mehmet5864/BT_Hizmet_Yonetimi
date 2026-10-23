"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { FileText, Loader2, Save } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { LockedRefField } from "@/components/form-fields/locked-ref";
import { useT } from "@/components/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/lib/action-feedback";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { tx } from "@/lib/i18n/form";
import { saveSla } from "@/lib/actions/itil";
import { TICKET_STATUS_LABELS, TICKET_STATUSES, VENDOR_SPEC_KIND_LABELS, type VendorSpecKind } from "@/lib/itil/constants";
import { initialRelatedValues, type PersonRef } from "@/lib/forms/related-fill";
import { licenseLabel, slaWindowLabel, type SlaProductOption } from "@/lib/itil/vendor-sla";

export function SlaIncidentForm({
  products,
  people,
  values,
  cancelHref,
}: {
  products: SlaProductOption[];
  people: PersonRef[];
  values?: Record<string, string | null | undefined>;
  cancelHref: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(saveSla, EMPTY_STATE);
  useActionFeedback(state);
  const [productId, setProductId] = useState(values?.productId ?? "");
  const [slaLevel, setSlaLevel] = useState(values?.slaLevel ? String(values.slaLevel) : "");
  const presentFields = useMemo(() => new Set(["requesterId", "requestingManagerId"]), []);
  const [refs, setRefs] = useState(() =>
    initialRelatedValues({
      values: values ?? {},
      presentFields,
      people,
      departments: [],
    }),
  );

  const product = useMemo(() => products.find((item) => item.id === productId) ?? null, [products, productId]);

  return (
    <form action={action} className="flex flex-col gap-6">
      {values?.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state.message && !state.ok ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.slaCard")}</CardTitle>
          <CardDescription>{t("form.slaCardHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldShell id="sla-title" label={tx(t, "fields.title.label", "Arıza tanımı")} required hint={tx(t, "fields.title.hint", "Firmaya iletilecek kısa tanım.")}>
              <Input id="sla-title" name="title" required defaultValue={values?.title ?? ""} />
            </FieldShell>
          </div>
          <FieldShell id="sla-requester" label={tx(t, "form.reporter", "Bildiren")} required hint={tx(t, "form.reporterHint", "Bildiren, oturum açan kişidir; değiştirilemez.")}>
            <LockedRefField name="requesterId" value={refs.requesterId} options={people} />
          </FieldShell>
          <FieldShell id="sla-manager" label={tx(t, "fields.unitManagerId.label", "Birim amiri")} required hint={tx(t, "form.slaManagerHint", "Kayıtta bu adrese de e-posta gider.")}>
            <select
              id="sla-manager"
              name="requestingManagerId"
              required
              value={refs.requestingManagerId ?? ""}
              onChange={(event) => setRefs((prev) => ({ ...prev, requestingManagerId: event.target.value }))}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">{t("form.select")}</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.label}
                </option>
              ))}
            </select>
          </FieldShell>
          <div className="sm:col-span-2">
            <FieldShell id="sla-product" label={tx(t, "form.product", "Ürün")} required hint={tx(t, "form.productHint", "Ürün firmayı ve şartnameyi belirler.")}>
              <select
                id="sla-product"
                name="productId"
                required
                value={productId}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                onChange={(event) => {
                  setProductId(event.target.value);
                  setSlaLevel("");
                }}
              >
                <option value="">{t("form.selectProduct")}</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.vendorName} — {item.name}
                    {item.version ? ` (${item.version})` : ""}
                  </option>
                ))}
              </select>
            </FieldShell>
          </div>
          {values?.status ? (
            <FieldShell id="sla-status" label={tx(t, "fields.status.label", "Durum")}>
              <select
                id="sla-status"
                name="status"
                defaultValue={values.status}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                {TICKET_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {tx(t, `options.${status}`, TICKET_STATUS_LABELS[status])}
                  </option>
                ))}
              </select>
            </FieldShell>
          ) : null}
          <div className="sm:col-span-2">
            <FieldShell id="sla-desc" label={tx(t, "fields.description.label", "Açıklama")} hint={tx(t, "fields.description.hint", "Belirti, zaman ve firmaya iletilecek ayrıntı.")}>
              <Textarea id="sla-desc" name="description" rows={4} defaultValue={values?.description ?? ""} />
            </FieldShell>
          </div>
        </CardContent>
      </Card>

      {product ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("form.specCard")}</CardTitle>
            <CardDescription>
              {product.vendorName}
              {product.specKind
                ? ` · ${tx(t, `options.${product.specKind}`, VENDOR_SPEC_KIND_LABELS[product.specKind as VendorSpecKind] ?? product.specKind)}`
                : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              {t("form.productMeta", {
                name: product.name,
                license: licenseLabel(product.licenseType),
                qty: product.quantity,
              })}
              {product.version ? ` · ${product.version}` : ""}
            </p>
            {product.specFileUrl ? (
              <a href={product.specFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 underline">
                <FileText className="size-4" />
                {product.specFileName || t("form.specOpen")}
              </a>
            ) : (
              <p className="text-muted-foreground">{t("form.specMissing")}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <AlertDescription>{t("form.specWait")}</AlertDescription>
        </Alert>
      )}

      {product ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("form.slaLevel")}</CardTitle>
            <CardDescription>{t("form.slaLevelHint")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <input type="hidden" name="slaLevel" value={slaLevel} />
            {product.slaLevels.map((level) => (
              <label
                key={level.level}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                  slaLevel === String(level.level) ? "border-primary bg-primary/5" : ""
                }`}
              >
                <input
                  type="radio"
                  name="slaLevelChoice"
                  className="mt-1"
                  checked={slaLevel === String(level.level)}
                  onChange={() => setSlaLevel(String(level.level))}
                />
                <span>
                  <span className="block font-medium">{level.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {slaWindowLabel(level.responseHours, level.resolveHours)}
                  </span>
                  {level.description ? <span className="text-muted-foreground mt-1 block text-xs">{level.description}</span> : null}
                </span>
              </label>
            ))}
            {!product.slaLevels.length ? (
              <p className="text-destructive text-sm">{t("form.slaMissingLevels")}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" asChild>
          <Link href={cancelHref}>{t("common.cancel")}</Link>
        </Button>
        <Button type="submit" disabled={pending || !productId || !slaLevel}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
