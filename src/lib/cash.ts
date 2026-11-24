// Caixa da empresa (funções puras, sem banco: usadas pela tela e pelos testes).
//
// Saldo do caixa = saldo inicial
//                + recebimentos de locação (Payment)
//                + entradas manuais (CashEntry ENTRADA)
//                − despesas (Expense)
//                − saídas manuais (CashEntry SAIDA)
// contando só o que tem data igual ou posterior à data de abertura (o saldo inicial é o que havia no início
// desse dia). Sem data de abertura, conta tudo desde o primeiro lançamento.
import { round2 } from "./format";

export type CashKind = "RECEBIMENTO" | "DESPESA" | "ENTRADA" | "SAIDA";

export const CASH_KIND_LABEL: Record<CashKind, string> = {
  RECEBIMENTO: "Recebimento",
  DESPESA: "Despesa",
  ENTRADA: "Entrada manual",
  SAIDA: "Saída manual",
};

export interface CashMovement {
  kind: CashKind;
  /** AAAA-MM-DD */
  date: string;
  /** Sempre positivo; o sinal vem do tipo. */
  amount: number;
  method: string | null;
}

export interface CashOpening {
  balance: number;
  /** AAAA-MM-DD ou null (desde sempre). */
  date: string | null;
}

export const isInflow = (kind: CashKind) => kind === "RECEBIMENTO" || kind === "ENTRADA";

/** Valor com sinal: + entra no caixa, − sai. */
export function signedAmount(m: Pick<CashMovement, "kind" | "amount">): number {
  return isInflow(m.kind) ? m.amount : -m.amount;
}

/** O movimento conta no caixa? (data igual ou depois da abertura) */
export function countsInCash(date: string, openingDate: string | null): boolean {
  return !openingDate || date >= openingDate;
}

export interface MethodTotal {
  method: string;
  inflow: number;
  outflow: number;
  net: number;
}

export interface CashSummary {
  opening: number;
  openingDate: string | null;
  inflow: number;
  outflow: number;
  balance: number;
  byKind: Record<CashKind, number>;
  /** Movimento líquido por forma de pagamento (sem forma = "Sem forma"), maior movimento primeiro. */
  byMethod: MethodTotal[];
  count: number;
}

export const NO_METHOD = "Sem forma";

/**
 * Saldo do caixa. `until` (AAAA-MM-DD, exclusivo) limita até uma data — ex.: saldo no fim do mês = until 1º dia do mês seguinte.
 */
export function cashSummary(opening: CashOpening, movements: readonly CashMovement[], until?: string): CashSummary {
  const byKind: Record<CashKind, number> = { RECEBIMENTO: 0, DESPESA: 0, ENTRADA: 0, SAIDA: 0 };
  const methods = new Map<string, MethodTotal>();
  let inflow = 0;
  let outflow = 0;
  let count = 0;
  for (const m of movements) {
    if (!countsInCash(m.date, opening.date)) continue;
    if (until && m.date >= until) continue;
    count++;
    byKind[m.kind] += m.amount;
    const key = m.method?.trim() || NO_METHOD;
    const row = methods.get(key) ?? { method: key, inflow: 0, outflow: 0, net: 0 };
    if (isInflow(m.kind)) {
      inflow += m.amount;
      row.inflow += m.amount;
    } else {
      outflow += m.amount;
      row.outflow += m.amount;
    }
    methods.set(key, row);
  }
  for (const k of Object.keys(byKind) as CashKind[]) byKind[k] = round2(byKind[k]);
  const byMethod = [...methods.values()]
    .map((r) => ({ method: r.method, inflow: round2(r.inflow), outflow: round2(r.outflow), net: round2(r.inflow - r.outflow) }))
    .sort((a, b) => b.inflow + b.outflow - (a.inflow + a.outflow));
  return {
    opening: round2(opening.balance),
    openingDate: opening.date,
    inflow: round2(inflow),
    outflow: round2(outflow),
    balance: round2(opening.balance + inflow - outflow),
    byKind,
    byMethod,
    count,
  };
}

export interface PeriodSummary {
  inflow: number;
  outflow: number;
  net: number;
  count: number;
  byKind: Record<CashKind, number>;
}

/** Entradas e saídas do período [from, to) que contam no caixa. */
export function periodSummary(movements: readonly CashMovement[], from: string, to: string, openingDate: string | null = null): PeriodSummary {
  const byKind: Record<CashKind, number> = { RECEBIMENTO: 0, DESPESA: 0, ENTRADA: 0, SAIDA: 0 };
  let inflow = 0;
  let outflow = 0;
  let count = 0;
  for (const m of movements) {
    if (m.date < from || m.date >= to || !countsInCash(m.date, openingDate)) continue;
    count++;
    byKind[m.kind] += m.amount;
    if (isInflow(m.kind)) inflow += m.amount;
    else outflow += m.amount;
  }
  for (const k of Object.keys(byKind) as CashKind[]) byKind[k] = round2(byKind[k]);
  return { inflow: round2(inflow), outflow: round2(outflow), net: round2(inflow - outflow), count, byKind };
}

/** Filtro do extrato. */
export type StatementFilter = "tudo" | "entradas" | "saidas";

export function filterStatement<T extends Pick<CashMovement, "kind">>(rows: readonly T[], filter: StatementFilter): T[] {
  if (filter === "entradas") return rows.filter((r) => isInflow(r.kind));
  if (filter === "saidas") return rows.filter((r) => !isInflow(r.kind));
  return [...rows];
}

/** Agrupa linhas do extrato por dia (mais recente primeiro), com o total líquido do dia. */
export function groupByDay<T extends Pick<CashMovement, "kind" | "amount" | "date">>(rows: readonly T[]): { date: string; net: number; rows: T[] }[] {
  const map = new Map<string, T[]>();
  for (const r of [...rows].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))) {
    const list = map.get(r.date) ?? [];
    list.push(r);
    map.set(r.date, list);
  }
  return [...map.entries()].map(([date, list]) => ({ date, net: round2(list.reduce((s, r) => s + signedAmount(r), 0)), rows: list }));
}
