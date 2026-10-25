"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

import { Input } from "@/components/ui/input";

type Item = { id: string; label: string; sub?: string };

/** Önceden liste yüklemez: yazdıkça /api/topoloji/ara ile arar (en çok 15 sonuç). */
export function SearchCombobox({
  name,
  kind,
  initial,
  placeholder,
  assetType,
  id,
  options,
}: {
  name: string;
  kind: "kisi" | "varlik" | "hizmet";
  initial?: Item | null;
  placeholder?: string;
  assetType?: string;
  id?: string;
  /** Verilirse liste önceden yüklenmiştir; sunucuya sormadan yerelde süzülür. */
  options?: Item[];
}) {
  const [selected, setSelected] = useState<Item | null>(initial ?? null);
  const [text, setText] = useState(initial?.label ?? "");
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const q = text.trim();
    if (options) {
      const lower = q.toLocaleLowerCase("tr");
      const showAll = !!selected && q === selected.label;
      const list = options.filter((o) => showAll || !lower || `${o.label} ${o.sub ?? ""}`.toLocaleLowerCase("tr").includes(lower));
      setItems(list.slice(0, 200));
      setActive(0);
      return;
    }
    if (selected && q === selected.label) return;
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const url = `/api/topoloji/ara?tip=${kind}&q=${encodeURIComponent(q)}${assetType ? `&tur=${encodeURIComponent(assetType)}` : ""}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = (await res.json()) as { items?: Item[] };
        if (mine === seq.current) {
          setItems(data.items ?? []);
          setActive(0);
        }
      } catch {
        if (mine === seq.current) setItems([]);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [text, open, kind, assetType, selected, options]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(item: Item) {
    setSelected(item);
    setText(item.label);
    setOpen(false);
  }

  function clear() {
    setSelected(null);
    setText("");
    setItems([]);
  }

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div className="relative">
        <Input
          id={id}
          value={text}
          autoComplete="off"
          placeholder={placeholder ?? "Aramak için yazın…"}
          onChange={(e) => {
            setText(e.target.value);
            if (selected) setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter" && items[active]) {
              e.preventDefault();
              pick(items[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="pe-8"
        />
        <span className="absolute inset-y-0 end-2 flex items-center">
          {loading ? (
            <Loader2 className="text-muted-foreground size-4 animate-spin" />
          ) : text ? (
            <button type="button" onClick={clear} aria-label="Temizle" className="text-muted-foreground hover:text-foreground">
              <X className="size-4" />
            </button>
          ) : null}
        </span>
      </div>
      {open && (options || !(selected && text === selected.label)) ? (
        <ul className="bg-popover absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border shadow-md" role="listbox">
          {items.length ? (
            items.map((item, index) => (
              <li
                key={item.id}
                role="option"
                aria-selected={index === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(item);
                }}
                onMouseEnter={() => setActive(index)}
                className={`cursor-pointer px-3 py-1.5 text-sm ${index === active ? "bg-accent" : ""}`}
              >
                <span className="font-medium">{item.label}</span>
                {item.sub ? <span className="text-muted-foreground block text-xs">{item.sub}</span> : null}
              </li>
            ))
          ) : (
            <li className="text-muted-foreground px-3 py-2 text-sm">{loading ? "Aranıyor…" : "Sonuç yok"}</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
