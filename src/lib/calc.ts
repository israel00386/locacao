// Regras de cálculo da locação. Funções puras (sem banco) para poder testar.
import { calcPeriods, type PeriodInput } from "./periods";
import { inclusiveDays, maxDate } from "./dates";

const minDate = (a: Date, b: Date) => (a.getTime() <= b.getTime() ? a : b);
import { round2, type Period } from "./format";

export type Stage = "ORCAMENTO" | "ATIVA" | "ENCERRADA" | "CANCELADA";

export interface ReturnInput {
  qty: number;
  date: Date;
  chargedDays: number | null;
}

export interface ItemInput {
  id?: string;
  qty: number;
  unitPrice: number;
  daysOverride: number | null;
  returns: ReturnInput[];
  /** Retirada própria (acréscimo feito com a locação ativa). Vazio = retirada da locação. */
  startDate?: Date | null;
  /** Previsão própria do acréscimo. Vazio = previsão da locação. */
  expectedEndDate?: Date | null;
}

export interface RentalInput {
  periods?: PeriodInput[];
  stage: Stage | string;
  startDate: Date;
  expectedEndDate: Date | null;
  discount: number;
  extras: { amount: number }[];
  payments: { amount: number }[];
  items: ItemInput[];
  /**
   * Cobrar os dias depois da previsão (dias excedentes). Padrão: não — o valor fechado no contrato
   * (retirada → previsão) não aumenta se a busca atrasar; só aumenta se o dono pedir para recalcular.
   */
  chargeOverdue?: boolean;
}

export type ItemStatus = "NA_OBRA" | "ATRASADO" | "DEVOLVIDO";

export interface ItemCalc {
  /** Acréscimo de equipamento (tem retirada própria). */
  addition: boolean;
  /** Retirada efetiva do item (própria ou da locação). */
  startDate: Date;
  /** Previsão efetiva do item (própria ou da locação). */
  expectedEndDate: Date | null;
  /** Dias cobrados de cada devolução, na mesma ordem de `returns`. */
  returnDays: number[];
  /** Valor dos dias excedentes (depois da previsão) deste item — cobrado ou não, conforme a opção da locação. */
  excessValue: number;
  /** Este item ainda tem material na obra depois da própria previsão. */
  overdue: boolean;
  overdueDays: number;
  status: ItemStatus;
  returnedQty: number;
  outstandingQty: number;
  /** Dias usados para a parte que ainda está na obra. */
  outstandingDays: number;
  /** Valor por dia de tudo que foi contratado (qtd × valor unitário). */
  dailyValue: number;
  total: number;
}

export interface RentalCalc {
  periods: ReturnType<typeof calcPeriods>;
  financialOverdue: boolean;
  overdueOpen: number;
  attention: boolean;
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
  /** Próxima previsão de devolução entre os itens que ainda estão na obra (sem atraso). */
  nextExpectedEnd: Date | null;
  /** Tem acréscimo de equipamento. */
  hasAdditions: boolean;
  /** Os dias excedentes estão sendo cobrados (opção ligada). */
  chargeOverdue: boolean;
  /** Valor dos dias excedentes: o que entra no total se a opção for ligada (ou o que já entrou, se ligada). */
  excessValue: number;
  financial: "PAGO" | "PARCIAL" | "EM_ABERTO" | "SEM_VALOR";
}

/**
 * Dias que a parte ainda não devolvida conta.
 * - Orçamento: da retirada até a previsão (ou 1 dia).
 * - Ativa: da retirada até a previsão (valor fechado). Passou da previsão: só conta até hoje se
 *   `chargeOverdue` (cobrar dias excedentes) estiver ligado. Sem previsão: até hoje.
 */
export function outstandingDaysFor(
  stage: string,
  start: Date,
  expectedEnd: Date | null,
  today: Date,
  chargeOverdue = false,
): number {
  if (stage === "ORCAMENTO") return expectedEnd ? inclusiveDays(start, expectedEnd) : 1;
  if (expectedEnd && !chargeOverdue) return inclusiveDays(start, expectedEnd);
  const end = expectedEnd ? maxDate(expectedEnd, today) : maxDate(start, today);
  return inclusiveDays(start, end);
}

