import "server-only";
import { db } from "./db";
import { parseISODate, toISODate } from "./dates";
import { getMonthExpenses, type ExpenseRow } from "./expenses";
import { rentalCode } from "./format";
import type { CashKind, CashMovement, CashOpening } from "./cash";

/** Saldo inicial e data de abertura do caixa (Company id 1). */
export async function getCashOpening(): Promise<CashOpening> {
  const c = await db.company.findUnique({ where: { id: 1 }, select: { cashOpeningBalance: true, cashOpeningDate: true } });
  return { balance: Number(c?.cashOpeningBalance ?? 0), date: c?.cashOpeningDate ? toISODate(c.cashOpeningDate) : null };
}

/** Todos os movimentos que contam no caixa (só data, valor e forma: leve). */
export async function getCashMovements(opening: CashOpening): Promise<CashMovement[]> {
  const since = opening.date ? { date: { gte: parseISODate(opening.date)! } } : {};
  const select = { date: true, amount: true, method: true } as const;
  const [payments, expenses, entries] = await Promise.all([
    db.payment.findMany({ where: since, select }),
    db.expense.findMany({ where: since, select }),
    db.cashEntry.findMany({ where: since, select: { ...select, kind: true } }),
  ]);
  const row = (kind: CashKind) => (r: { date: Date; amount: unknown; method: string | null }): CashMovement => ({
    kind,
    date: toISODate(r.date),
    amount: Number(r.amount),
    method: r.method,
  });
  return [
    ...payments.map(row("RECEBIMENTO")),
    ...expenses.map(row("DESPESA")),
    ...entries.map((e) => row(e.kind === "SAIDA" ? "SAIDA" : "ENTRADA")(e)),
  ];
}

export interface CashEntryRow {
  id: string;
  date: string;
  kind: "ENTRADA" | "SAIDA";
  description: string;
  amount: number;
  method: string | null;
}

/** Linha do extrato unificado. */
export interface StatementRow extends CashMovement {
  key: string;
  title: string;
  subtitle: string;
  /** Recebimento: link da locação. */
  href?: string;
  expense?: ExpenseRow;
  entry?: CashEntryRow;
}

/** Extrato do período [from, to): recebimentos, despesas e movimentações manuais. */
export async function getStatement(from: Date, to: Date): Promise<StatementRow[]> {
  const where = { date: { gte: from, lt: to } };
  const [payments, expenses, entries] = await Promise.all([
    db.payment.findMany({
      where,
      select: { id: true, date: true, amount: true, method: true, note: true, rental: { select: { id: true, number: true, customer: { select: { name: true } } } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    getMonthExpenses(from, to),
    db.cashEntry.findMany({ where, orderBy: [{ date: "desc" }, { createdAt: "desc" }] }),
  ]);
  const rows: StatementRow[] = [];
  for (const p of payments) {
    rows.push({
      key: `p-${p.id}`,
      kind: "RECEBIMENTO",
      date: toISODate(p.date),
      amount: Number(p.amount),
      method: p.method,
      title: p.rental.customer.name,
      subtitle: [rentalCode(p.rental.number), p.note].filter(Boolean).join(" · "),
      href: `/locacoes/${p.rental.id}`,
    });
  }
  for (const e of expenses) {
    rows.push({ key: `e-${e.id}`, kind: "DESPESA", date: e.date, amount: e.amount, method: e.method, title: e.description, subtitle: e.rental ? `${e.rental.code} · ${e.rental.customerName}` : "", expense: e });
  }
  for (const c of entries) {
    const kind = c.kind === "SAIDA" ? "SAIDA" : "ENTRADA";
    const entry: CashEntryRow = { id: c.id, date: toISODate(c.date), kind, description: c.description, amount: Number(c.amount), method: c.method };
    rows.push({ key: `c-${c.id}`, kind, date: entry.date, amount: entry.amount, method: c.method, title: c.description, subtitle: "", entry });
  }
  // Mais recente primeiro (o sort é estável: dentro do dia mantém a ordem de criação de cada tipo).
  return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
