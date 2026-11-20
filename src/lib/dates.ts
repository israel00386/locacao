// Datas "só dia" (sem hora). No banco ficam como DATE e chegam como meia-noite UTC.
// Tudo aqui trabalha em UTC para nunca "pular" um dia por causa de fuso.

const DAY = 86_400_000;
const TZ = "America/Fortaleza";

/** "AAAA-MM-DD" de hoje no fuso da empresa. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function today(): Date {
  return parseISODate(todayISO())!;
}

/** Converte "AAAA-MM-DD" em Date (meia-noite UTC). Vazio → null. */
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function toISODate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** dd/mm/aaaa */
export function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  const iso = toISODate(d);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** dd/mm */
export function fmtDateShort(d: Date | null | undefined): string {
  if (!d) return "—";
  const iso = toISODate(d);
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export function weekday(d: Date): string {
  return WEEKDAYS[d.getUTCDay()];
}

/** Diferença em dias corridos (b − a). */
export function diffDays(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / DAY);
}

/** Dias contando o primeiro e o último (21/08 → 19/09 = 30 dias), como na planilha. */
export function inclusiveDays(start: Date, end: Date): number {
  return Math.max(1, diffDays(start, end) + 1);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

export function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}
