"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const icons = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
  plus: "M12 5v14M5 12h14",
  box: "M21 8 12 3 3 8m18 0-9 5m9-5v8l-9 5m0-8L3 8m9 5v8M3 8v8l9 5",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8m13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  money: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.4 7.4 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.4 7.4 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2",
  menu: "M4 6h16M4 12h16M4 18h16",
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
    <aside className="no-print fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="px-5 py-5">
        <div className="text-lg font-extrabold tracking-tight text-brand-700">Locação</div>
        <div className="text-xs text-slate-500">Equipamentos para obra</div>
      </div>
      <div className="px-3">
        <Link href="/locacoes/nova" className="btn-primary w-full">
          <Icon name="plus" /> Nova locação
        </Link>
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 px-3">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
              isActive(path, l.href) ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon name={l.icon} /> {l.label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
        {userName}
        <form action="/login/sair" method="post">
          <button className="mt-1 font-medium text-slate-700 hover:underline">Sair</button>
        </form>
      </div>
    </aside>
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
    <nav className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {bottom.map((l) => {
          const active = l.href === "/locacoes/nova" ? path === l.href : isActive(path, l.href) && !(l.href === "/locacoes" && path === "/locacoes/nova");
          if ("primary" in l) {
            return (
              <Link key={l.href} href={l.href} className="flex flex-col items-center justify-center py-1.5" aria-label="Nova locação">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
                  <Icon name="plus" className="h-6 w-6" />
                </span>
              </Link>
            );
          }
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-brand-700" : "text-slate-500"}`}
            >
              <Icon name={l.icon} />
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
