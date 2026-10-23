"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";

import { DocumentInput } from "@/components/form-fields/document-input";
import { FieldShell } from "@/components/form-fields/field-shell";
import { ImageInput } from "@/components/form-fields/image-input";
import { LockedRefField } from "@/components/form-fields/locked-ref";
import { ReferenceSelect, type RefOption } from "@/components/form-fields/reference-select";
import { useT } from "@/components/i18n-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActionFeedback } from "@/lib/action-feedback";
import { EMPTY_STATE, type ActionState } from "@/lib/actions/shared";
import { fieldTooltip } from "@/lib/forms/field-tooltip";
import {
  applyRelatedFills,
  initialRelatedValues,
  type DepartmentRef,
  type PersonRef,
} from "@/lib/forms/related-fill";
import { packFieldRows } from "@/lib/forms/rows";
import { localizeFields } from "@/lib/i18n/form";
import type { FieldDef } from "@/lib/inventory/fields";
import { toDateInputValue } from "@/lib/inventory/format";
import { cn } from "@/lib/utils";

export type FormCatalog = {
  people: PersonRef[];
  departments: DepartmentRef[];
  vendors: RefOption[];
  services?: RefOption[];
};

export type SimpleField = FieldDef & { name?: string };

function FieldControl({
  field,
  values,
  catalog,
  refs,
  onRefChange,
}: {
  field: SimpleField;
  values: Record<string, unknown>;
  catalog: FormCatalog;
  refs: Record<string, string>;
  onRefChange: (name: string, id: string, kind: "person" | "department" | "vendor") => void;
}) {
  const t = useT();
  const name = field.name ?? field.id;
  const raw = values[name];
  const str = raw instanceof Date ? toDateInputValue(raw) : raw == null ? "" : String(raw);

  if (field.kind === "textarea") {
    return <Textarea id={name} name={name} rows={4} defaultValue={str} placeholder={field.placeholder} />;
  }
  if (field.kind === "document") {
    const fileKey = field.fileNameField ?? `${name}Name`;
    return (
      <DocumentInput
        urlName={name}
        fileNameName={fileKey}
        defaultUrl={str || null}
        defaultFileName={values[fileKey] == null ? null : String(values[fileKey])}
        openLabel="Raporu görüntüle"
      />
    );
  }
  if (field.kind === "date") {
    return <Input id={name} name={name} type="date" defaultValue={str} />;
  }
  if (field.kind === "select") {
    return (
      <Select name={name} defaultValue={str || undefined}>
        <SelectTrigger className="w-full">
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
  }
  if (field.kind === "person") {
    if (field.readOnly) {
      return <LockedRefField name={name} value={refs[name] ?? str} options={catalog.people} />;
    }
    return (
      <ReferenceSelect
        name={name}
        entity="person"
        options={catalog.people}
        value={refs[name] ?? ""}
        onValueChange={(id) => onRefChange(name, id, "person")}
        placeholder={t("form.selectPerson")}
        emptyLabel={t("form.selectPersonEmpty")}
      />
    );
  }
  if (field.kind === "department") {
    if (field.readOnly) {
      return <LockedRefField name={name} value={refs[name] ?? str} options={catalog.departments} />;
    }
    return (
      <ReferenceSelect
        name={name}
        entity="department"
        options={catalog.departments}
        value={refs[name] ?? ""}
        onValueChange={(id) => onRefChange(name, id, "department")}
        placeholder={t("form.selectDept")}
        emptyLabel={t("form.selectDeptEmpty")}
      />
    );
  }
  if (field.kind === "vendor") {
    return (
      <ReferenceSelect
        name={name}
        entity="vendor"
        options={catalog.vendors}
        value={refs[name] ?? ""}
        onValueChange={(id) => onRefChange(name, id, "vendor")}
        placeholder={t("form.selectVendor")}
        emptyLabel={t("form.selectVendorEmpty")}
      />
    );
  }
  if (field.kind === "catalog") {
    return (
      <ReferenceSelect
        name={name}
        entity="vendor"
        options={catalog.services ?? []}
        value={refs[name] ?? ""}
        onValueChange={(id) => onRefChange(name, id, "vendor")}
        placeholder={t("form.selectService")}
        emptyLabel={t("form.selectServiceEmpty")}
        allowCreate={false}
      />
    );
  }
  if (field.kind === "image") {
    return <ImageInput name={name} defaultValue={str} />;
  }
  if (field.kind === "password") {
    return <Input id={name} name={name} type="password" placeholder={field.placeholder ?? t("form.passwordChange")} />;
  }
  return <Input id={name} name={name} defaultValue={str} placeholder={field.placeholder} />;
}

function FormField({
  field,
  values,
  catalog,
  refs,
  onRefChange,
  className,
}: {
  field: SimpleField;
  values: Record<string, unknown>;
  catalog: FormCatalog;
  refs: Record<string, string>;
  onRefChange: (name: string, id: string, kind: "person" | "department" | "vendor") => void;
  className?: string;
}) {
  const name = field.name ?? field.id;
  return (
    <FieldShell
      id={name}
      label={field.label}
      required={field.required}
      tooltip={fieldTooltip(field)}
      className={className}
    >
      <FieldControl field={field} values={values} catalog={catalog} refs={refs} onRefChange={onRefChange} />
    </FieldShell>
  );
}

export function SimpleForm({
  action,
  fields,
  values = {},
  catalog,
  hidden,
  cancelHref,
  title,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: SimpleField[];
  values?: Record<string, unknown>;
  catalog: FormCatalog;
  hidden?: Record<string, string>;
  cancelHref: string;
  title?: string;
}) {
  const t = useT();
  const isEdit = Boolean(hidden?.id ?? values.id);
  const visibleFields = useMemo(() => fields.filter((field) => isEdit || !field.editOnly), [fields, isEdit]);
  const localized = useMemo(() => localizeFields(visibleFields, t), [visibleFields, t]);
  const [state, formAction, pending] = useActionState(action, EMPTY_STATE);
  useActionFeedback(state);
  const rows = packFieldRows(localized);
  const presentFields = useMemo(() => {
    const ids = new Set(fields.map((field) => field.name ?? field.id));
    if (hidden) Object.keys(hidden).forEach((key) => ids.add(key));
    return ids;
  }, [fields, hidden]);
  const [refs, setRefs] = useState(() =>
    initialRelatedValues({
      values: { ...values, ...hidden },
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
    <form action={formAction} className="flex flex-col gap-6">
      {hidden
        ? Object.entries(hidden).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))
        : null}
      {state.message && !state.ok && !state.message.includes("NEXT_") ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        {title ? (
          <CardHeader>
            <CardTitle className="text-base">{title}</CardTitle>
          </CardHeader>
        ) : null}
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {rows.map((pack, packIndex) => {
            const first = pack[0];
            const key = first.row ? `row-${first.row}-${first.id}-${packIndex}` : first.name ?? first.id;
            if (pack.length === 1) {
              return (
                <FormField
                  key={key}
                  field={first}
                  values={values}
                  catalog={catalog}
                  refs={refs}
                  onRefChange={onRefChange}
                  className={cn(first.fullWidth && "sm:col-span-2")}
                />
              );
            }
            return (
              <div key={key} className="col-span-full grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-start">
                {pack.map((field) => (
                  <FormField
                    key={field.name ?? field.id}
                    field={field}
                    values={values}
                    catalog={catalog}
                    refs={refs}
                    onRefChange={onRefChange}
                    className="min-w-0 [&_label]:min-h-10"
                  />
                ))}
              </div>
            );
          })}
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
