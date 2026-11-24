"use client";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ReceiptText, X, type LucideIcon } from "lucide-react";
import "./finance-motion.css";

/**
 * Painel que sobe de baixo no celular e fica centralizado no computador.
 * Portal no <body>: fica fora de containers com transform/animação, que quebrariam o position: fixed.
 */
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
  icon: Icon = ReceiptText,
  iconClass = "bg-brand-50 text-brand-600",
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  iconClass?: string;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Fechar"
        tabIndex={-1}
        className="absolute inset-0 animate-[kit-fade_.2s_ease-out_backwards] bg-brand-950/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={`relative flex max-h-[92dvh] w-full animate-[kit-rise_.32s_cubic-bezier(.2,.8,.2,1)_backwards] flex-col rounded-t-[28px] bg-white shadow-[0_-12px_40px_-12px_rgb(8_8_42/.35)] sm:rounded-[28px] sm:shadow-2xl ${
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        }`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden />
        <div className="flex items-center gap-3 px-5 pt-3 pb-3 sm:px-6 sm:pt-6">
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${iconClass}`} aria-hidden>
            <Icon className="size-5" strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-tight font-bold tracking-[-0.01em] text-brand-950">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 active:scale-95"
            aria-label="Fechar"
          >
            <X className="size-[18px]" strokeWidth={2.2} />
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function FormAlert({ children }: { children?: string | null }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-[14px] bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800 ring-1 ring-red-200 ring-inset">
      {children}
    </p>
  );
}

/** Interruptor (checkbox) no estilo iOS. */
export function Toggle({
  name,
  checked,
  defaultChecked,
  onChange,
  label,
  hint,
}: {
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-[16px] bg-slate-50 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
          className="peer sr-only"
        />
        <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-accent-400/60" aria-hidden />
        <span className="absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200 peer-checked:translate-x-5" aria-hidden />
      </span>
    </label>
  );
}