/** Dias padrão de uma devolução: até a data da devolução, limitado à previsão se não cobra excedentes. */
export function returnDaysFor(start: Date, expectedEnd: Date | null, returnDate: Date, chargeOverdue = false): number {
  const until = expectedEnd && !chargeOverdue ? minDate(returnDate, expectedEnd) : returnDate;
  return Math.max(1, inclusiveDays(start, until));
}

/** Datas efetivas do item: as próprias (acréscimo) ou as da locação. */
export function itemDates(
  item: Pick<ItemInput, "startDate" | "expectedEndDate">,
  rental: Pick<RentalInput, "startDate" | "expectedEndDate">,
): { start: Date; end: Date | null } {
  return { start: item.startDate ?? rental.startDate, end: item.expectedEndDate ?? rental.expectedEndDate };
}

export function calcItem(
  item: ItemInput,
  rental: Pick<RentalInput, "stage" | "startDate" | "expectedEndDate" | "chargeOverdue">,
  today: Date,
): ItemCalc {
  const { start, end } = itemDates(item, rental);
  const charge = !!rental.chargeOverdue;
  const returnedQty = item.returns.reduce((s, r) => s + r.qty, 0);
  const outstandingQty = Math.max(0, item.qty - returnedQty);

  // Calcula com e sem os dias excedentes: o total usa a opção da locação; a diferença vira `excessValue`.
  const outDays = (withExcess: boolean) => item.daysOverride ?? outstandingDaysFor(rental.stage, start, end, today, withExcess);
  const retDays = (withExcess: boolean) => item.returns.map((r) => r.chargedDays ?? returnDaysFor(start, end, r.date, withExcess));
  const valueOf = (withExcess: boolean) => {
    const rd = retDays(withExcess);
    let v = 0;
    item.returns.forEach((r, i) => {
      v += r.qty * item.unitPrice * rd[i];
    });
    return v + outstandingQty * item.unitPrice * outDays(withExcess);
  };
  const outstandingDays = outDays(charge);
  const returnDays = retDays(charge);
  const total = valueOf(charge);
  const excessValue = round2(valueOf(true) - valueOf(false));

  const overdue = rental.stage === "ATIVA" && outstandingQty > 0 && !!end && end.getTime() < today.getTime();
  const overdueDays = overdue ? inclusiveDays(end!, today) - 1 : 0;
  const status: ItemStatus = outstandingQty === 0 ? "DEVOLVIDO" : overdue ? "ATRASADO" : "NA_OBRA";

  return {
    addition: !!item.startDate,
    startDate: start,
    expectedEndDate: end,
    returnDays,
    overdue,
    overdueDays,
    status,
    returnedQty,
    outstandingQty,
    outstandingDays,
    dailyValue: round2(item.qty * item.unitPrice),
    total: round2(total),
    excessValue,
  };
}

/** Selo de situação de um item (mesmas cores da situação da locação). */
export function itemSituation(status: ItemStatus): { label: string; tone: Tone } {
  if (status === "DEVOLVIDO") return { label: "Devolvido", tone: "yellow" };
  if (status === "ATRASADO") return { label: "Atrasado", tone: "red" };
  return { label: "Na obra", tone: "sky" };
}

