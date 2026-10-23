"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import { FieldShell } from "@/components/form-fields/field-shell";
import { ReferenceSelect } from "@/components/form-fields/reference-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteUnit, updateUnit } from "@/lib/actions/settings";
import { EMPTY_STATE } from "@/lib/actions/shared";
import { UNIT_TYPES, UNIT_TYPE_LABELS } from "@/lib/itil/unit-types";

export type UnitItem = {
  id: string;
  name: string;
  unitType: string | null;
  parentId: string | null;
  managerId: string | null;
};

export function UnitRow({
  unit,
  units,
  people,
}: {
  unit: UnitItem;
  units: UnitItem[];
  people: { id: string; label: string; meta?: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState(unit.unitType ?? "");
  const [parent, setParent] = useState(unit.parentId ?? "__none__");
  const [manager, setManager] = useState(unit.managerId ?? "");
  const [saveState, saveAction, savePending] = useActionState(updateUnit, EMPTY_STATE);
  const [delState, delAction] = useActionState(deleteUnit, EMPTY_STATE);

  useEffect(() => {
    if (saveState.ok) setEditing(false);
    if (saveState.message) (saveState.ok ? toast.success : toast.error)(saveState.message);
  }, [saveState]);
  useEffect(() => {
    if (delState.message) (delState.ok ? toast.success : toast.error)(delState.message);
  }, [delState]);

  const typeLabel =
    unit.unitType && unit.unitType in UNIT_TYPE_LABELS ? UNIT_TYPE_LABELS[unit.unitType as keyof typeof UNIT_TYPE_LABELS] : "—";

  if (!editing) {
    return (
      <li className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5">
        <span className="truncate">{unit.name}</span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="text-muted-foreground me-1 text-xs">{typeLabel}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing(true)}>
            Düzenle
          </Button>
          <form
            action={delAction}
            onSubmit={(event) => {
              if (!window.confirm(`"${unit.name}" birimi silinsin mi?`)) event.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={unit.id} />
            <Button type="submit" variant="ghost" size="sm" className="text-destructive h-7 px-2">
              Sil
            </Button>
          </form>
        </span>
      </li>
    );
  }

  return (
    <li className="rounded-md border p-3 sm:col-span-2">
      <form action={saveAction} className="space-y-4">
        <input type="hidden" name="id" value={unit.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell id={`ue-name-${unit.id}`} label="Birim adı" required>
            <Input id={`ue-name-${unit.id}`} name="name" defaultValue={unit.name} maxLength={120} required />
          </FieldShell>
          <FieldShell id={`ue-type-${unit.id}`} label="Birim türü">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full" id={`ue-type-${unit.id}`}>
                <SelectValue placeholder="Tür seçin" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {UNIT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="unitType" value={type} />
          </FieldShell>
          <FieldShell id={`ue-parent-${unit.id}`} label="Bağlı olduğu üst birim">
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger className="w-full" id={`ue-parent-${unit.id}`}>
                <SelectValue placeholder="Yok (en üst birim)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Yok (en üst birim)</SelectItem>
                {units
                  .filter((u) => u.id !== unit.id)
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="parentId" value={parent === "__none__" ? "" : parent} />
          </FieldShell>
          <FieldShell id={`ue-manager-${unit.id}`} label="Birim amiri">
            <ReferenceSelect
              name="managerId"
              entity="person"
              options={[{ id: "", label: "Tanımsız" }, ...people]}
              value={manager}
              onValueChange={setManager}
              placeholder="Personel seçin"
              emptyLabel="Personel bulunamadı"
            />
          </FieldShell>
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={savePending}>
            Kaydet
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
            Vazgeç
          </Button>
        </div>
      </form>
    </li>
  );
}
