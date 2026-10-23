import type { FieldDef, FieldOption } from "@/lib/inventory/fields";
import { interpolate } from "./translate";

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function resolved(t: TFn, key: string, fallback?: string) {
  const value = t(key);
  if (!value || value === key) return fallback;
  return value;
}

export function tx(t: TFn, key: string, fallback: string, vars?: Record<string, string | number>) {
  const value = vars ? t(key, vars) : t(key);
  if (!value || value === key) return interpolate(fallback, vars);
  return value;
}

export function localizeOption(option: FieldOption, t: TFn, fieldId?: string): FieldOption {
  const byField = fieldId ? resolved(t, `fields.${fieldId}.options.${option.value}`) : undefined;
  const byValue = resolved(t, `options.${option.value}`, option.label);
  return { ...option, label: byField ?? byValue ?? option.label };
}

export function localizeField<T extends FieldDef>(field: T, t: TFn): T {
  const base = `fields.${field.id}`;
  const options = field.options?.map((option) => localizeOption(option, t, field.id));
  return {
    ...field,
    label: resolved(t, `${base}.label`, field.label) ?? field.label,
    hint: resolved(t, `${base}.hint`, field.hint) ?? field.hint,
    placeholder: resolved(t, `${base}.placeholder`, field.placeholder) ?? field.placeholder,
    options,
  };
}

export function localizeFields<T extends FieldDef>(fields: T[], t: TFn): T[] {
  return fields.map((field) => localizeField(field, t));
}

export const GROUP_I18N: Record<string, string> = {
  "Tanımlayıcı bilgiler": "groups.identity",
  "Bakım ve destek": "groups.support",
  "Sahiplik ve kritiklik": "groups.ownership",
  "Ek bilgiler": "groups.notes",
  "Donanım": "groups.hardware",
  "Ağ bilgileri": "groups.network",
  "İşletim sistemi": "groups.os",
  "Çalıştığı altyapı": "groups.infra",
  "Lisans ve destek": "groups.license",
};

export function localizeGroupTitle(title: string, t: TFn) {
  const key = GROUP_I18N[title];
  return key ? resolved(t, key, title) ?? title : title;
}
