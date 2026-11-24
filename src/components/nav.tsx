"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./logo";

const icons = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  plus: "M12 5v14M5 12h14",
  box: "M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  money: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2",
  menu: "M4 6h16M4 12h16M4 18h16",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9",
};

export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof icons; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={icons[name]} />
    </svg>
  );
}

const links = [
  { href: "/", label: "Painel", icon: "home" },
  { href: "/locacoes", label: "Locações", icon: "list" },
  { href: "/estoque", label: "Estoque", icon: "box" },
  { href: "/clientes", label: "Clientes", icon: "users" },
  { href: "/financeiro", label: "Financeiro", icon: "money" },
  { href: "/config", label: "Configurações", icon: "gear" },
] as const;

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(href + "/");
}

export function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  return (
    <aside className="on-navy no-print fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-brand-900 text-white lg:flex">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_20%_0%,rgb(58_71_158/.45),transparent_60%)]" aria-hidden />
      <Link href="/" className="relative px-5 pt-6 pb-5" aria-label="LOCAR Equipamentos — Painel">
        <Logo markClassName="h-10 w-auto" />
      </Link>
      <div className="relative px-4">
        <Link href="/locacoes/nova" className="btn-accent w-full">
          <Icon name="plus" /> Nova locação
        </Link>
      </div>
      <nav className="relative mt-5 flex-1 space-y-1 px-3">
        {links.map((l) => {
          const active = isActive(path, l.href) && !(l.href === "/locacoes" && path === "/locacoes/nova");
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${
                active ? "bg-white/10 text-accent-300" : "text-white/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span
                className={`absolute inset-y-2 left-0 w-1 rounded-r-full bg-accent-400 transition-transform duration-200 ${active ? "scale-y-100" : "scale-y-0"}`}
                aria-hidden
              />
              <Icon name={l.icon} /> {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="relative flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-400 text-sm font-bold text-brand-950">
          {userName.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{userName}</div>
          <form action="/login/sair" method="post">
            <button className="text-xs text-white/60 hover:text-white hover:underline">Sair</button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Cabeçalho do celular: marca LOCAR sobre o marinho, respeitando a área do relógio do iPhone. */
export function MobileHeader() {
  return (
    <header className="on-navy no-print sticky top-0 z-30 bg-brand-900 pt-[env(safe-area-inset-top)] text-white shadow-md shadow-brand-950/20 lg:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="LOCAR Equipamentos — Painel" className="-ml-1 flex min-h-11 items-center px-1">
          <Logo markClassName="h-8 w-auto" />
        </Link>
        <Link href="/mais" aria-label="Mais opções" className="flex h-11 w-11 items-center justify-center rounded-xl text-white/80 hover:bg-white/10 active:bg-white/15">
          <Icon name="menu" className="h-6 w-6" />
        </Link>
      </div>
    </header>
  );
}

const bottom = [
  { href: "/", label: "Painel", icon: "home" },
  { href: "/locacoes", label: "Locações", icon: "list" },
  { href: "/locacoes/nova", label: "Nova", icon: "plus", primary: true },
  { href: "/estoque", label: "Estoque", icon: "box" },
  { href: "/mais", label: "Mais", icon: "menu" },
] as const;

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-12px_rgb(15_18_63/.25)] backdrop-blur lg:hidden">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {bottom.map((l) => {
          const active = l.href === "/locacoes/nova" ? path === l.href : isActive(path, l.href) && !(l.href === "/locacoes" && path === "/locacoes/nova");
          if ("primary" in l) {
            return (
              <Link key={l.href} href={l.href} className="group flex flex-col items-center justify-center" aria-label="Nova locação">
                <span className="-mt-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-400 text-brand-950 shadow-lg shadow-accent-700/30 ring-4 ring-white transition-transform duration-150 group-active:scale-90">
                  <Icon name="plus" className="h-7 w-7" />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors active:bg-slate-100 ${active ? "text-brand-700" : "text-slate-500"}`}
            >
              <span className={`absolute top-0 h-1 w-8 rounded-b-full bg-accent-400 transition-opacity ${active ? "opacity-100" : "opacity-0"}`} aria-hidden />
              <Icon name={l.icon} className={`h-6 w-6 transition-transform ${active ? "scale-110" : ""}`} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
