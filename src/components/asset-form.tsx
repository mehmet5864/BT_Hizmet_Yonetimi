"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { AssetRefSelect, type AssetOption } from "@/components/form-fields/asset-ref-select";
import { FieldShell } from "@/components/form-fields/field-shell";
import { ImageInput } from "@/components/form-fields/image-input";
import { LocationInput } from "@/components/form-fields/location-input";
import { ReferenceSelect, type RefOption } from "@/components/form-fields/reference-select";
import { useT } from "@/components/i18n-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { saveAsset } from "@/lib/actions/assets";
import { useActionFeedback } from "@/lib/action-feedback";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { fieldTooltip } from "@/lib/forms/field-tooltip";
import { applyRelatedFills, initialRelatedValues, type DepartmentRef, type PersonRef } from "@/lib/forms/related-fill";
import { packFieldRows } from "@/lib/forms/rows";
import { localizeFields, localizeGroupTitle } from "@/lib/i18n/form";
import { getResolvedGroups } from "@/lib/inventory/asset-types";
import type { AssetTypeKey } from "@/lib/inventory/constants";
import type { FieldDef } from "@/lib/inventory/fields";
import { toDateInputValue } from "@/lib/inventory/format";
import { cn } from "@/lib/utils";

export type AssetFormValues = Record<string, unknown> & { id?: string; hostServers?: string[]; servedServices?: string[] };

export type FormCatalog = {
  people: PersonRef[];
  departments: DepartmentRef[];
  vendors: RefOption[];
  servers: AssetOption[];
  services: AssetOption[];
};

function valueOf(values: AssetFormValues, key: string): string {
  const value = values[key];
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return toDateInputValue(value);
  return String(value);
}

