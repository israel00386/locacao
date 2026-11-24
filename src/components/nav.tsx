"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "./logo";
import { Avatar } from "./ui";

const iconMap = {
  home: LayoutDashboard,
  list: ClipboardList,
  plus: Plus,
  box: Boxes,
  users: Users,
  money: Wallet,
  gear: Settings,
  menu: Menu,
  logout: LogOut,
} satisfies Record<string, LucideIcon>;

/** Ícones da navegação (lucide). Mantido por compatibilidade: prefira importar de "lucide-react". */
export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof iconMap; className?: string }) {
  const C = iconMap[name];
  return <C className={className} strokeWidth={1.9} aria-hidden />;
}

const groups = [
  {
    label: "Operação",
    links: [
      { href: "/", label: "Painel", icon: "home" },
      { href: "/locacoes", label: "Locações", icon: "list" },
      { href: "/estoque", label: "Estoque", icon: "box" },
      { href: "/clientes", label: "Clientes", icon: "users" },
    ],
  },
  {
    label: "Gestão",
    links: [
      { href: "/financeiro", label: "Financeiro", icon: "money" },
      { href: "/config", label: "Configurações", icon: "gear" },
    ],
  },
] as const;

function isActive(path: string, href: string) {
  if (href === "/") return path === "/";
  if (href === "/locacoes" && path === "/locacoes/nova") return false;
  return path === href || path.startsWith(href + "/");
}

export function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  return (
    <aside className="on-navy no-print fixed inset-y-0 left-0 z-20 hidden w-64 flex-col overflow-y-auto bg-brand-900 text-white lg:flex">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_50%_at_0%_0%,rgb(58_71_158/.5),transparent_60%),radial-gradient(90%_40%_at_100%_100%,rgb(248_200_10/.07),transparent_70%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/[.06]" aria-hidden />
      <Link href="/" className="relative mx-3 mt-5 mb-5 rounded-xl px-3 py-1.5" aria-label="LOCAR Equipamentos — Painel">
        <Logo markClassName="h-10 w-auto" />
      </Link>
      <div className="relative px-4">
        <Link href="/locacoes/nova" className={`btn-accent w-full ${path === "/locacoes/nova" ? "ring-2 ring-accent-200/60" : ""}`}>
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden /> Nova locação
        </Link>
      </div>
      <nav className="relative mt-6 flex-1 space-y-6 px-3" aria-label="Principal">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="micro mb-2 px-3 text-white/35">{g.label}</div>
            <div className="space-y-0.5">
              {g.links.map((l) => {
                const active = isActive(path, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] font-medium transition-colors duration-150 ${
                      active ? "bg-white/[.09] text-white shadow-[inset_0_1px_0_rgb(255_255_255/.06)]" : "text-white/65 hover:bg-white/[.05] hover:text-white"
                    }`}
                  >
                    <span
                      className={`absolute top-1/2 left-0 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent-400 transition-transform duration-200 ${active ? "scale-y-100" : "scale-y-0"}`}
                      aria-hidden
                    />
                    <Icon name={l.icon} className={`h-[19px] w-[19px] transition-colors ${active ? "text-accent-400" : "text-white/50 group-hover:text-white/80"}`} />
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="relative m-3 flex items-center gap-3 rounded-2xl bg-white/[.05] p-2.5 ring-1 ring-white/[.07] ring-inset">
        <Avatar name={userName} size="md" tone="accent" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{userName}</div>
          <div className="text-xs text-white/50">Conectado</div>
        </div>
        <form action="/login/sair" method="post">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white" aria-label="Sair" title="Sair">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Cabeçalho do celular: marca LOCAR sobre o marinho, respeitando a área do relógio do iPhone. */
export function MobileHeader({ userName }: { userName?: string }) {
  return (
    <header className="on-navy no-print sticky top-0 z-30 bg-brand-900 pt-[env(safe-area-inset-top)] text-white lg:hidden">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" aria-label="LOCAR Equipamentos — Painel" className="-ml-1 flex min-h-11 items-center px-1">
          <Logo markClassName="h-8 w-auto" />
        </Link>
        <Link
          href="/mais"
          aria-label="Mais opções e conta"
          className="-mr-1.5 flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95"
        >
          {userName ? (
            <Avatar name={userName} size="sm" tone="accent" className="ring-2 ring-white/15" />
          ) : (
            <Menu className="h-6 w-6 text-white/80" strokeWidth={1.9} aria-hidden />
          )}
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
  const moreActive = ["/mais", "/clientes", "/financeiro", "/config"].some((h) => path === h || path.startsWith(h + "/"));
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/70 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-16px_rgb(15_18_63/.3)] backdrop-blur-xl backdrop-saturate-150 lg:hidden"
      aria-label="Navegação"
    >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 px-1">
        {bottom.map((l) => {
          if ("primary" in l) {
            const on = path === l.href;
            return (
              <Link key={l.href} href={l.href} className="group flex flex-col items-center justify-center" aria-label="Nova locação" aria-current={on ? "page" : undefined}>
                <span className="-mt-6 flex h-[52px] w-[52px] items-center justify-center rounded-[18px] bg-gradient-to-b from-accent-300 to-accent-400 text-brand-950 shadow-[0_10px_22px_-8px_rgb(185_137_0/.7),inset_0_1px_0_rgb(255_255_255/.5)] ring-4 ring-white transition-transform duration-150 group-active:scale-90">
                  <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                </span>
                <span className="mt-0.5 text-[10.5px] font-semibold text-slate-500">Nova</span>
              </Link>
            );
          }
          const active = l.href === "/mais" ? moreActive : isActive(path, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-11 flex-col items-center justify-center gap-1 text-[10.5px] font-semibold transition-colors ${active ? "text-brand-800" : "text-slate-500"}`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-200 group-active:scale-95 ${
                  active ? "bg-brand-100/80 text-brand-700" : "group-hover:bg-slate-100"
                }`}
              >
                <Icon name={l.icon} className="h-[21px] w-[21px]" />
              </span>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
