"use client";

type Option = { id: string; label: string; sub?: string };

/** Hizmet açılır kutusu: tüm hizmetler listelenir, seçilince topoloji hemen çizilir. */
export function ServiceSelect({ id, name, options, value }: { id?: string; name: string; options: Option[]; value?: string }) {
  return (
    <select
      id={id}
      name={name}
      defaultValue={value ?? ""}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
    >
      <option value="">Hizmet seçin…</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
          {o.sub ? ` — ${o.sub}` : ""}
        </option>
      ))}
    </select>
  );
}
