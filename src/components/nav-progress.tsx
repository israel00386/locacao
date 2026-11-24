"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** Barra fina amarela no topo enquanto uma navegação interna carrega (sem dependências). */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [progress, setProgress] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);

  // Começa ao clicar num link interno que leva a outra tela.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || !a.href || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      start();
    };
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if ((form.getAttribute("method") ?? "").toLowerCase() === "get") start();
    };
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  function start() {
    window.clearInterval(timer.current);
    setProgress(0.08);
    timer.current = window.setInterval(() => {
      setProgress((p) => (p == null ? p : Math.min(0.92, p + (0.95 - p) * 0.08)));
    }, 180);
  }

  // Termina quando a rota muda.
  useEffect(() => {
    window.clearInterval(timer.current);
    setProgress((p) => (p == null ? null : 1));
    const t = window.setTimeout(() => setProgress(null), 350);
    return () => window.clearTimeout(t);
  }, [pathname, search]);

  useEffect(() => () => window.clearInterval(timer.current), []);

  return (
    <div
      className="nav-progress no-print"
      aria-hidden
      style={{ transform: `scaleX(${progress ?? 0})`, opacity: progress == null || progress >= 1 ? 0 : 1 }}
    />
  );
}
