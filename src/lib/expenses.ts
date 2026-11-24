import "server-only";
import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { addDays, toISODate, today } from "./dates";
import { sortCategories, type ExpenseCategoryData } from "./expense-categories";
import { rentalCode } from "./format";

export * from "./expense-categories";

/** Todas as categorias (ativas e inativas), na ordem de exibição. Uma consulta por requisição. */
export const getCategories = cache(async (): Promise<ExpenseCategoryData[]> => {
  const rows = await db.expenseCategory.findMany({
    select: { id: true, name: true, color: true, icon: true, isFreight: true, active: true, sortOrder: true },
  });
  return sortCategories(rows);
});

/** Quantas despesas cada categoria tem (para saber se pode excluir). */
export async function getCategoryUsage(): Promise<Map<string, { count: number; total: number }>> {
  const rows = await db.expense.groupBy({ by: ["category"], _count: { _all: true }, _sum: { amount: true } });
  return new Map(rows.map((r) => [r.category, { count: r._count._all, total: Number(r._sum.amount ?? 0) }]));
}

/** Despesa pronta para tela/cliente (valores em número, datas em AAAA-MM-DD). */
export interface ExpenseRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  method: string | null;
  rentalId: string | null;
  rental: { id: string; number: number; code: string; customerName: string; siteAddress: string } | null;
}

const expenseInclude = {
  rental: { select: { id: true, number: true, siteAddress: true, customer: { select: { name: true } } } },
} satisfies Prisma.ExpenseInclude;

type ExpenseWithRental = Prisma.ExpenseGetPayload<{ include: typeof expenseInclude }>;

function toRow(e: ExpenseWithRental): ExpenseRow {
  return {
    id: e.id,
    date: toISODate(e.date),
    category: e.category,
    description: e.description,
    amount: Number(e.amount),
    method: e.method,
    rentalId: e.rentalId,
    rental: e.rental
      ? { id: e.rental.id, number: e.rental.number, code: rentalCode(e.rental.number), customerName: e.rental.customer.name, siteAddress: e.rental.siteAddress }
      : null,
  };
}

/** Despesas com data em [from, to). */
export async function getMonthExpenses(from: Date, to: Date): Promise<ExpenseRow[]> {
  const rows = await db.expense.findMany({
    where: { date: { gte: from, lt: to } },
    include: expenseInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(toRow);
}

/** Despesas ligadas a uma locação (para a página da locação). */
export async function getRentalExpenses(rentalId: string): Promise<ExpenseRow[]> {
  const rows = await db.expense.findMany({
    where: { rentalId },
    include: expenseInclude,
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toRow);
}

export interface RentalOption {
  id: string;
  label: string;
}

/**
 * Locações para ligar a uma despesa: ativas e encerradas recentes (últimos 120 dias),
 * mais as que já estão ligadas a alguma despesa mostrada (para a edição não perder a ligação).
 */
export async function getExpenseRentalOptions(keepIds: string[] = []): Promise<RentalOption[]> {
  const since = addDays(today(), -120);
  const rows = await db.rental.findMany({
    where: {
      OR: [
        { stage: "ATIVA" },
        { stage: "ENCERRADA", OR: [{ closedAt: { gte: since } }, { startDate: { gte: since } }] },
        ...(keepIds.length ? [{ id: { in: keepIds } }] : []),
      ],
    },
    select: { id: true, number: true, stage: true, siteAddress: true, customer: { select: { name: true } } },
    orderBy: [{ number: "desc" }],
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    label: [rentalCode(r.number), r.customer.name, r.siteAddress].filter(Boolean).join(" · ") + (r.stage === "ENCERRADA" ? " (encerrada)" : ""),
  }));
}
