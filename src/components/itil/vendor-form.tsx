"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

import { DocumentInput } from "@/components/form-fields/document-input";
import { FieldShell } from "@/components/form-fields/field-shell";
import { useT } from "@/components/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/lib/action-feedback";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { tx } from "@/lib/i18n/form";
import { saveVendorFull } from "@/lib/actions/itil";
import {
  ALL_SLA_LEVEL_DRAFTS,
} from "@/lib/itil/vendor-sla";
import {
  CONTRACT_SLA_LEVELS,
  VENDOR_CONTACT_KIND_LABELS,
  VENDOR_CONTACT_KINDS,
  VENDOR_LICENSE_LABELS,
  VENDOR_LICENSE_TYPES,
  VENDOR_SPEC_KIND_LABELS,
  VENDOR_SPEC_KINDS,
} from "@/lib/itil/constants";

type ContactDraft = { name: string; email: string; phone: string; kind: string };
type ProductDraft = {
  name: string;
  licenseType: string;
  quantity: string;
  version: string;
  serialNo: string;
  notes: string;
};
type SlaDraft = { level: number; name: string; responseHours: string; resolveHours: string; description: string };

export type VendorFormValues = {
  id?: string;
  name?: string;
  supportEmail?: string | null;
  specFileUrl?: string | null;
  specFileName?: string | null;
  specKind?: string | null;
  description?: string | null;
  contacts?: ContactDraft[];
  products?: ProductDraft[];
  slaLevels?: { level: number; name: string; responseHours: number; resolveHours: number; description?: string | null }[];
};

function emptyContact(): ContactDraft {
  return { name: "", email: "", phone: "", kind: "SORUMLU" };
}
function emptyProduct(): ProductDraft {
  return { name: "", licenseType: "SUPPORT", quantity: "1", version: "", serialNo: "", notes: "" };
}

