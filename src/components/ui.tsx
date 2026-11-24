/**
 * Design system LOCAR — componentes base (servidor ou cliente).
 *
 * Existentes (assinaturas mantidas; props novas são opcionais):
 *  - <Badge tone>              pílula de status com ponto colorido (cores do cliente em `tones`).
 *  - <PageHeader title subtitle back actions eyebrow?>  título de tela (sem faixa).
 *  - <Stat label value|amount format tone hint icon?>   card de número; `icon` vai num IconBox 36px.
 *  - <Section title actions icon? description? flush?>  card com cabeçalho; filhos podem ser listas (ListRow).
 *  - <Empty icon? title? action?>                         estado vazio (ícone grande + texto + ação).
 *  - <Flash message tone>
 *
 * Novos:
 *  - <Hero eyebrow? title subtitle? actions? overlap?>{children}</Hero>
 *      Faixa marinho do topo das telas principais. `children` fica dentro da faixa (ex.: <HeroStat/>);
 *      `overlap` é renderizado logo abaixo, sobrepondo a borda inferior (ex.: grade de <Stat/>).
 *      No celular a faixa encosta no cabeçalho marinho; no desktop vira um card arredondado.
 *  - <HeroStat label value|amount format? hint?>          número branco para usar dentro do Hero.
 *  - <IconBox tone="brand|navy|accent|red|green|sky|amber|slate" size="sm|md|lg">{<Icon/>}</IconBox>
 *  - <Avatar name size="sm|md|lg" tone?>                  iniciais com cor estável derivada do nome.
 *  - <ListRow href? leading title subtitle? meta? trailing? trailingSub? chevron?>
 *      Linha de lista (64px+): avatar/ícone à esquerda, valor à direita, chevron sutil se `href`.
 *      Use dentro de <Section> ou de um <div className="card">, com `divide-y divide-slate-100`.
 *  - <MoreLink href>ver todas</MoreLink>                  link discreto para o `actions` de Section.
 *  - <Shortcut href icon label hint? tone?>               atalho em bloco (grade de ações rápidas).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Inbox } from "lucide-react";

import type { Tone } from "@/lib/calc";
import { CountUp, type CountFormat } from "./count-up";

// Cores de status pedidas pelo cliente (não mudar o significado).
const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200", // A vencer (cinza claro)
  sky: "bg-sky-100 text-sky-800 ring-sky-200", // Na obra (azul claro)
  yellow: "bg-yellow-100 text-yellow-800 ring-yellow-200", // Devolvido (amarelo claro)
  green: "bg-green-600 text-white ring-green-600", // Pago (verde)
  blue: "bg-blue-600 text-white ring-blue-600", // Finalizado (azul)
  red: "bg-red-600 text-white ring-red-600", // Atrasado (vermelho)
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
};
const dots: Record<Tone, string> = {
  gray: "bg-slate-400",
  sky: "bg-sky-500",
  yellow: "bg-yellow-500",
  green: "bg-white/85",
  blue: "bg-white/85",
  red: "bg-white/85",
  amber: "bg-amber-500",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full pr-2.5 pl-2 text-[11.5px] leading-none font-semibold ring-1 ring-inset ${tones[tone]}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  eyebrow,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: string;
  actions?: ReactNode;
  /** Micro-rótulo acima do título. */
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-3 gap-y-4 lg:mb-7">
      <div className="min-w-0 max-w-full">
        {back && (
          <Link
            href={back}
            className="-ml-2 mb-2 inline-flex min-h-10 items-center gap-0.5 rounded-xl pr-3 pl-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-900/[.05] hover:text-slate-800"
          >
            <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden /> Voltar
          </Link>
        )}
        {eyebrow && <div className="micro mb-1.5 text-slate-500">{eyebrow}</div>}
        <h1 className="truncate text-[1.625rem] leading-tight font-bold tracking-[-0.02em] text-brand-950 sm:text-[1.75rem]">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ícones e avatares                                                    */
/* ------------------------------------------------------------------ */

export type IconTone = "brand" | "navy" | "accent" | "red" | "green" | "sky" | "amber" | "slate";
const iconTones: Record<IconTone, string> = {
  brand: "bg-brand-50 text-brand-600 ring-brand-100",
  navy: "bg-brand-900 text-accent-400 ring-brand-900",
  accent: "bg-accent-100 text-accent-700 ring-accent-200",
  red: "bg-red-50 text-red-600 ring-red-100",
  green: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  sky: "bg-sky-50 text-sky-600 ring-sky-100",
  amber: "bg-amber-50 text-amber-600 ring-amber-100",
  slate: "bg-slate-100 text-slate-500 ring-slate-200/70",
};
const boxSizes = {
  sm: "h-8 w-8 rounded-[10px] [&>svg]:h-4 [&>svg]:w-4",
  md: "h-9 w-9 rounded-[11px] [&>svg]:h-[18px] [&>svg]:w-[18px]",
  lg: "h-11 w-11 rounded-[14px] [&>svg]:h-5 [&>svg]:w-5",
};