function FieldControl({
  field,
  values,
  catalog,
  error,
  refs,
  onRefChange,
}: {
  field: FieldDef;
  values: AssetFormValues;
  catalog: FormCatalog;
  error?: string;
  refs: Record<string, string>;
  onRefChange: (name: string, id: string, kind: "person" | "department" | "vendor") => void;
}) {
  const t = useT();
  switch (field.kind) {
    case "textarea":
      return (
        <Textarea
          id={field.id}
          name={field.id}
          rows={4}
          defaultValue={valueOf(values, field.id)}
          placeholder={field.placeholder}
          aria-invalid={!!error}
        />
      );

    case "date":
      return (
        <Input
          id={field.id}
          name={field.id}
          type="date"
          defaultValue={toDateInputValue(values[field.id] as string | Date | null)}
          aria-invalid={!!error}
        />
      );

    case "select":
      return (
        <Select name={field.id} defaultValue={valueOf(values, field.id) || undefined}>
          <SelectTrigger id={field.id} className="w-full" aria-invalid={!!error}>
            <SelectValue placeholder={t("form.select")} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "person":
      return (
        <ReferenceSelect
          name="ownerId"
          entity="person"
          options={catalog.people}
          value={refs.ownerId ?? ""}
          onValueChange={(id) => onRefChange("ownerId", id, "person")}
          placeholder={t("form.selectOwner")}
          emptyLabel={t("form.selectPersonEmptyCreate")}
        />
      );

    case "department":
      return (
        <ReferenceSelect
          name="departmentId"
          entity="department"
          options={catalog.departments}
          value={refs.departmentId ?? ""}
          onValueChange={(id) => onRefChange("departmentId", id, "department")}
          placeholder={t("form.selectDept")}
          emptyLabel={t("form.selectDeptEmptyCreate")}
        />
      );

    case "vendor": {
      const name = `${field.id}Id`;
      return (
        <ReferenceSelect
          name={name}
          entity="vendor"
          options={catalog.vendors}
          value={refs[name] ?? ""}
          onValueChange={(id) => onRefChange(name, id, "vendor")}
          placeholder={t("form.selectVendor")}
          emptyLabel={t("form.selectVendorEmptyCreate")}
        />
      );
    }

    case "location":
      return (
        <LocationInput
          defaultValue={{
            locRoom: values.locRoom as number | null,
            locCorridor: values.locCorridor as number | null,
            locCabinet: values.locCabinet as number | null,
            locShelf: values.locShelf as number | null,
          }}
        />
      );

    case "image":
      return <ImageInput name="imageUrl" defaultValue={valueOf(values, "imageUrl")} />;

    case "assetRefs":
      return (
        <AssetRefSelect
          name={field.id}
          options={catalog.servers}
          defaultValue={values.hostServers ?? []}
          placeholder={t("form.selectServer")}
        />
      );

    case "serviceRefs":
      return (
        <AssetRefSelect
          name={field.id}
          options={catalog.services}
          defaultValue={values.servedServices ?? []}
          placeholder="Hizmet seçin"
          unit="hizmet"
          searchPlaceholder="Hizmet ara…"
          emptyText="Kayıtlı hizmet bulunamadı. Önce hizmet kataloğuna hizmet ekleyin."
        />
      );

    default:
      return (
        <Input
          id={field.id}
          name={field.id}
          defaultValue={valueOf(values, field.id)}
          placeholder={field.placeholder}
          aria-invalid={!!error}
        />
      );
  }
}

function errorKeyFor(field: FieldDef): string {
  if (field.kind === "person") return "ownerId";
  if (field.kind === "department") return "departmentId";
  if (field.kind === "vendor") return `${field.id}Id`;
  if (field.kind === "image") return "imageUrl";
  return field.id;
}

export function AssetForm({
  assetType,
  typeLabel,
  values = {},
  catalog,
  cancelHref,
}: {
  assetType: AssetTypeKey;
  typeLabel: string;
  values?: AssetFormValues;
  catalog: FormCatalog;
  cancelHref: string;
}) {
  const t = useT();
  const [state, action, pending] = useActionState(saveAsset, EMPTY_STATE);
  useActionFeedback(state);
  const groups = getResolvedGroups(assetType).map((group) => ({
    ...group,
    title: localizeGroupTitle(group.title, t),
    fields: localizeFields(group.fields, t),
  }));
  const isEdit = !!values.id;
  const presentFields = useMemo(() => new Set(["ownerId", "departmentId", "contractorVendorId", "supportVendorId"]), []);
  const [refs, setRefs] = useState(() =>
    initialRelatedValues({
      values,
      presentFields,
      people: catalog.people,
      departments: catalog.departments,
    }),
  );

  function onRefChange(name: string, id: string, kind: "person" | "department" | "vendor") {
    setRefs((prev) => {
      const next = { ...prev, [name]: id };
      if (kind === "vendor") return next;
      return {
        ...next,
        ...applyRelatedFills({
          changedField: name,
          changedId: id,
          kind,
          presentFields,
          people: catalog.people,
          departments: catalog.departments,
        }),
      };
    });
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="assetType" value={assetType} />
      {isEdit ? <input type="hidden" name="id" value={String(values.id)} /> : null}

      {isEdit && String(values.custody ?? "HELD") === "FREE" ? (
        <Alert>
          <AlertTitle>{t("form.custodyFreeTitle")}</AlertTitle>
          <AlertDescription>
            {t("form.custodyFreeBody")}
          </AlertDescription>
        </Alert>
      ) : null}
      {isEdit && String(values.custody ?? "HELD") !== "FREE" ? (
        <Alert>
          <AlertTitle>{t("form.custodyTransferTitle")}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {t("form.custodyTransferBody")}
            </p>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="releaseCustody" value="1" className="size-4" />
              {t("form.custodyRelease")}
            </label>
          </AlertDescription>
        </Alert>
      ) : null}

      {state.message && !state.ok && !state.message.includes("NEXT_") ? (
        <Alert variant="destructive">
          <AlertTitle>{t("form.saveFailed")}</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {groups.map((group) => (
        <Card key={group.title}>
          <CardHeader>
            <CardTitle className="text-base">{group.title}</CardTitle>
            {group.description ? <CardDescription>{group.description}</CardDescription> : null}
          </CardHeader>
          <CardContent className="grid gap-5 sm:grid-cols-2">
            {packFieldRows(group.fields).map((pack, packIndex) => {
              const first = pack[0];
              const key = first.row ? `row-${first.row}-${first.id}-${packIndex}` : first.id;
              if (pack.length === 1) {
                const error = state.errors?.[errorKeyFor(first)];
                return (
                  <FieldShell
                    key={key}
                    id={first.id}
                    label={first.label}
                    required={first.required}
                    tooltip={fieldTooltip(first)}
                    error={error}
                    className={cn(first.fullWidth && "sm:col-span-2")}
                  >
                    <FieldControl
                      field={first}
                      values={values}
                      catalog={catalog}
                      error={error}
                      refs={refs}
                      onRefChange={onRefChange}
                    />
                  </FieldShell>
                );
              }
              return (
                <div key={key} className="col-span-full grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-start [&>*]:min-w-0 [&>*]:[&_label]:min-h-10">
                  {pack.map((field) => {
                    const error = state.errors?.[errorKeyFor(field)];
                    return (
                      <FieldShell
                        key={field.id}
                        id={field.id}
                        label={field.label}
                        required={field.required}
                        tooltip={fieldTooltip(field)}
                        error={error}
                        className="min-w-0"
                      >
                        <FieldControl
                          field={field}
                          values={values}
                          catalog={catalog}
                          error={error}
                          refs={refs}
                          onRefChange={onRefChange}
                        />
                      </FieldShell>
                    );
                  })}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <div className="bg-background/90 sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t py-4 backdrop-blur">
        <p className="text-muted-foreground mr-auto text-sm">
          {isEdit ? t("form.editingType", { type: typeLabel }) : t("form.creatingType", { type: typeLabel })}
        </p>
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
