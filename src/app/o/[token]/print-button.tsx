"use client";
import { useState } from "react";
import { Check, Copy, Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-md bg-neutral-900 px-4 text-sm font-semibold text-white hover:bg-neutral-700">
      <Printer size={16} aria-hidden /> PDF / Imprimir
    </button>
  );
}

/** Copia a chave Pix (não aparece na impressão). */
export function CopyPix({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="no-print inline-flex min-h-9 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-brand-800 ring-1 ring-accent-300 ring-inset hover:bg-accent-100"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
    >
      {copied ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}
