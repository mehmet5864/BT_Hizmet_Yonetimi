"use client";

export function LockedRefField({
  name,
  value,
  options,
  emptyLabel = "—",
}: {
  name: string;
  value?: string | null;
  options: { id: string; label: string }[];
  emptyLabel?: string;
}) {
  const id = value ?? "";
  const label = options.find((item) => item.id === id)?.label ?? (id ? id : emptyLabel);
  return (
    <>
      <input type="hidden" name={name} value={id} />
      <div
        className="bg-muted/60 text-foreground flex min-h-9 w-full items-center rounded-md border border-transparent px-3 text-sm"
        aria-readonly="true"
      >
        {label}
      </div>
    </>
  );
}
