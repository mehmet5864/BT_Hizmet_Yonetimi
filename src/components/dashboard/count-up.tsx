"use client";

import { useEffect, useRef, useState } from "react";

/** Sayıyı 0'dan değere doğru sayarak gösterir. "Hareketi azalt" tercihinde doğrudan değeri yazar. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const first = useRef(true);

  useEffect(() => {
    if (!Number.isFinite(value)) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || Math.abs(value) < 2) {
      setShown(value);
      return;
    }
    const from = first.current ? 0 : shown;
    first.current = false;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <>{shown.toLocaleString("tr-TR")}</>;
}
