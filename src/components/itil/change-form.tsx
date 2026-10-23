"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { FieldShell } from "@/components/form-fields/field-shell";
import { LockedRefField } from "@/components/form-fields/locked-ref";
import { ReferenceSelect } from "@/components/form-fields/reference-select";
import { useT } from "@/components/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/lib/action-feedback";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { saveChange } from "@/lib/actions/itil";
import { initialRelatedValues, type DepartmentRef, type PersonRef } from "@/lib/forms/related-fill";
import { tx } from "@/lib/i18n/form";
import { MAX_CHANGE_APPROVAL_UNITS } from "@/lib/itil/change-approvals";
import { CHANGE_STATUS_LABELS, CHANGE_STATUSES } from "@/lib/itil/constants";
import { CHANGE_TYPE_LABELS, CHANGE_TYPES, RISK_LABELS, RISK_LEVELS } from "@/lib/itil/guards";
import { toDateInputValue } from "@/lib/inventory/format";

type Catalog = {
  people: PersonRef[];
  departments: DepartmentRef[];
};

export type ChangeFormValues = {
  id?: string;
  requesterId?: string | null;
  requestingDeptId?: string | null;
  requestingManagerId?: string | null;
  infosecManagerId?: string | null;
  changeIp?: string | null;
  changeKind?: string | null;
  machineType?: string | null;
  impact?: string | null;
  workStartDate?: Date | string | null;
  expectedEndDate?: Date | string | null;
  requestDate?: Date | string | null;
  approvalDate?: Date | string | null;
  status?: string | null;
  description?: string | null;
  changeType?: string | null;
  risk?: string | null;
  rollbackPlan?: string | null;
  testPlan?: string | null;
  cabNote?: string | null;
  reviewNote?: string | null;
  relatedIncidentNo?: string | null;
  relatedProblemNo?: string | null;
  approvalUnitCount?: number;
  approvalUnits?: { departmentId: string; managerId: string }[];
};

