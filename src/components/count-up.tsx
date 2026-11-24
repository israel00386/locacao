"use client";
import { useLayoutEffect, useState } from "react";
import { money } from "@/lib/format";

export type CountFormat = "money" | "int";

function fmt(v: number, format: CountFormat) {
  return format === "money" ? money(v) : Math.round(v).toLocaleString("pt-BR");
}

/** Número que "conta" de 0 até o valor (easeOutCubic). O valor final fica disponível para leitores de tela. */
export function CountUp({ value, format = "int", duration = 900 }: { value: number; format?: CountFormat; duration?: number }) {
  const [shown, setShown] = useState(value);

  useLayoutEffect(() => {
    if (!value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    setShown(0);
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(k >= 1 ? value : value * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <>
      <span aria-hidden>{fmt(shown, format)}</span>
      <span className="sr-only">{fmt(value, format)}</span>
    </>
  );
}