export function calcRental(r: RentalInput, today: Date): RentalCalc {
  const items = r.items.map((i) => calcItem(i, r, today));
  const itemsTotal = round2(items.reduce((s, i) => s + i.total, 0));
  const extrasTotal = round2(r.extras.reduce((s, e) => s + e.amount, 0));
  const discount = round2(r.discount || 0);
  const outstandingQty = items.reduce((s, i) => s + i.outstandingQty, 0);
  const allReturned = r.items.length > 0 && outstandingQty === 0;
  const periodCalcs = calcPeriods(r.periods ?? [], r.payments.reduce((s, p) => s + p.amount, 0), today, !!r.chargeOverdue,
    r.items.flatMap((i) => i.returns.map((x) => ({ ...x, itemId: i.id ?? "" }))), allReturned || r.stage === "ENCERRADA");
  const total = periodCalcs.length ? round2(periodCalcs.reduce((s, p) => s + p.total, 0)) : round2(itemsTotal + extrasTotal - discount);
  const paid = round2(r.payments.reduce((s, p) => s + p.amount, 0));
  const open = round2(total - paid);

  // Atrasada se qualquer item com material na obra passou da própria previsão; vale o maior atraso.
  const overdue = items.some((i) => i.overdue);
  const overdueDays = Math.max(0, ...items.map((i) => i.overdueDays));

  const days = Math.max(0, ...items.map((i) => Math.max(i.outstandingQty > 0 ? i.outstandingDays : 0, ...i.returnDays, 0)));

  let nextExpectedEnd: Date | null = null;
  for (const i of items) {
    if (i.outstandingQty > 0 && !i.overdue && i.expectedEndDate && (!nextExpectedEnd || i.expectedEndDate < nextExpectedEnd)) {
      nextExpectedEnd = i.expectedEndDate;
    }
  }
  const hasAdditions = items.some((i) => i.addition);
  const chargeOverdue = !!r.chargeOverdue;
  const excessValue = periodCalcs.length ? round2(periodCalcs.reduce((s, p) => s + p.excess, 0)) : round2(items.reduce((s, i) => s + i.excessValue, 0));

  let financial: RentalCalc["financial"] = "EM_ABERTO";
  if (total <= 0) financial = "SEM_VALOR";
  else if (open <= 0.009) financial = "PAGO";
  else if (paid > 0) financial = "PARCIAL";

  const live = r.stage === "ATIVA" || r.stage === "ENCERRADA";
  const overdueOpen = !live ? 0 : periodCalcs.length
    ? round2(periodCalcs.filter((p) => p.overdue).reduce((s, p) => s + p.open, 0))
    : (overdue || allReturned || r.stage === "ENCERRADA") ? Math.max(0, open) : 0;
  const financialOverdue = overdueOpen > 0.009;
  return { periods: periodCalcs, financialOverdue, overdueOpen, attention: live && (overdue || financialOverdue), items, itemsTotal, extrasTotal, discount, total, paid, open, outstandingQty, allReturned, overdue, overdueDays, days, nextExpectedEnd, hasAdditions, chargeOverdue, excessValue, financial };
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

/**
 * Valor por dia sugerido para um equipamento. Prioridade:
 * último valor cobrado deste cliente → tabela de preços → último valor cobrado de qualquer cliente.
 */
export function suggestUnitPrice(
  eq: (PriceTable & { lastPrice: number | null }) | undefined,
  customerPrice: number | null | undefined,
  period: string,
): { unitPrice: number | null; source?: string } {
  if (customerPrice != null) return { unitPrice: customerPrice, source: "último valor deste cliente" };
  const table = eq ? priceFor(eq, period) : null;
  if (table != null) return { unitPrice: table, source: "tabela de preços" };
  if (eq?.lastPrice != null) return { unitPrice: eq.lastPrice, source: "último valor cobrado" };
  return { unitPrice: null };
}

export type Tone = "gray" | "sky" | "yellow" | "green" | "blue" | "red" | "amber";

/**
 * Situação do material (cores pedidas pelo cliente):
 * Na obra = azul claro · Devolvido = amarelo claro · Atrasada = vermelho.
 */
export function situation(stage: string, c: Pick<RentalCalc, "overdue" | "allReturned" | "outstandingQty">): {
  label: string;
  tone: Tone;
} {
  if (stage === "ORCAMENTO") return { label: "Orçamento", tone: "gray" };
  if (stage === "CANCELADA") return { label: "Cancelada", tone: "gray" };
  if (stage === "ENCERRADA") return { label: "Devolvido", tone: "yellow" };
  if (c.overdue) return { label: "Atrasada", tone: "red" };
  if (c.allReturned) return { label: "Devolvido", tone: "yellow" };
  return { label: "Na obra", tone: "sky" };
}

export type PaymentStatus = "A_VENCER" | "PAGO" | "ATRASADO" | "FINALIZADO" | "SEM_VALOR";

/**
 * Situação do pagamento (cores pedidas pelo cliente):
 * A vencer = cinza claro · Pago = verde · Em aberto → Atrasado = vermelho · Finalizado = azul.
 * - Finalizado: locação encerrada e quitada.
 * - Pago: quitada, mas a locação ainda não foi encerrada.
 * - Atrasado: tem saldo e já passou do prazo (material atrasado, já devolvido ou locação encerrada).
 * - A vencer: tem saldo, mas ainda está dentro do prazo.
 */
export function paymentStatus(
  stage: string,
  c: Pick<RentalCalc, "financial" | "overdue" | "allReturned" | "paid" | "open"> & Partial<Pick<RentalCalc, "financialOverdue">>,
): { status: PaymentStatus; label: string; tone: Tone; partial: boolean } {
  const partial = c.paid > 0 && c.open > 0.009;
  if (c.financial === "SEM_VALOR") return { status: "SEM_VALOR", label: "Sem valor", tone: "gray", partial: false };
  if (c.financial === "PAGO") {
    return stage === "ENCERRADA"
      ? { status: "FINALIZADO", label: "Finalizado", tone: "blue", partial: false }
      : { status: "PAGO", label: "Pago", tone: "green", partial: false };
  }
  if (c.financialOverdue ?? (stage === "ENCERRADA" || c.overdue || c.allReturned)) {
    return { status: "ATRASADO", label: partial ? "Atrasado · pago em parte" : "Atrasado", tone: "red", partial };
  }
  return { status: "A_VENCER", label: partial ? "A vencer · pago em parte" : "A vencer", tone: "gray", partial };
}

/** @deprecated use paymentStatus(stage, calc) */
export function financialLabel(f: RentalCalc["financial"]): { label: string; tone: Tone } {
  switch (f) {
    case "PAGO":
      return { label: "Pago", tone: "green" };
    case "PARCIAL":
      return { label: "Pago em parte", tone: "gray" };
    case "SEM_VALOR":
      return { label: "Sem valor", tone: "gray" };
    default:
      return { label: "Em aberto", tone: "red" };
  }
}

export interface OnSiteItemInput {
  name: string;
  /** Unidades que ainda estão na obra. */
  outstandingQty: number;
  unitPrice: number;
  /** Retirada efetiva do item. */
  start: Date;
  /** Dias cobrados à mão para a parte na obra (vazio = conta até a data escolhida). */
  daysOverride: number | null;
  /** Valor já cobrado pelas unidades devolvidas. */
  returnedValue: number;
  /** Previsão do item: sem cobrar excedentes, a conta para nela (valor fechado). */
  end?: Date | null;
}

/**
 * Quanto o cliente deve se o material que está na obra for buscado em `until`
 * (conta o dia da retirada e o dia da busca). Soma o já devolvido, taxas e desconto, e desconta o que foi pago.
 */
export function onSiteValue(
  items: OnSiteItemInput[],
  until: Date,
  money: { extras: number; discount: number; paid: number; chargeOverdue?: boolean },
) {
  const lines = items
    .filter((i) => i.outstandingQty > 0)
    .map((i) => {
      const capped = i.end && !money.chargeOverdue ? minDate(until, i.end) : until;
      const days = i.daysOverride ?? (capped.getTime() >= i.start.getTime() ? inclusiveDays(i.start, capped) : 0);
      const fullDays = i.daysOverride ?? (until.getTime() >= i.start.getTime() ? inclusiveDays(i.start, until) : 0);
      return {
        name: i.name,
        qty: i.outstandingQty,
        unitPrice: i.unitPrice,
        days,
        value: round2(i.outstandingQty * i.unitPrice * days),
        /** Dias depois da previsão que não entram (valor fechado). */
        excessDays: Math.max(0, fullDays - days),
        excessValue: round2(i.outstandingQty * i.unitPrice * Math.max(0, fullDays - days)),
      };
    });
  const onSiteTotal = round2(lines.reduce((s, l) => s + l.value, 0));
  const returnedTotal = round2(items.reduce((s, i) => s + i.returnedValue, 0));
  const total = round2(onSiteTotal + returnedTotal + money.extras - money.discount);
  const open = round2(total - money.paid);
  const excessValue = round2(lines.reduce((s, l) => s + l.excessValue, 0));
  return { lines, onSiteTotal, returnedTotal, total, paid: round2(money.paid), open, excessValue };
}