/** Quadrado arredondado com fundo tinto para ícones lucide. */
export function IconBox({ tone = "brand", size = "md", children, className = "" }: { tone?: IconTone; size?: keyof typeof boxSizes; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ring-1 ring-inset [&>svg]:stroke-[1.9] ${iconTones[tone]} ${boxSizes[size]} ${className}`} aria-hidden>
      {children}
    </span>
  );
}

const avatarPalette = [
  "bg-brand-100 text-brand-700",
  "bg-sky-100 text-sky-800",
  "bg-emerald-100 text-emerald-800",
  "bg-accent-100 text-accent-800",
  "bg-violet-100 text-violet-800",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
];
const avatarSizes = { sm: "h-8 w-8 text-[11px]", md: "h-10 w-10 text-[13px]", lg: "h-14 w-14 text-lg" };

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ý]/.test(p));
  const list = parts.length ? parts : name.trim().split(/\s+/);
  const a = list[0]?.[0] ?? "?";
  const b = list.length > 1 ? list[list.length - 1][0] : (list[0]?.[1] ?? "");
  return (a + b).toUpperCase();
}

/** Iniciais do nome; a cor é estável por nome. `tone` força uma cor de alerta (ex.: "red" para atrasadas). */
export function Avatar({ name, size = "md", tone, className = "" }: { name: string; size?: keyof typeof avatarSizes; tone?: "red" | "navy" | "accent"; className?: string }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const color =
    tone === "red"
      ? "bg-red-100 text-red-700"
      : tone === "navy"
        ? "bg-brand-900 text-accent-300"
        : tone === "accent"
          ? "bg-accent-400 text-brand-950"
          : avatarPalette[h % avatarPalette.length];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight ${avatarSizes[size]} ${color} ${className}`} aria-hidden>
      {initials(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Números                                                              */
/* ------------------------------------------------------------------ */

/**
 * Indicador numérico. `value` continua aceitando texto já formatado;
 * com `amount` (número) o valor é animado (contagem) no formato `format`.
 */
export function Stat({
  label,
  value,
  amount,
  format = "int",
  hint,
  tone,
  icon,
}: {
  label: string;
  value?: ReactNode;
  amount?: number;
  format?: CountFormat;
  hint?: ReactNode;
  tone?: "red" | "green";
  /** Ícone lucide (ex.: <Truck />), mostrado num quadrado tinto de 36px. */
  icon?: ReactNode;
}) {
  const color = tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-700" : "text-brand-950";
  const boxTone: IconTone = tone === "red" ? "red" : tone === "green" ? "green" : "brand";
  return (
    <div className="card relative min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 pt-0.5 text-[13px] leading-snug font-medium text-slate-500">{label}</div>
        {icon && <IconBox tone={boxTone}>{icon}</IconBox>}
      </div>
      <div className={`tnum mt-2 text-xl leading-tight font-bold tracking-[-0.02em] break-words min-[400px]:text-[1.375rem] sm:text-[1.625rem] ${color}`}>
        {amount != null ? <CountUp value={amount} format={format} /> : value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      {tone === "red" && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-red-500/70 to-red-500/0" aria-hidden />}
    </div>
  );
}

/** Número em branco para o slot de estatísticas do <Hero>. */
export function HeroStat({ label, value, amount, format = "int", hint }: { label: string; value?: ReactNode; amount?: number; format?: CountFormat; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] font-medium text-white/60">{label}</div>
      <div className="mt-1 text-[2rem] leading-none font-bold tracking-[-0.03em] text-white sm:text-[2.5rem]">
        {amount != null ? <CountUp value={amount} format={format} /> : value}
      </div>
      {hint && <div className="mt-2 text-[13px] text-white/60">{hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Estrutura                                                            */
/* ------------------------------------------------------------------ */

/**
 * Faixa marinho do topo das telas principais.
 * Celular: encosta nas laterais e no cabeçalho (continua o marinho). Desktop: card arredondado.
 */
export function Hero({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  overlap,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Conteúdo dentro da faixa, abaixo do título (ex.: <HeroStat />). */
  children?: ReactNode;
  /** Conteúdo que sobrepõe a borda inferior da faixa (ex.: grade de <Stat />). */
  overlap?: ReactNode;
}) {
  return (
    <div className="mb-5 lg:mb-7">
      <section
        className={`on-navy hero-bg relative -mx-4 -mt-5 overflow-hidden px-5 pt-6 text-white lg:mx-0 lg:mt-0 lg:rounded-[28px] lg:px-9 lg:pt-9 ${
          overlap ? "pb-16 lg:pb-[5.5rem]" : "pb-8 lg:pb-9"
        }`}
      >
        <div className="scaffold-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div className="min-w-0 max-w-full">
            {eyebrow && <div className="micro mb-2 text-accent-300/90">{eyebrow}</div>}
            <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.02em] sm:text-[2rem]">{title}</h1>
            {subtitle && <div className="mt-1.5 text-[15px] text-white/65">{subtitle}</div>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children && <div className="relative mt-6 lg:mt-8">{children}</div>}
      </section>
      {overlap && <div className="relative -mt-10 lg:-mt-14 lg:px-5">{overlap}</div>}
    </div>
  );
}

export function Section({
  title,
  actions,
  children,
  icon,
  description,
  iconTone = "brand",
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Ícone lucide ao lado do título. */
  icon?: ReactNode;
  description?: ReactNode;
  iconTone?: IconTone;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {icon && <IconBox tone={iconTone} size="sm">{icon}</IconBox>}
          <div className="min-w-0">
            <h2 className="text-[15px] leading-snug font-semibold tracking-[-0.01em] text-brand-950">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Link discreto para o canto do cabeçalho de uma Section ("ver todas"). */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-my-2 -mr-2 inline-flex min-h-10 items-center gap-0.5 rounded-xl pr-1.5 pl-2.5 text-[13px] font-semibold text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
    >
      {children}
      <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden />
    </Link>
  );
}

/**
 * Linha de lista. Com `href` vira link com feedback de toque e chevron.
 * `leading`: <Avatar/> ou <IconBox/>. `trailing`: valor (peso 700) ou <Badge/>.
 */
export function ListRow({
  href,
  leading,
  title,
  subtitle,
  meta,
  trailing,
  trailingSub,
  chevron,
  className = "",
}: {
  href?: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Linha extra abaixo do subtítulo (ex.: badges). */
  meta?: ReactNode;
  trailing?: ReactNode;
  trailingSub?: ReactNode;
  /** Padrão: mostra chevron quando há `href`. */
  chevron?: boolean;
  className?: string;
}) {
  const showChevron = chevron ?? !!href;
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] leading-snug font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</div>}
        {meta && <div className="mt-1.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {(trailing || trailingSub) && (
        <div className="shrink-0 text-right">
          {trailing && <div className="tnum text-[15px] leading-snug font-bold text-slate-900">{trailing}</div>}
          {trailingSub && <div className="tnum mt-0.5 text-xs text-slate-500">{trailingSub}</div>}
        </div>
      )}
      {showChevron && <ChevronRight className="tap-chevron -mr-1 h-[18px] w-[18px] shrink-0 text-slate-300" strokeWidth={2} aria-hidden />}
    </>
  );
  const cls = `flex min-h-16 items-center gap-3 px-4 py-3 sm:px-5 ${className}`;
  return href ? (
    <Link href={href} className={`tap ${cls} hover:bg-slate-50/80 active:bg-slate-100`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Atalho em bloco para grades de ações rápidas. */
export function Shortcut({ href, icon, label, hint, tone = "brand" }: { href: string; icon: ReactNode; label: string; hint?: string; tone?: IconTone }) {
  return (
    <Link
      href={href}
      className="card card-hover tap group flex min-w-0 flex-col items-center gap-2 px-2 py-3.5 text-center hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-4 sm:text-left"
    >
      <IconBox tone={tone} size="lg">{icon}</IconBox>
      <span className="min-w-0">
        <span className="block text-[13px] leading-tight font-semibold text-slate-800 sm:text-sm">{label}</span>
        {hint && <span className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">{hint}</span>}
      </span>
    </Link>
  );
}

export function Empty({
  children,
  icon,
  title,
  action,
  plain,
}: {
  children?: ReactNode;
  /** Ícone lucide (grande, em círculo suave). Padrão: caixa vazia. */
  icon?: ReactNode;
  title?: ReactNode;
  /** Botão/link de ação (ex.: <Link className="btn-primary">). */
  action?: ReactNode;
  /** Sem card (para usar dentro de uma Section). */
  plain?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center px-6 py-10 text-center ${plain ? "" : "card"}`}>
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200/70 ring-inset [&>svg]:h-6 [&>svg]:w-6" aria-hidden>
        {icon ?? <Inbox strokeWidth={1.75} />}
      </span>
      {title && <p className="text-[15px] font-semibold text-slate-800">{title}</p>}
      {children && <div className={`max-w-sm text-sm text-slate-500 ${title ? "mt-1" : ""}`}>{children}</div>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Flash({ message, tone = "green" }: { message?: string | null; tone?: "green" | "red" }) {
  if (!message) return null;
  const cls = tone === "red" ? "bg-red-50 text-red-800 ring-red-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200";
  const Icon = tone === "red" ? CircleAlert : CircleCheck;
  return (
    <div className={`mb-4 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm ring-1 ring-inset ${cls}`} role={tone === "red" ? "alert" : "status"}>
      <Icon className="mt-px h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