export function VendorForm({ values, cancelHref }: { values?: VendorFormValues; cancelHref: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(saveVendorFull, EMPTY_STATE);
  useActionFeedback(state);
  const [contacts, setContacts] = useState<ContactDraft[]>(
    values?.contacts?.length ? values.contacts : [emptyContact(), emptyContact()],
  );
  const [products, setProducts] = useState<ProductDraft[]>(
    values?.products?.length ? values.products : [emptyProduct()],
  );
  const [levels, setLevels] = useState<SlaDraft[]>(
    CONTRACT_SLA_LEVELS.map((level) => {
      const saved = values?.slaLevels?.find((row) => row.level === level);
      const fallback = ALL_SLA_LEVEL_DRAFTS.find((row) => row.level === level)!;
      return {
        level,
        name: saved?.name ?? fallback.name,
        responseHours: String(saved?.responseHours ?? fallback.responseHours),
        resolveHours: String(saved?.resolveHours ?? fallback.resolveHours),
        description: saved?.description ?? fallback.description,
      };
    }),
  );

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
          <CardTitle className="text-base">{t("form.vendorCard")}</CardTitle>
          <CardDescription>{t("form.vendorCardHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FieldShell id="vendor-name" label={tx(t, "fields.name.label", "Firma adı")} required hint={tx(t, "fields.name.hint", "Sözleşmeli bakım veya tedarikçi unvanı.")}>
            <Input id="vendor-name" name="name" required defaultValue={values?.name ?? ""} />
          </FieldShell>
          <FieldShell
            id="vendor-support"
            label={tx(t, "fields.email.label", "Resmi support e-posta")}
            hint={tx(t, "form.vendorSupportHint", "Çağrı merkezi veya destek kuyruğu. Birden fazla adresi virgülle yazın.")}
          >
            <Input
              id="vendor-support"
              name="supportEmail"
              defaultValue={values?.supportEmail ?? ""}
              placeholder="destek@firma.example, noc@firma.example"
            />
          </FieldShell>
          <FieldShell id="vendor-spec-kind" label={tx(t, "form.specKind", "Şartname türü")} hint={tx(t, "form.specKindHint", "Teknik veya idari şartname.")}>
            <select
              id="vendor-spec-kind"
              name="specKind"
              defaultValue={values?.specKind ?? "TEKNIK"}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              {VENDOR_SPEC_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {tx(t, `options.${kind}`, VENDOR_SPEC_KIND_LABELS[kind])}
                </option>
              ))}
            </select>
          </FieldShell>
          <div className="sm:col-span-2">
            <FieldShell
              id="vendor-spec"
              label={tx(t, "form.specFile", "Şartname dosyası")}
              hint={tx(t, "form.specFileHint", "Teknik veya idari şartname PDF / tarama. Arıza bildiriminde otomatik gelir.")}
            >
              <DocumentInput
                urlName="specFileUrl"
                fileNameName="specFileName"
                defaultUrl={values?.specFileUrl}
                defaultFileName={values?.specFileName}
              />
            </FieldShell>
          </div>
          <div className="sm:col-span-2">
            <FieldShell id="vendor-desc" label={tx(t, "fields.description.label", "Açıklama")} hint={tx(t, "fields.description.hint", "Sözleşme no, kapsam veya özel not.")}>
              <Textarea id="vendor-desc" name="description" defaultValue={values?.description ?? ""} rows={3} />
            </FieldShell>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{t("form.vendorContacts")}</CardTitle>
            <CardDescription>{t("form.vendorContactsHint")}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setContacts((prev) => [...prev, emptyContact()])}>
            <Plus className="size-4" />
            {t("form.vendorAddContact")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {contacts.map((row, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_1fr_8rem_auto]">
              <Input
                name="contactName"
                placeholder={t("form.phFullName")}
                value={row.name}
                onChange={(event) =>
                  setContacts((prev) => prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))
                }
              />
              <Input
                name="contactEmail"
                placeholder={t("form.phEmail")}
                value={row.email}
                onChange={(event) =>
                  setContacts((prev) => prev.map((item, i) => (i === index ? { ...item, email: event.target.value } : item)))
                }
              />
              <Input
                name="contactPhone"
                placeholder={t("form.phPhone")}
                value={row.phone}
                onChange={(event) =>
                  setContacts((prev) => prev.map((item, i) => (i === index ? { ...item, phone: event.target.value } : item)))
                }
              />
              <select
                name="contactKind"
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={row.kind}
                onChange={(event) =>
                  setContacts((prev) => prev.map((item, i) => (i === index ? { ...item, kind: event.target.value } : item)))
                }
              >
                {VENDOR_CONTACT_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {tx(t, `options.${kind}`, VENDOR_CONTACT_KIND_LABELS[kind])}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={contacts.length <= 1}
                onClick={() => setContacts((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{t("form.vendorProducts")}</CardTitle>
            <CardDescription>{t("form.vendorProductsHint")}</CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setProducts((prev) => [...prev, emptyProduct()])}>
            <Plus className="size-4" />
            {t("form.vendorAddProduct")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {products.map((row, index) => (
            <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
              <Input
                name="productName"
                placeholder={t("form.phProduct")}
                required
                value={row.name}
                onChange={(event) =>
                  setProducts((prev) => prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))
                }
              />
              <select
                name="productLicenseType"
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                value={row.licenseType}
                onChange={(event) =>
                  setProducts((prev) =>
                    prev.map((item, i) => (i === index ? { ...item, licenseType: event.target.value } : item)),
                  )
                }
              >
                {VENDOR_LICENSE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tx(t, `options.${type}`, VENDOR_LICENSE_LABELS[type])}
                  </option>
                ))}
              </select>
              <Input
                name="productQuantity"
                type="number"
                min={1}
                placeholder={t("form.phQty")}
                value={row.quantity}
                onChange={(event) =>
                  setProducts((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: event.target.value } : item)))
                }
              />
              <Input
                name="productVersion"
                placeholder={t("form.phVersion")}
                value={row.version}
                onChange={(event) =>
                  setProducts((prev) => prev.map((item, i) => (i === index ? { ...item, version: event.target.value } : item)))
                }
              />
              <Input
                name="productSerial"
                placeholder={t("form.phSerial")}
                value={row.serialNo}
                onChange={(event) =>
                  setProducts((prev) => prev.map((item, i) => (i === index ? { ...item, serialNo: event.target.value } : item)))
                }
              />
              <Input
                name="productNotes"
                placeholder={t("form.phNote")}
                value={row.notes}
                onChange={(event) =>
                  setProducts((prev) => prev.map((item, i) => (i === index ? { ...item, notes: event.target.value } : item)))
                }
              />
              {products.length > 1 ? (
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setProducts((prev) => prev.filter((_, i) => i !== index))}>
                    <Trash2 className="size-4" />
                    {t("form.vendorRemoveProduct")}
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.vendorSla")}</CardTitle>
          <CardDescription>{t("form.vendorSlaHint")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {levels.map((row, index) => (
            <div key={row.level} className="space-y-3 rounded-lg border p-3">
              <input type="hidden" name="slaLevel" value={row.level} />
              <p className="text-sm font-medium">{t("form.vendorLevel", { n: row.level })}</p>
              <Input
                name="slaName"
                value={row.name}
                required
                onChange={(event) =>
                  setLevels((prev) => prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <FieldShell id={`sla-r-${row.level}`} label={tx(t, "fields.responseHours.label", "Müdahale (saat)")} required>
                  <Input
                    id={`sla-r-${row.level}`}
                    name="slaResponseHours"
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={row.responseHours}
                    onChange={(event) =>
                      setLevels((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, responseHours: event.target.value } : item)),
                      )
                    }
                  />
                </FieldShell>
                <FieldShell id={`sla-z-${row.level}`} label={tx(t, "fields.resolveHours.label", "Çözüm (saat)")} required>
                  <Input
                    id={`sla-z-${row.level}`}
                    name="slaResolveHours"
                    type="number"
                    min={1}
                    max={720}
                    required
                    value={row.resolveHours}
                    onChange={(event) =>
                      setLevels((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, resolveHours: event.target.value } : item)),
                      )
                    }
                  />
                </FieldShell>
              </div>
              <Textarea
                name="slaDescription"
                rows={2}
                value={row.description}
                onChange={(event) =>
                  setLevels((prev) => prev.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)))
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" asChild>
          <Link href={cancelHref}>{t("common.cancel")}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}
