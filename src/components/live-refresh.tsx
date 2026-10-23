"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Sayfayı belirli aralıkla sunucudan yeniler; canlı göstergesi çizer. */
export function LiveRefresh({ seconds = 25 }: { seconds?: number }) {
  const router = useRouter();
  const [at, setAt] = useState<string>("");

  useEffect(() => {
    const stamp = () => setAt(new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    stamp();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        stamp();
      }
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);

  return (
    <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
      <span className="relative flex size-2">
        <span className="pulse-ring absolute inline-flex size-full rounded-full bg-emerald-500/60" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      Canlı{at ? ` · ${at}` : ""}
    </span>
  );
}