export function ChangeForm({
  catalog,
  values = {},
  cancelHref,
}: {
  catalog: Catalog;
  values?: ChangeFormValues;
  cancelHref: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(saveChange, EMPTY_STATE);
  useActionFeedback(state);
  const presentFields = useMemo(
    () => new Set(["requesterId", "requestingDeptId", "requestingManagerId"]),
    [],
  );
  const [refs, setRefs] = useState(() =>
    initialRelatedValues({
      values: values as Record<string, unknown>,
      presentFields,
      people: catalog.people,
      departments: catalog.departments,
    }),
  );
  const [unitCount, setUnitCount] = useState(values.approvalUnitCount ? String(values.approvalUnitCount) : "");
  const [units, setUnits] = useState<{ departmentId: string; managerId: string }[]>(() => {
    const seed = values.approvalUnits ?? [];
    return Array.from({ length: MAX_CHANGE_APPROVAL_UNITS }, (_, index) => seed[index] ?? { departmentId: "", managerId: "" });
  });
  const count = Number(unitCount);

  function patchUnit(index: number, patch: Partial<{ departmentId: string; managerId: string }>) {
    setUnits((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      {state.message && !state.ok && !state.message.includes("NEXT_") ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.changeRequester")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FieldShell id="requesterId" label={tx(t, "fields.requesterId.label", "Talep eden")} required hint={tx(t, "fields.requesterId.hint", "Talep eden, oturum açan kişidir; değiştirilemez.")}>
            <LockedRefField name="requesterId" value={refs.requesterId} options={catalog.people} />
          </FieldShell>
          <FieldShell id="requestDate" label={tx(t, "fields.requestDate.label", "Talep tarihi")} hint={tx(t, "fields.requestDate.hint", "Değişiklik talebinin resmi tarihi.")}>
            <Input id="requestDate" name="requestDate" type="date" defaultValue={toDateInputValue(values.requestDate)} />
          </FieldShell>
          <FieldShell id="requestingDeptId" label={tx(t, "fields.requestingDeptId.label", "Talep eden birim")} hint={tx(t, "fields.requestingDeptId.hint", "Talebi açan kişinin birimi; personel kartından gelir.")}>
            <LockedRefField name="requestingDeptId" value={refs.requestingDeptId} options={catalog.departments} />
          </FieldShell>
          <FieldShell id="requestingManagerId" label={tx(t, "fields.requestingManagerId.label", "Talep eden birim amiri")} hint={tx(t, "fields.requestingManagerId.hint", "Onay akışında kullanılır.")}>
            <ReferenceSelect
              name="requestingManagerId"
              entity="person"
              options={catalog.people}
              value={refs.requestingManagerId ?? ""}
              onValueChange={(id) => setRefs((prev) => ({ ...prev, requestingManagerId: id }))}
              placeholder={t("form.selectPerson")}
              emptyLabel={t("form.selectPersonEmpty")}
            />
          </FieldShell>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.changeUnits")}</CardTitle>
          <CardDescription>{t("form.changeUnitsHint", { n: MAX_CHANGE_APPROVAL_UNITS })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FieldShell
            id="approvalUnitCount"
            label={tx(t, "fields.approvalUnitCount.label", "Onay alınacak birim sayısı")}
            required
            hint={tx(t, "fields.approvalUnitCount.hint", "Seçime göre birim ve birim amiri satırları açılır.")}
          >
            <select
              id="approvalUnitCount"
              name="approvalUnitCount"
              required
              value={unitCount}
              className="border-input bg-background h-9 w-full max-w-xs rounded-md border px-3 text-sm"
              onChange={(event) => setUnitCount(event.target.value)}
            >
              <option value="">{t("form.select")}</option>
              {Array.from({ length: MAX_CHANGE_APPROVAL_UNITS }, (_, index) => index + 1).map((n) => (
                <option key={n} value={n}>
                  {t("form.unitsCount", { n })}
                </option>
              ))}
            </select>
          </FieldShell>

          {Number.isFinite(count) && count >= 1
            ? Array.from({ length: count }, (_, index) => (
                <div key={index} className="grid gap-5 rounded-lg border p-4 sm:grid-cols-2">
                  <p className="text-sm font-medium sm:col-span-2">{t("form.changeUnitN", { n: index + 1 })}</p>
                  <FieldShell id={`targetDept-${index}`} label={tx(t, "fields.targetDeptId.label", "Birim")} required hint={tx(t, "fields.targetDeptId.hint", "Onay verecek birim.")}>
                    <ReferenceSelect
                      name="targetDeptId"
                      entity="department"
                      options={catalog.departments}
                      value={units[index]?.departmentId ?? ""}
                      onValueChange={(departmentId) => {
                        const managerId =
                          catalog.departments.find((item) => item.id === departmentId)?.managerId ??
                          units[index]?.managerId ??
                          "";
                        patchUnit(index, { departmentId, managerId });
                      }}
                      placeholder={t("form.selectDept")}
                      emptyLabel={t("form.selectDeptEmpty")}
                    />
                  </FieldShell>
                  <FieldShell id={`targetMgr-${index}`} label={tx(t, "fields.targetMgrId.label", "Birim amiri")} required hint={tx(t, "fields.targetMgrId.hint", "O birimin onay verecek amiri.")}>
                    <ReferenceSelect
                      name="targetMgrId"
                      entity="person"
                      options={catalog.people}
                      value={units[index]?.managerId ?? ""}
                      onValueChange={(managerId) => patchUnit(index, { managerId })}
                      placeholder={t("form.selectManager")}
                      emptyLabel={t("form.selectPersonEmpty")}
                    />
                  </FieldShell>
                </div>
              ))
            : (
              <p className="text-muted-foreground text-sm">{t("form.changeUnitEmpty")}</p>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("form.changeInfo")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <FieldShell id="infosecManagerId" label={tx(t, "fields.infosecManagerId.label", "Bilgi güvenliği yöneticisi")} hint={tx(t, "fields.infosecManagerId.hint", "Bilgi güvenliği onayını verecek yönetici.")}>
            <ReferenceSelect
              name="infosecManagerId"
              entity="person"
              options={catalog.people}
              defaultValue={values.infosecManagerId}
              placeholder={t("form.selectPerson")}
              emptyLabel={t("form.selectPersonEmpty")}
            />
          </FieldShell>
          <FieldShell id="changeIp" label={tx(t, "fields.changeIp.label", "Değişiklik IP")} hint={tx(t, "fields.changeIp.hint", "Etkilenen sunucu veya arayüz IP’si.")}>
            <Input id="changeIp" name="changeIp" defaultValue={values.changeIp ?? ""} />
          </FieldShell>
          <FieldShell id="changeKind" label={tx(t, "fields.changeKind.label", "Değişiklik türü")} hint={tx(t, "fields.changeKind.hint", "Yazılım, donanım veya diğer.")}>
            <select
              id="changeKind"
              name="changeKind"
              defaultValue={values.changeKind ?? ""}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">{t("form.select")}</option>
              <option value="SOFTWARE">{t("form.labelSoftware")}</option>
              <option value="HARDWARE">{t("form.labelHardware")}</option>
              <option value="OTHER">{t("form.labelOther")}</option>
            </select>
          </FieldShell>
          <FieldShell id="machineType" label={tx(t, "fields.machineType.label", "Makine tipi")} hint={tx(t, "fields.machineType.hint", "Sanal veya fiziksel makine.")}>
            <select
              id="machineType"
              name="machineType"
              defaultValue={values.machineType ?? ""}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">{t("form.select")}</option>
              <option value="VIRTUAL">{t("form.labelVirtual")}</option>
              <option value="PHYSICAL">{t("form.labelPhysical")}</option>
            </select>
          </FieldShell>
          <FieldShell id="impact" label={tx(t, "fields.impact.label", "Değişiklik etkisi")} hint={tx(t, "fields.impact.hint", "Kesinti kısmi mi tüm sistem mi.")}>
            <select
              id="impact"
              name="impact"
              defaultValue={values.impact ?? ""}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">{t("form.select")}</option>
              <option value="PARTIAL">{t("form.labelPartial")}</option>
              <option value="FULL">{t("form.labelFull")}</option>
            </select>
          </FieldShell>
          <FieldShell id="changeType" label="Değişiklik sınıfı" hint="Standart: önceden onaylı rutin. Normal: onay akışı. Acil: hızlı yol, sonradan inceleme.">
            <select id="changeType" name="changeType" defaultValue={values.changeType ?? "NORMAL"} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
              {CHANGE_TYPES.map((v) => (
                <option key={v} value={v}>{CHANGE_TYPE_LABELS[v]}</option>
              ))}
            </select>
          </FieldShell>
          <FieldShell id="risk" label="Risk" hint="Yüksek/kritik veya acil değişikliklerde CAB notu ve geri dönüş planı zorunludur.">
            <select id="risk" name="risk" defaultValue={values.risk ?? "MEDIUM"} className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm">
              {RISK_LEVELS.map((v) => (
                <option key={v} value={v}>{RISK_LABELS[v]}</option>
              ))}
            </select>
          </FieldShell>
          <FieldShell id="relatedIncidentNo" label="İlişkili olay no" hint="Bu değişikliği doğuran olay. Örn. OLY-2026-0001.">
            <Input id="relatedIncidentNo" name="relatedIncidentNo" defaultValue={values.relatedIncidentNo ?? ""} />
          </FieldShell>
          <FieldShell id="relatedProblemNo" label="İlişkili problem no" hint="Kalıcı çözüm olarak açılıyorsa problem no. Örn. PRB-2026-0001.">
            <Input id="relatedProblemNo" name="relatedProblemNo" defaultValue={values.relatedProblemNo ?? ""} />
          </FieldShell>
          <FieldShell id="workStartDate" label={tx(t, "fields.workStartDate.label", "Çalışma başlangıç tarihi")}>
            <Input id="workStartDate" name="workStartDate" type="date" defaultValue={toDateInputValue(values.workStartDate)} />
          </FieldShell>
          <FieldShell id="expectedEndDate" label={tx(t, "fields.expectedEndDate.label", "Muhtemel bitiş tarihi")}>
            <Input id="expectedEndDate" name="expectedEndDate" type="date" defaultValue={toDateInputValue(values.expectedEndDate)} />
          </FieldShell>
          <FieldShell id="approvalDate" label={tx(t, "fields.approvalDate.label", "Onay tarihi")}>
            <Input id="approvalDate" name="approvalDate" type="date" defaultValue={toDateInputValue(values.approvalDate)} />
          </FieldShell>
          {values.id ? (
            <FieldShell id="status" label={tx(t, "fields.status.label", "Güncel durum")}>
            <select
              id="status"
              name="status"
              defaultValue={values.status ?? "PENDING"}
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
            >
              {CHANGE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {tx(t, `options.${status}`, CHANGE_STATUS_LABELS[status])}
                </option>
              ))}
            </select>
          </FieldShell>
          ) : null}
          <div className="sm:col-span-2">
            <FieldShell id="rollbackPlan" label="Geri dönüş planı" hint="Sorun çıkarsa nasıl geri alınır. Standart olmayan değişikliklerde zorunlu.">
              <Textarea id="rollbackPlan" name="rollbackPlan" rows={3} defaultValue={values.rollbackPlan ?? ""} />
            </FieldShell>
          </div>
          <div className="sm:col-span-2">
            <FieldShell id="testPlan" label="Test planı" hint="Değişiklik sonrası nasıl doğrulanır.">
              <Textarea id="testPlan" name="testPlan" rows={3} defaultValue={values.testPlan ?? ""} />
            </FieldShell>
          </div>
          <div className="sm:col-span-2">
            <FieldShell id="cabNote" label="CAB kararı / notu" hint="Değişiklik danışma kurulu görüşü. Yüksek riskli ve acil değişikliklerde onay için zorunlu.">
              <Textarea id="cabNote" name="cabNote" rows={3} defaultValue={values.cabNote ?? ""} />
            </FieldShell>
          </div>
          <div className="sm:col-span-2">
            <FieldShell id="reviewNote" label="Uygulama sonrası inceleme" hint="Sonuç, sapmalar ve çıkarılan dersler. Yüksek riskli ve acil değişiklik tamamlanırken zorunlu.">
              <Textarea id="reviewNote" name="reviewNote" rows={3} defaultValue={values.reviewNote ?? ""} />
            </FieldShell>
          </div>
          <div className="sm:col-span-2">
            <FieldShell id="description" label={tx(t, "fields.description.label", "Açıklama")} hint={tx(t, "fields.description.hint", "Yapılacak iş, kesinti ve geri alma notu.")}>
              <Textarea id="description" name="description" rows={4} defaultValue={values.description ?? ""} />
            </FieldShell>
          </div>
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
