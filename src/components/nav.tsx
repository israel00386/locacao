"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  House,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "./logo";
import { Avatar } from "./ui";

const iconMap = {
  home: House,
  dash: LayoutDashboard,
  list: ClipboardList,
  plus: Plus,
  box: Boxes,
  users: Users,
  money: Wallet,
  gear: Settings,
  menu: Menu,
  grid: LayoutGrid,
  logout: LogOut,
} satisfies Record<string, LucideIcon>;

/** Ícones da navegação (lucide). `filled` = versão preenchida (tinta suave) para o item ativo. */
export function Icon({ name, className = "h-5 w-5", filled }: { name: keyof typeof iconMap; className?: string; filled?: boolean }) {
  const C = iconMap[name];
  return <C className={className} strokeWidth={filled ? 2.1 : 1.9} fill={filled ? "currentColor" : "none"} fillOpacity={filled ? 0.16 : undefined} aria-hidden />;
}

/** Marca LOCAR para fundos claros: símbolo amarelo num quadrado marinho + nome em marinho. */
export function BrandLockup({ compact }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5" role="img" aria-label="LOCAR Equipamentos">
      <span className={`flex shrink-0 items-center justify-center bg-gradient-to-br from-brand-800 to-brand-950 shadow-[0_6px_14px_-8px_rgb(15_18_63/.8)] ${compact ? "h-9 w-9 rounded-xl" : "h-10 w-10 rounded-[13px]"}`}>
        <LogoMark className={compact ? "h-5 w-auto" : "h-[22px] w-auto"} title={null} />
      </span>
      <span className="leading-none">
        <span className={`block font-black tracking-tight text-brand-900 ${compact ? "text-[1.05rem]" : "text-[1.15rem]"}`}>LOCAR</span>
        <span className="mt-[3px] block text-[.5rem] font-semibold tracking-[.32em] text-brand-600/80">EQUIPAMENTOS</span>
      </span>
    </span>
  );
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

/** Barra lateral do computador: cartão branco flutuante, item ativo em pílula marinho com ícone amarelo. */
export function Sidebar({ userName }: { userName: string }) {
  const path = usePathname();
  return (
    <aside className="no-print fixed inset-y-3 left-3 z-20 hidden w-[248px] flex-col overflow-y-auto rounded-[28px] bg-white shadow-[var(--shadow-card)] lg:flex">
      <Link href="/" className="mx-4 mt-5 mb-6 flex min-h-11 items-center rounded-2xl px-2" aria-label="LOCAR Equipamentos — Painel">
        <BrandLockup />
      </Link>
      <div className="px-4">
        <Link href="/locacoes/nova" className={`btn-accent w-full ${path === "/locacoes/nova" ? "ring-2 ring-brand-900/15" : ""}`}>
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden /> Nova locação
        </Link>
      </div>
      <nav className="mt-6 flex-1 space-y-6 px-3" aria-label="Principal">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="micro mb-2 px-3 text-slate-400">{g.label}</div>
            <div className="space-y-1">
              {g.links.map((l) => {
                const active = isActive(path, l.href);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-full px-3.5 text-[14px] font-semibold transition-colors duration-150 ${
                      active ? "bg-brand-900 text-white shadow-[0_8px_18px_-10px_rgb(15_18_63/.8)]" : "text-slate-500 hover:bg-slate-100/80 hover:text-brand-950"
                    }`}
                  >
                    <Icon
                      name={l.icon}
                      filled={active}
                      className={`h-[19px] w-[19px] transition-colors ${active ? "text-accent-400" : "text-slate-400 group-hover:text-brand-700"}`}
                    />
                    {l.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-[20px] bg-[var(--app-bg)] p-2.5">
        <Avatar name={userName} size="md" tone="navy" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-brand-950">{userName}</div>
          <div className="text-xs text-slate-500">Conectado</div>
        </div>
        <form action="/login/sair" method="post">
          <button className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white hover:text-red-600" aria-label="Sair" title="Sair">
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
          </button>
        </form>
      </div>
    </aside>
  );
}

/** Cabeçalho do celular: limpo, sobre o fundo claro (rola junto). Marca à esquerda, avatar à direita. */
export function MobileHeader({ userName }: { userName?: string }) {
  return (
    <header className="no-print pt-[env(safe-area-inset-top)] lg:hidden">
      <div className="mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" aria-label="LOCAR Equipamentos — Painel" className="-ml-1 flex min-h-11 items-center rounded-2xl px-1">
          <BrandLockup compact />
        </Link>
        <Link href="/mais" aria-label="Mais opções e conta" className="-mr-0.5 flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95">
          {userName ? (
            <Avatar name={userName} size="md" tone="navy" className="ring-[3px] ring-white" />
          ) : (
            <Menu className="h-6 w-6 text-brand-900" strokeWidth={1.9} aria-hidden />
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
  { href: "/mais", label: "Mais", icon: "grid" },
] as const;

/** Barra inferior flutuante em pílula branca, com botão central amarelo elevado (+ Nova locação). */
export function BottomNav() {
  const path = usePathname();
  const moreActive = ["/mais", "/clientes", "/financeiro", "/config"].some((h) => path === h || path.startsWith(h + "/"));
  return (
    <nav
      className="no-print fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-30 mx-auto max-w-md rounded-full bg-white/95 shadow-[var(--shadow-nav)] ring-1 ring-brand-950/[.04] backdrop-blur-md min-[400px]:inset-x-4 lg:hidden"
      aria-label="Navegação"
    >
      <div className="grid h-[68px] grid-cols-5 px-1.5">
        {bottom.map((l) => {
          if ("primary" in l) {
            const on = path === l.href;
            return (
              <div key={l.href} className="relative flex justify-center">
                <Link
                  href={l.href}
                  className="group absolute -top-5 flex flex-col items-center"
                  aria-label="Nova locação"
                  aria-current={on ? "page" : undefined}
                >
                  <span className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-gradient-to-b from-accent-300 to-accent-400 text-brand-950 shadow-[0_10px_20px_-8px_rgb(185_137_0/.8),inset_0_1px_0_rgb(255_255_255/.5)] ring-[5px] ring-white transition-transform duration-150 group-active:scale-90">
                    <Plus className="h-7 w-7" strokeWidth={2.4} aria-hidden />
                  </span>
                </Link>
              </div>
            );
          }
          const active = l.href === "/mais" ? moreActive : isActive(path, l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-h-11 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${active ? "text-brand-900" : "text-slate-400 hover:text-slate-600"}`}
            >
              <span className="transition-transform duration-150 group-active:scale-90">
                <Icon name={l.icon} filled={active} className="h-[23px] w-[23px]" />
              </span>
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
