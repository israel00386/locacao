/**
 * Design system LOCAR v2 — componentes base (servidor ou cliente; nenhum usa hooks).
 * Estilo "fintech" leve: fundo #f3f5fa, cards brancos 24px sem borda dura e com sombra difusa,
 * botões pílula, cartão de saldo em degradê marinho, cores de dados vivas (var(--data-*)).
 *
 * Utilitários CSS (globals.css): card, card-soft, card-navy, hero-bg, btn(-primary|-accent|-secondary|-danger|-ghost|-glass|-sm|-lg|-icon|-round),
 * input, label, micro, chip, tnum, snap-row, skeleton, stagger, tap, tap-chevron.
 *
 * Existentes (assinaturas mantidas; props novas são opcionais):
 *  - <Badge tone>              pílula de status com ponto colorido (cores do cliente em `tones` — não mudar).
 *  - <PageHeader title subtitle? back? actions? eyebrow?>  título grande da tela; `back` vira botão redondo.
 *  - <Stat label value|amount format? tone? hint? icon?>   card de métrica: ícone em quadrado tinto + número grande.
 *  - <Section title actions? icon? description? iconTone? plain?>  card com cabeçalho. `plain`: título fora, sem card.
 *  - <Empty icon? title? action? plain?>  estado vazio.
 *  - <Flash message tone>
 *  - <Hero eyebrow? title subtitle? actions? overlap?>{children}</Hero>  cartão em degradê marinho (não é mais faixa de tela).
 *  - <HeroStat label value|amount format? hint?>  número branco para usar dentro do Hero/BalanceCard.
 *  - <IconBox tone size="sm|md|lg|xl" round?>  quadrado (ou círculo) tinto para ícones lucide.
 *  - <Avatar name size="sm|md|lg" tone?>  iniciais com cor estável.
 *  - <ListRow href? leading title subtitle? meta? trailing? trailingSub? chevron?>  linha de lista dentro de card.
 *  - <MoreLink href>Ver todas</MoreLink>
 *  - <Shortcut href icon label hint? tone?>  atalho em bloco.
 *
 * Novos (v2):
 *  - <TopBar title eyebrow? subtitle? back? actions? center?>
 *      Cabeçalho de tela: título grande à esquerda (ou centralizado com `center`), botões redondos à direita.
 *      `back` = href do botão voltar redondo. Para os botões use <RoundButton/>.
 *  - <RoundButton href? icon label dot? onClick? />  botão redondo branco 44px (busca, sino, voltar). `dot` = bolinha vermelha.
 *  - <BalanceCard label amount|value format? icon? chips? actions? footer? tone="navy|soft">{children}</BalanceCard>
 *      Cartão de saldo em degradê marinho (ou suave), valor grande com CountUp. `chips` = linha de <Chip/>;
 *      `actions` = botões no canto (ex.: <Link className="btn-round">+</Link>); `children` = slot abaixo (ex.: Donut, mini stats).
 *  - <Chip tone="up|down|neutral|glass|warn" icon?>texto</Chip>  pílula de variação/contagem.
 *  - <Donut segments={[{value,color,label}]} centerLabel? centerValue? size? thickness? legend?>
 *      SVG puro; `size` = largura máxima em px (encolhe no celular). `color` aceita qualquer cor CSS (ex.: "var(--data-sky)").
 *  - <BarChart data={[{label, values:[a,b]}]} series={[{label,color}]} height? format? highlight?>
 *      Barras arredondadas (pares/duplas) em CSS, com legenda. `format`: "money" | "int".
 *  - <SegmentedTabs items={[{label, href?|value?, count?}]} active onChange? size?>  pílulas segmentadas (links ou botões).
 *  - <QuickTile href icon label hint? tone>  tile de ação rápida (fundo tinto, ícone em círculo branco).
 *  - <TxRow href? icon? iconTone? avatar? title subtitle? amount? sign? value? meta?>
 *      Linha estilo transação: ícone redondo 44px, título 600, data pequena, valor à direita (+ verde / − vermelho).
 *  - <ProgressRow icon? iconTone? title subtitle? value? percent color? chip? href?>  item com barra de progresso.
 *  - <SectionTitle title action?>  título de bloco fora do card (com "Ver todas" à direita).
 *  - dataColors / DataColor  paleta de dados para gráficos/categorias.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Inbox } from "lucide-react";

import type { Tone } from "@/lib/calc";
import { money } from "@/lib/format";
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
    <span className={`inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-full pr-2.5 pl-2 text-[11.5px] leading-none font-semibold ring-1 ring-inset ${tones[tone]}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dots[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Cores de dados                                                       */
