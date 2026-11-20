// Regras de cálculo da locação. Funções puras (sem banco) para poder testar.
import { inclusiveDays, maxDate } from "./dates";
import { round2, type Period } from "./format";

export type Stage = "ORCAMENTO" | "ATIVA" | "ENCERRADA" | "CANCELADA";

export interface ReturnInput {
  qty: number;
  date: Date;
  chargedDays: number | null;
}

export interface ItemInput {
  qty: number;
  unitPrice: number;
  daysOverride: number | null;
  returns: ReturnInput[];
}

export interface RentalInput {
  stage: Stage | string;
  startDate: Date;
  expectedEndDate: Date | null;
  discount: number;
  extras: { amount: number }[];
  payments: { amount: number }[];
  items: ItemInput[];
}

export interface ItemCalc {
  returnedQty: number;
  outstandingQty: number;
  /** Dias usados para a parte que ainda está na obra. */
  outstandingDays: number;
  /** Valor por dia de tudo que foi contratado (qtd × valor unitário). */
  dailyValue: number;
  total: number;
}

export interface RentalCalc {
  items: ItemCalc[];
  itemsTotal: number;
  extrasTotal: number;
  discount: number;
  total: number;
  paid: number;
  open: number;
  outstandingQty: number;
  allReturned: boolean;
  /** Ainda tem material na obra depois da data prevista. */
  overdue: boolean;
  /** Dias de atraso (0 se não está atrasada). */
  overdueDays: number;
  /** Maior quantidade de dias cobrada entre os itens (para exibir). */
  days: number;
  financial: "PAGO" | "PARCIAL" | "EM_ABERTO" | "SEM_VALOR";
}

/**
 * Dias que a parte ainda não devolvida conta.
 * - Orçamento: da retirada até a previsão (ou 1 dia).
 * - Ativa: da retirada até a previsão; se passou da previsão, até hoje (dias excedentes são cobrados).
 */
export function outstandingDaysFor(
  stage: string,
  start: Date,
  expectedEnd: Date | null,
  today: Date,
): number {
  if (stage === "ORCAMENTO") return expectedEnd ? inclusiveDays(start, expectedEnd) : 1;
  const end = expectedEnd ? maxDate(expectedEnd, today) : maxDate(start, today);
  return inclusiveDays(start, end);
}

export function calcItem(item: ItemInput, rental: Pick<RentalInput, "stage" | "startDate" | "expectedEndDate">, today: Date): ItemCalc {
  const returnedQty = item.returns.reduce((s, r) => s + r.qty, 0);
  const outstandingQty = Math.max(0, item.qty - returnedQty);
  const outstandingDays =
    item.daysOverride ?? outstandingDaysFor(rental.stage, rental.startDate, rental.expectedEndDate, today);

  let total = 0;
  for (const r of item.returns) {
    const days = r.chargedDays ?? inclusiveDays(rental.startDate, r.date);
    total += r.qty * item.unitPrice * days;
  }
  total += outstandingQty * item.unitPrice * outstandingDays;

  return {
    returnedQty,
    outstandingQty,
    outstandingDays,
    dailyValue: round2(item.qty * item.unitPrice),
    total: round2(total),
  };
}

export function calcRental(r: RentalInput, today: Date): RentalCalc {
  const items = r.items.map((i) => calcItem(i, r, today));
  const itemsTotal = round2(items.reduce((s, i) => s + i.total, 0));
  const extrasTotal = round2(r.extras.reduce((s, e) => s + e.amount, 0));
  const discount = round2(r.discount || 0);
  const total = round2(itemsTotal + extrasTotal - discount);
  const paid = round2(r.payments.reduce((s, p) => s + p.amount, 0));
  const open = round2(total - paid);
  const outstandingQty = items.reduce((s, i) => s + i.outstandingQty, 0);
  const allReturned = r.items.length > 0 && outstandingQty === 0;

  const overdue =
    r.stage === "ATIVA" && outstandingQty > 0 && !!r.expectedEndDate && r.expectedEndDate.getTime() < today.getTime();
  const overdueDays = overdue ? inclusiveDays(r.expectedEndDate!, today) - 1 : 0;

  const days = Math.max(
    0,
    ...r.items.map((it, idx) => {
      const fromReturns = it.returns.map((x) => x.chargedDays ?? inclusiveDays(r.startDate, x.date));
      return Math.max(items[idx].outstandingQty > 0 ? items[idx].outstandingDays : 0, ...fromReturns, 0);
    }),
  );

  let financial: RentalCalc["financial"] = "EM_ABERTO";
  if (total <= 0) financial = "SEM_VALOR";
  else if (open <= 0.009) financial = "PAGO";
  else if (paid > 0) financial = "PARCIAL";

  return { items, itemsTotal, extrasTotal, discount, total, paid, open, outstandingQty, allReturned, overdue, overdueDays, days, financial };
}

/** Faixa de preço sugerida pela duração da locação. */
export function suggestPeriod(days: number): Period {
  if (days >= 30) return "MENSAL";
  if (days >= 15) return "QUINZENAL";
  if (days >= 7) return "SEMANAL";
  return "DIARIA";
}

export interface PriceTable {
  priceDaily: number | null;
  priceWeekly: number | null;
  priceBiweekly: number | null;
  priceMonthly: number | null;
}

/** Valor unitário/dia da tabela para a faixa. Se a faixa não tiver preço, usa a mais próxima preenchida. */
export function priceFor(eq: PriceTable, period: string): number | null {
  const order: [string, number | null][] = [
    ["DIARIA", eq.priceDaily],
    ["SEMANAL", eq.priceWeekly],
    ["QUINZENAL", eq.priceBiweekly],
    ["MENSAL", eq.priceMonthly],
  ];
  const idx = order.findIndex(([p]) => p === period);
  if (idx < 0) return null; // ESPECIAL: valor digitado à mão
  if (order[idx][1] != null) return order[idx][1];
  for (let d = 1; d < order.length; d++) {
    for (const j of [idx - d, idx + d]) {
      if (j >= 0 && j < order.length && order[j][1] != null) return order[j][1];
    }
  }
  return null;
}

/** Situação para mostrar ao usuário (combina etapa, atraso e devolução). */
export function situation(stage: string, c: Pick<RentalCalc, "overdue" | "allReturned" | "outstandingQty">): {
  label: string;
  tone: "gray" | "blue" | "red" | "amber" | "green";
} {
  if (stage === "ORCAMENTO") return { label: "Orçamento", tone: "gray" };
  if (stage === "CANCELADA") return { label: "Cancelada", tone: "gray" };
  if (stage === "ENCERRADA") return { label: "Encerrada", tone: "green" };
  if (c.overdue) return { label: "Atrasada", tone: "red" };
  if (c.allReturned) return { label: "Devolvida", tone: "amber" };
  return { label: "Na obra", tone: "blue" };
}

export function financialLabel(f: RentalCalc["financial"]): { label: string; tone: "green" | "amber" | "red" | "gray" } {
  switch (f) {
    case "PAGO":
      return { label: "Pago", tone: "green" };
    case "PARCIAL":
      return { label: "Pago em parte", tone: "amber" };
    case "SEM_VALOR":
      return { label: "Sem valor", tone: "gray" };
    default:
      return { label: "Em aberto", tone: "red" };
  }
}