/* ------------------------------------------------------------------ */

export const dataColors = {
  sky: "var(--data-sky)",
  indigo: "var(--data-indigo)",
  amber: "var(--data-amber)",
  rose: "var(--data-rose)",
  emerald: "var(--data-emerald)",
  violet: "var(--data-violet)",
  teal: "var(--data-teal)",
  orange: "var(--data-orange)",
  navy: "var(--data-navy)",
  yellow: "var(--data-yellow)",
} as const;
export type DataColor = keyof typeof dataColors;

/* ------------------------------------------------------------------ */
/* Cabeçalhos                                                           */
/* ------------------------------------------------------------------ */

/** Botão redondo branco (44px). Com `href` vira link; `dot` mostra uma bolinha vermelha de aviso. */
export function RoundButton({
  href,
  icon,
  label,
  dot,
  onClick,
  className = "",
}: {
  href?: string;
  icon: ReactNode;
  label: string;
  dot?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      {icon}
      {dot && <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" aria-hidden />}
    </>
  );
  const cls = `btn-round relative [&>svg]:stroke-[1.9] ${className}`;
  return href ? (
    <Link href={href} className={cls} aria-label={label} title={label}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-label={label} title={label}>
      {inner}
    </button>
  );
}

/**
 * Cabeçalho de tela v2: título grande, botões redondos à direita.
 * `center`: título centralizado entre voltar e ações (como telas internas da referência).
 */
export function TopBar({
  title,
  eyebrow,
  subtitle,
  back,
  actions,
  center,
  className = "",
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  actions?: ReactNode;
  center?: boolean;
  className?: string;
}) {
  const backBtn = back && <RoundButton href={back} label="Voltar" icon={<ChevronLeft strokeWidth={2} />} />;
  if (center) {
    return (
      <div className={`mb-5 grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 lg:mb-7 ${className}`}>
        <div>{backBtn}</div>
        <div className="min-w-0 text-center">
          {eyebrow && <div className="micro mb-0.5 text-slate-500">{eyebrow}</div>}
          <h1 className="truncate text-xl font-bold tracking-[-0.02em] text-brand-950 sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</div>}
        </div>
        <div className="flex min-w-11 justify-end gap-2">{actions}</div>
      </div>
    );
  }
  return (
    <div className={`mb-5 lg:mb-7 ${className}`}>
      {backBtn && <div className="mb-4">{backBtn}</div>}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 max-w-full flex-1">
          {eyebrow && <div className="mb-1 text-[15px] font-medium text-slate-500 first-letter:uppercase">{eyebrow}</div>}
          <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] break-words text-brand-950 sm:text-[2rem]">{title}</h1>
          {subtitle && <div className="mt-1.5 text-[15px] text-slate-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
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
    <div className="mb-5 lg:mb-7">
      {back && (
        <div className="mb-4">
          <RoundButton href={back} label="Voltar" icon={<ChevronLeft strokeWidth={2} />} />
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-4">
        <div className="min-w-0 max-w-full">
          {eyebrow && <div className="micro mb-1.5 text-slate-500">{eyebrow}</div>}
          <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] break-words text-brand-950 sm:text-[2rem]">{title}</h1>
          {subtitle && <div className="mt-1.5 text-[15px] text-slate-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/** Título de bloco fora do card ("Devolvem em breve" ··· "Ver todas"). */
export function SectionTitle({ title, action, className = "" }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex min-h-8 items-center justify-between gap-3 px-1 ${className}`}>
      <h2 className="text-[17px] leading-tight font-semibold tracking-[-0.01em] text-brand-950">{title}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ícones e avatares                                                    */
/* ------------------------------------------------------------------ */

export type IconTone =
  | "brand"
  | "navy"
  | "accent"
  | "red"
  | "green"
  | "sky"
  | "amber"
  | "slate"
  | "violet"
  | "rose"
  | "teal"
  | "indigo"
  | "orange"
  | "white";
const iconTones: Record<IconTone, string> = {
  brand: "bg-brand-50 text-brand-600",
  navy: "bg-brand-900 text-accent-400",
  accent: "bg-accent-100 text-accent-700",
  red: "bg-red-50 text-red-600",
  green: "bg-emerald-50 text-emerald-600",
  sky: "bg-sky-50 text-sky-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-500",
  violet: "bg-violet-50 text-violet-600",
  rose: "bg-rose-50 text-rose-600",
  teal: "bg-teal-50 text-teal-600",
  indigo: "bg-indigo-50 text-indigo-600",
  orange: "bg-orange-50 text-orange-600",
  white: "bg-white text-brand-900 shadow-[0_4px_12px_-6px_rgb(15_18_63/.25)]",
};
const boxSizes = {
  sm: "h-8 w-8 rounded-[10px] [&>svg]:h-4 [&>svg]:w-4",
  md: "h-10 w-10 rounded-xl [&>svg]:h-[18px] [&>svg]:w-[18px]",
  lg: "h-11 w-11 rounded-[14px] [&>svg]:h-5 [&>svg]:w-5",
  xl: "h-12 w-12 rounded-2xl [&>svg]:h-[22px] [&>svg]:w-[22px]",
};

/** Quadrado arredondado (ou círculo, com `round`) de fundo tinto para ícones lucide. */
export function IconBox({
  tone = "brand",
  size = "md",
  round,
  children,
  className = "",
}: {
  tone?: IconTone;
  size?: keyof typeof boxSizes;
  /** Círculo em vez de quadrado arredondado. */
  round?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center [&>svg]:stroke-[1.9] ${iconTones[tone]} ${boxSizes[size]} ${round ? "!rounded-full" : ""} ${className}`}
      aria-hidden
    >
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
const avatarSizes = { sm: "h-8 w-8 text-[11px]", md: "h-11 w-11 text-[13px]", lg: "h-14 w-14 text-lg" };

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 2 || /^[A-ZÀ-Ý]/.test(p));
  const list = parts.length ? parts : name.trim().split(/\s+/);
  const a = list[0]?.[0] ?? "?";
  const b = list.length > 1 ? list[list.length - 1][0] : (list[0]?.[1] ?? "");
  return (a + b).toUpperCase();
}

/** Iniciais do nome; a cor é estável por nome. `tone` força uma cor (ex.: "red" para atrasadas). */
export function Avatar({
  name,
  size = "md",
  tone,
  className = "",
}: {
  name: string;
  size?: keyof typeof avatarSizes;
  tone?: "red" | "navy" | "accent" | "white";
  className?: string;
}) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const color =
    tone === "red"
      ? "bg-red-100 text-red-700"
      : tone === "navy"
        ? "bg-brand-900 text-accent-300"
        : tone === "accent"
          ? "bg-accent-400 text-brand-950"
          : tone === "white"
            ? "bg-white text-brand-900"
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
 * Card de métrica (como "Assets / Liabilities" da referência): ícone num quadrado tinto, rótulo e número grande.
 * `value` aceita texto já formatado; com `amount` (número) o valor é animado no formato `format`.
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
  /** Ícone lucide (ex.: <Truck />), mostrado num quadrado tinto. */
  icon?: ReactNode;
}) {
  const color = tone === "red" ? "text-red-600" : tone === "green" ? "text-emerald-700" : "text-brand-950";
  const boxTone: IconTone = tone === "red" ? "red" : tone === "green" ? "green" : "brand";
  return (
    <div className="card relative min-w-0 overflow-hidden p-4 sm:p-5">
      {icon && <IconBox tone={boxTone} className="mb-3 sm:mb-4">{icon}</IconBox>}
      <div className="min-w-0 text-[13px] leading-snug font-medium text-slate-500">{label}</div>
      <div className={`tnum mt-1 text-[1.375rem] leading-tight font-bold tracking-[-0.025em] break-words min-[400px]:text-2xl sm:text-[1.75rem] ${color}`}>
        {amount != null ? <CountUp value={amount} format={format} /> : value}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

/** Número em branco para o Hero/BalanceCard. */
export function HeroStat({ label, value, amount, format = "int", hint }: { label: string; value?: ReactNode; amount?: number; format?: CountFormat; hint?: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] font-medium text-white/65">{label}</div>
      <div className="tnum mt-1 text-[2rem] leading-none font-bold tracking-[-0.03em] text-white sm:text-[2.5rem]">
        {amount != null ? <CountUp value={amount} format={format} /> : value}
      </div>
      {hint && <div className="mt-2 text-[13px] text-white/65">{hint}</div>}
    </div>
  );
}

const chipTones = {
  up: "bg-emerald-50 text-emerald-700",
  down: "bg-red-50 text-red-700",
  warn: "bg-amber-50 text-amber-800",
  neutral: "bg-slate-100 text-slate-600",
  glass: "bg-white/12 text-white ring-1 ring-white/15 ring-inset",
  "glass-red": "bg-red-500/90 text-white",
  "glass-yellow": "bg-accent-400 text-brand-950",
};
/** Pílula de variação/contagem. Sobre o marinho use tone "glass", "glass-red" ou "glass-yellow". */
export function Chip({ tone = "neutral", icon, children, className = "" }: { tone?: keyof typeof chipTones; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={`chip tnum ${chipTones[tone]} ${className}`}>
      {icon}
      {children}
    </span>
  );
}

/**
 * Cartão de saldo (degradê marinho → azul com brilho sutil). Valor grande com CountUp.
 * `tone="soft"`: degradê claro (brand-50 → accent-50) com texto marinho.
 */
export function BalanceCard({
  label,
  amount,
  value,
  format = "money",
  icon,
  chips,
  actions,
  footer,
  tone = "navy",
  children,
  className = "",
}: {
  label: ReactNode;
  amount?: number;
  value?: ReactNode;
  format?: CountFormat;
  /** Ícone pequeno antes do rótulo. */
  icon?: ReactNode;
  /** Linha de <Chip/> abaixo do valor. */
  chips?: ReactNode;
  /** Botões no canto superior direito (ex.: <RoundButton/> ou link .btn-round). */
  actions?: ReactNode;
  /** Linha inferior separada (ex.: link "Ver financeiro"). */
  footer?: ReactNode;
  tone?: "navy" | "soft";
  /** Slot abaixo do valor (ex.: <Donut/>, mini estatísticas). */
  children?: ReactNode;
  className?: string;
}) {
  const navy = tone === "navy";
  return (
    <section className={`relative isolate overflow-hidden p-5 sm:p-6 ${navy ? "card-navy on-navy" : "card-soft text-brand-950"} ${className}`}>
      {navy && (
        <>
          <span className="pointer-events-none absolute -top-16 -right-10 -z-10 h-48 w-48 rounded-full border-[28px] border-white/[.05]" aria-hidden />
          <span className="pointer-events-none absolute -right-4 -bottom-24 -z-10 h-56 w-56 rounded-full bg-white/[.04]" aria-hidden />
        </>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`flex items-center gap-1.5 text-sm font-medium [&>svg]:h-4 [&>svg]:w-4 ${navy ? "text-white/70" : "text-slate-600"}`}>
            {icon}
            {label}
          </div>
          <div className={`tnum mt-1.5 text-[2.125rem] leading-[1.05] font-bold tracking-[-0.035em] break-words min-[400px]:text-[2.375rem] sm:text-[2.5rem] ${navy ? "text-white" : "text-brand-950"}`}>
            {amount != null ? <CountUp value={amount} format={format} /> : value}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      {chips && <div className="mt-3.5 flex flex-wrap items-center gap-2">{chips}</div>}
      {children && <div className="mt-5">{children}</div>}
      {footer && <div className={`mt-5 border-t pt-3.5 ${navy ? "border-white/10" : "border-brand-900/[.06]"}`}>{footer}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Gráficos (SVG/CSS puro)                                              */
/* ------------------------------------------------------------------ */

export type DonutSegment = { value: number; color: string; label?: string };

/**
 * Rosca em SVG puro. `size` = largura máxima (px); encolhe com o container.
 * `legend`: mostra a legenda (cor, rótulo e %) abaixo.
 */
export function Donut({
  segments,
  centerLabel,
  centerValue,
  size = 200,
  thickness = 14,
  track = "rgb(15 18 63 / 0.06)",
  legend,
  className = "",
  ariaLabel,
}: {
  segments: DonutSegment[];
  centerLabel?: ReactNode;
  centerValue?: ReactNode;
  size?: number;
  /** Espessura do anel em unidades do viewBox (100). */
  thickness?: number;
  track?: string;
  legend?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const r = 50 - thickness / 2 - 1;
  const C = 2 * Math.PI * r;
  const visible = segments.filter((s) => s.value > 0);
  const multi = visible.length > 1;
  // Cantos arredondados avançam thickness/2 em cada ponta: desconta isso + uma folga visual de 2 unidades.
  const gap = 2;
  let acc = 0;
  const arcs = visible.map((s) => {
    const len = (s.value / total) * C;
    // Fatias curtas não cabem as pontas arredondadas (virariam bolinhas): ficam retas.
    const round = multi && len > thickness + gap + 2;
    const dash = !multi ? len : round ? len - thickness - gap : Math.max(0.6, len - gap);
    const offset = !multi ? -acc : round ? -(acc + thickness / 2 + gap / 2) : -(acc + gap / 2);
    const arc = { ...s, dash, offset, round };
    acc += len;
    return arc;
  });
  const label =
    ariaLabel ??
    (total > 0 ? visible.map((s) => `${s.label ?? ""} ${Math.round((s.value / total) * 100)}%`).join(", ") : "Sem dados");
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="relative mx-auto aspect-square w-full [container-type:inline-size]" style={{ maxWidth: size }}>
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={label}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth={thickness} />
          {total > 0 &&
            arcs.map((a, i) => (
              <circle
                key={i}
                className="donut-seg"
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={a.color}
                strokeWidth={thickness}
                strokeLinecap={a.round ? "round" : "butt"}
                strokeDasharray={`${a.dash} ${C}`}
                strokeDashoffset={a.offset}
              />
            ))}
        </svg>
        {(centerValue != null || centerLabel) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-[18%] text-center">
            {centerValue != null && <div className="tnum max-w-full truncate text-[clamp(1rem,13cqw,2rem)] leading-tight font-bold tracking-[-0.03em]">{centerValue}</div>}
            {centerLabel && <div className="mt-0.5 max-w-full text-xs leading-tight opacity-70">{centerLabel}</div>}
          </div>
        )}
      </div>
      {legend && total > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
          {visible.map((s, i) => (
            <li key={i} className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate opacity-80">{s.label}</span>
              <span className="tnum font-semibold">{Math.round((s.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function fmtValue(v: number, format: CountFormat) {
  return format === "money" ? money(v) : Math.round(v).toLocaleString("pt-BR");
}

/**
 * Barras arredondadas em CSS (uma ou duas séries por grupo, ex.: recebido × despesas).
 * `highlight`: índice do grupo em destaque (os demais ficam mais claros).
 */
export function BarChart({
  data,
  series,
  height = 160,
  format = "money",
  highlight,
  className = "",
}: {
  data: { label: string; values: number[] }[];
  series: { label: string; color: string }[];
  height?: number;
  format?: CountFormat;
  highlight?: number;
  className?: string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-slate-600">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
        ))}
      </div>
      <div className="flex items-end justify-between gap-1.5 sm:gap-3" style={{ height }} role="img" aria-label={data.map((d) => `${d.label}: ${d.values.map((v, i) => `${series[i]?.label} ${fmtValue(v, format)}`).join(", ")}`).join("; ")}>
        {data.map((d, gi) => {
          const dim = highlight != null && highlight !== gi;
          return (
            <div key={d.label} className="flex h-full min-w-0 flex-1 items-end justify-center gap-1">
              {d.values.map((v, si) => (
                <span
                  key={si}
                  className="bar-grow block w-full max-w-3.5 rounded-full transition-opacity"
                  title={`${d.label} · ${series[si]?.label}: ${fmtValue(v, format)}`}
                  style={{
                    height: `${Math.max(v > 0 ? 6 : 3, (v / max) * 100)}%`,
                    background: v > 0 ? series[si]?.color : "rgb(15 18 63 / 0.07)",
                    opacity: dim ? 0.4 : 1,
                    ["--i" as string]: gi,
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-1.5 sm:gap-3">
        {data.map((d, gi) => (
          <span key={d.label} className={`min-w-0 flex-1 truncate text-center text-[11px] font-medium ${highlight === gi ? "text-brand-900" : "text-slate-400"}`}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Pílulas segmentadas ("7 dias / 1 mês"). Com `href` em cada item vira navegação por links (servidor);
 * com `value` + `onChange` funciona em componentes cliente.
 */
export function SegmentedTabs({
  items,
  active,
  onChange,
  size = "md",
  className = "",
  ariaLabel,
}: {
  items: { label: ReactNode; href?: string; value?: string; count?: number }[];
  /** `href` ou `value` do item ativo. */
  active?: string;
  onChange?: (value: string) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
}) {
  const h = size === "sm" ? "min-h-9 px-3 text-[13px]" : "min-h-10 px-4 text-sm";
  return (
    <div className={`flex w-fit max-w-full gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-[var(--shadow-card)] [scrollbar-width:none] ${className}`} role="tablist" aria-label={ariaLabel}>
      {items.map((it, i) => {
        const key = it.href ?? it.value ?? String(i);
        const on = active === key;
        const cls = `inline-flex ${h} items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-150 ${
          on ? "bg-brand-900 text-white shadow-[0_4px_10px_-4px_rgb(15_18_63/.5)]" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        }`;
        const content = (
          <>
            {it.label}
            {it.count != null && (
              <span className={`tnum rounded-full px-1.5 text-[11px] leading-5 ${on ? "bg-accent-400 text-brand-950" : "bg-slate-100 text-slate-500"}`}>{it.count}</span>
            )}
          </>
        );
        return it.href ? (
          <Link key={key} href={it.href} className={cls} role="tab" aria-selected={on} aria-current={on ? "page" : undefined}>
            {content}
          </Link>
        ) : (
          <button key={key} type="button" className={cls} role="tab" aria-selected={on} onClick={() => it.value != null && onChange?.(it.value)}>
            {content}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tiles e linhas                                                       */
/* ------------------------------------------------------------------ */

const tileTones = {
  brand: "from-brand-100/90 to-brand-50 text-brand-700",
  accent: "from-accent-200/80 to-accent-50 text-accent-800",
  sky: "from-sky-100 to-sky-50 text-sky-700",
  emerald: "from-emerald-100 to-emerald-50 text-emerald-700",
  violet: "from-violet-100 to-violet-50 text-violet-700",
  rose: "from-rose-100 to-rose-50 text-rose-700",
  navy: "from-brand-800 to-brand-600 text-accent-400",
};
/** Tile de ação rápida (como o "Quick Menu" da referência): fundo tinto, ícone em círculo branco, rótulo em 2 linhas. */
export function QuickTile({ href, icon, label, hint, tone = "brand" }: { href: string; icon: ReactNode; label: string; hint?: string; tone?: keyof typeof tileTones }) {
  const navy = tone === "navy";
  return (
    <Link
      href={href}
      className={`tap group flex min-h-[7.5rem] min-w-0 flex-col justify-between gap-3 rounded-3xl bg-gradient-to-br p-4 transition-[transform,filter] hover:brightness-[1.02] sm:min-h-[8.5rem] sm:p-5 ${tileTones[tone]}`}
    >
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-full [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[2] ${navy ? "bg-white/10 text-accent-400" : "bg-white shadow-[0_4px_12px_-6px_rgb(15_18_63/.25)]"}`}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-[15px] leading-tight font-semibold ${navy ? "text-white" : "text-brand-950"}`}>{label}</span>
        {hint && <span className={`mt-0.5 block truncate text-xs ${navy ? "text-white/60" : "text-slate-500"}`}>{hint}</span>}
      </span>
    </Link>
  );
}

/** Atalho em bloco para grades de ações rápidas (card branco). */
export function Shortcut({ href, icon, label, hint, tone = "brand" }: { href: string; icon: ReactNode; label: string; hint?: string; tone?: IconTone }) {
  return (
    <Link
      href={href}
      className="card card-hover tap group flex min-w-0 flex-col items-center gap-2 px-2 py-4 text-center sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:text-left"
    >
      <IconBox tone={tone} size="lg" round>
        {icon}
      </IconBox>
      <span className="min-w-0">
        <span className="block text-[13px] leading-tight font-semibold text-slate-800 sm:text-sm">{label}</span>
        {hint && <span className="mt-0.5 hidden truncate text-xs text-slate-500 sm:block">{hint}</span>}
      </span>
    </Link>
  );
}

/**
 * Linha estilo transação. `amount` (número) é formatado em R$ com sinal: `sign="in"` (+, verde),
 * `sign="out"` (−, vermelho) ou automático pelo sinal do número. `value` substitui o valor formatado.
 * Use solta (cada linha é um card) com `card`, ou dentro de um card com `divide-y`.
 */
export function TxRow({
  href,
  icon,
  iconTone = "slate",
  avatar,
  title,
  subtitle,
  amount,
  sign,
  value,
  meta,
  card,
  className = "",
}: {
  href?: string;
  icon?: ReactNode;
  iconTone?: IconTone;
  /** Nome para mostrar <Avatar/> no lugar do ícone. */
  avatar?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  amount?: number;
  sign?: "in" | "out";
  value?: ReactNode;
  /** Texto pequeno abaixo do valor. */
  meta?: ReactNode;
  /** Cada linha como card branco separado (estilo da referência). */
  card?: boolean;
  className?: string;
}) {
  const dir = sign ?? (amount != null && amount < 0 ? "out" : "in");
  const abs = amount != null ? Math.abs(amount) : 0;
  const leading = avatar ? (
    <Avatar name={avatar} />
  ) : (
    <IconBox tone={iconTone} size="lg" round>
      {icon ?? (dir === "in" ? <ArrowDownLeft /> : <ArrowUpRight />)}
    </IconBox>
  );
  const body = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] leading-snug font-semibold text-slate-900">{title}</div>
        {subtitle && <div className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className={`tnum text-[15px] leading-snug font-bold ${value != null ? "text-slate-900" : dir === "in" ? "text-emerald-600" : "text-rose-600"}`}>
          {value ?? `${dir === "in" ? "+" : "−"}${money(abs)}`}
        </div>
        {meta && <div className="tnum mt-0.5 text-xs text-slate-500">{meta}</div>}
      </div>
    </>
  );
  const cls = `flex min-h-[4.25rem] min-w-0 items-center gap-3 px-4 py-3 ${card ? "card rounded-[20px]" : "sm:px-5"} ${className}`;
  return href ? (
    <Link href={href} className={`tap ${cls} hover:bg-slate-50/70 active:bg-slate-100/70`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Item com barra de progresso (como "Assets breakdown"). `percent` de 0 a 100; `color` = cor CSS da barra. */
export function ProgressRow({
  icon,
  iconTone = "brand",
  title,
  subtitle,
  value,
  percent,
  color = "var(--data-navy)",
  chip,
  href,
  card,
  className = "",
}: {
  icon?: ReactNode;
  iconTone?: IconTone;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  percent: number;
  color?: string;
  chip?: ReactNode;
  href?: string;
  card?: boolean;
  className?: string;
}) {
  const p = Math.max(0, Math.min(100, percent));
  const body = (
    <>
      <div className="flex items-start gap-3">
        {icon && <IconBox tone={iconTone}>{icon}</IconBox>}
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] leading-snug font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-[13px] text-slate-500">{subtitle}</div>}
        </div>
        {(value != null || chip) && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {value != null && <div className="tnum text-[15px] leading-snug font-bold text-brand-950">{value}</div>}
            {chip}
          </div>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(p)} aria-valuemin={0} aria-valuemax={100}>
        <div className="bar-fill h-full rounded-full" style={{ width: `${p}%`, background: color }} />
      </div>
    </>
  );
  const cls = `block min-w-0 px-4 py-3.5 sm:px-5 ${card ? "card rounded-[20px]" : ""} ${className}`;
  return href ? (
    <Link href={href} className={`tap ${cls} hover:bg-slate-50/70`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ------------------------------------------------------------------ */
/* Estrutura                                                            */
/* ------------------------------------------------------------------ */

/**
 * Cartão em degradê marinho no topo das telas principais (v2: não encosta mais nas bordas).
 * `children` fica dentro do cartão (ex.: <HeroStat />); `overlap` é renderizado logo abaixo, subindo sobre a borda.
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
  /** Conteúdo dentro do cartão, abaixo do título (ex.: <HeroStat />). */
  children?: ReactNode;
  /** Conteúdo que sobrepõe a borda inferior do cartão (ex.: grade de <Stat />). */
  overlap?: ReactNode;
}) {
  return (
    <div className="mb-5 lg:mb-7">
      <section className={`card-navy on-navy relative isolate overflow-hidden px-5 pt-6 sm:px-7 lg:px-9 lg:pt-8 ${overlap ? "pb-14 lg:pb-[4.5rem]" : "pb-6 lg:pb-8"}`}>
        <span className="pointer-events-none absolute -top-20 -right-12 -z-10 h-56 w-56 rounded-full border-[32px] border-white/[.05]" aria-hidden />
        <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div className="min-w-0 max-w-full">
            {eyebrow && <div className="micro mb-2 text-accent-300/90">{eyebrow}</div>}
            <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] sm:text-[2rem]">{title}</h1>
            {subtitle && <div className="mt-1.5 text-[15px] text-white/70">{subtitle}</div>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        {children && <div className="relative mt-6 lg:mt-8">{children}</div>}
      </section>
      {overlap && <div className="relative -mt-9 px-2 sm:px-4 lg:-mt-12 lg:px-6">{overlap}</div>}
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
  plain,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Ícone lucide ao lado do título. */
  icon?: ReactNode;
  description?: ReactNode;
  iconTone?: IconTone;
  /** Título fora do card e conteúdo sem card (para listas de cards soltos). */
  plain?: boolean;
}) {
  const head = (
    <div className={`flex items-center justify-between gap-3 ${plain ? "mb-3 min-h-8 px-1" : "min-h-14 px-4 pt-4 pb-2 sm:px-5"}`}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && <IconBox tone={iconTone}>{icon}</IconBox>}
        <div className="min-w-0">
          <h2 className="text-[17px] leading-snug font-semibold tracking-[-0.01em] text-brand-950">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
  if (plain)
    return (
      <section className="min-w-0">
        {head}
        {children}
      </section>
    );
  return (
    <section className="card min-w-0 overflow-hidden">
      {head}
      {children}
    </section>
  );
}

/** Link discreto para o canto do cabeçalho de uma Section ("Ver todas"). */
export function MoreLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-my-2 -mr-2 inline-flex min-h-10 items-center gap-0.5 rounded-full pr-2 pl-3 text-[13px] font-semibold text-brand-600 transition-colors hover:bg-brand-50 hover:text-brand-700"
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
  const cls = `flex min-h-[4.25rem] items-center gap-3 px-4 py-3 sm:px-5 ${className}`;
  return href ? (
    <Link href={href} className={`tap ${cls} hover:bg-slate-50/70 active:bg-slate-100/70`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
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
      <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-accent-50 text-brand-500 [&>svg]:h-7 [&>svg]:w-7" aria-hidden>
        {icon ?? <Inbox strokeWidth={1.75} />}
      </span>
      {title && <p className="text-base font-semibold text-brand-950">{title}</p>}
      {children && <div className={`max-w-sm text-sm text-slate-500 ${title ? "mt-1" : ""}`}>{children}</div>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Flash({ message, tone = "green" }: { message?: string | null; tone?: "green" | "red" }) {
  if (!message) return null;
  const cls = tone === "red" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800";
  const Icon = tone === "red" ? CircleAlert : CircleCheck;
  return (
    <div className={`mb-4 flex items-start gap-2.5 rounded-2xl px-4 py-3 text-sm ${cls}`} role={tone === "red" ? "alert" : "status"}>
      <Icon className="mt-px h-[18px] w-[18px] shrink-0" strokeWidth={2} aria-hidden />
      <span>{message}</span>
    </div>
  );
}
