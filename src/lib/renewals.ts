import { Prisma } from "@prisma/client";
import { db } from "./db";
import { addDays, inclusiveDays, parseISODate, toISODate } from "./dates";
import { rentalInclude, toCalcInput } from "./rentals";
import { calcRental } from "./calc";
import type { PeriodItem } from "./periods";

export class RenewalError extends Error {}

function date(value: string) {
  const d = parseISODate(value);
  if (!d || toISODate(d) !== value) throw new RenewalError("Informe datas válidas.");
  return d;
}

/** Uma transação e um bloqueio da locação impedem duas renovações do mesmo período. */
export async function renewRentalPeriod(rentalId: string, input: {
  previousEnd: string; endDate: string; dueDate: string; amount: number;
}) {
  const endDate = date(input.endDate);
  const dueDate = date(input.dueDate);
  if (!Number.isFinite(input.amount) || input.amount < 0 || input.amount > 9999999999.99) {
    throw new RenewalError("Informe um valor válido para a renovação.");
  }
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Rental" WHERE id = ${rentalId} FOR UPDATE`;
    const r = await tx.rental.findUnique({ where: { id: rentalId }, include: rentalInclude });
    if (!r || r.stage !== "ATIVA") throw new RenewalError("Só é possível renovar uma locação ativa.");
    const previous = r.periods.at(-1);
    const previousEnd = previous?.endDate ?? r.expectedEndDate;
    if (!previousEnd) throw new RenewalError("Defina a previsão de devolução antes de renovar.");
    if (toISODate(previousEnd) !== input.previousEnd) throw new RenewalError("A locação mudou. Atualize a página antes de renovar.");
    const startDate = addDays(previousEnd, 1);
    if (endDate < startDate) throw new RenewalError("O término deve ser igual ou posterior ao início do novo período.");
    // Não reescreve movimentações já ocorridas no intervalo que será renovado.
    if (r.items.some((i) => i.returns.some((ret) => ret.date >= startDate))) {
      throw new RenewalError("Há devoluções após o término anterior. Revise essas devoluções antes de renovar esse período.");
    }
    if (r.items.some((i) => (i.startDate && i.startDate > previousEnd) || (i.expectedEndDate && i.expectedEndDate > previousEnd))) {
      throw new RenewalError("Há acréscimos com datas além do período atual. Ajuste a previsão da locação antes de renovar.");
    }
    const active = r.items.map((i) => ({ item: i, qty: i.qty - i.returns.reduce((s, ret) => s + ret.qty, 0) })).filter((i) => i.qty > 0);
    if (!active.length) throw new RenewalError("Não há equipamentos na obra para renovar.");
    if (!previous) {
      const original = calcRental(toCalcInput(r), previousEnd);
      if (original.total < 0) throw new RenewalError("Corrija o desconto do contrato inicial antes de renovar: o total não pode ser negativo.");
      await tx.rentalPeriod.create({ data: {
        rentalId, sequence: 1, startDate: r.startDate, endDate: previousEnd, dueDate: previousEnd,
        amount: original.total,
        items: r.items.map((i) => ({ itemId: i.id, name: i.equipment.name, qty: i.qty, dailyRate: Number(i.unitPrice),
          startDate: toISODate(i.startDate ?? r.startDate), endDate: toISODate(i.expectedEndDate ?? previousEnd), daysOverride: i.daysOverride })),
      } });
    }
    const previousItems = previous?.items as unknown as PeriodItem[] | undefined;
    const weights = active.map(({item, qty}) => qty * (previousItems?.find((i) => i.itemId === item.id)?.dailyRate ?? Number(item.unitPrice)));
    const weight = weights.reduce((s, v) => s + v, 0);
    const qtyTotal = active.reduce((s, i) => s + i.qty, 0);
    const days = inclusiveDays(startDate, endDate);
    const items = active.map(({item, qty}, idx) => ({
      itemId: item.id, name: item.equipment.name, qty,
      startDate: toISODate(startDate), endDate: toISODate(endDate),
      dailyRate: (weight > 0 ? input.amount * weights[idx] / weight / qty : input.amount / qtyTotal) / days,
    }));
    await tx.rentalPeriod.create({ data: {
      rentalId, sequence: (previous?.sequence ?? 1) + 1, startDate, endDate, dueDate,
      amount: input.amount, items: items as Prisma.InputJsonValue,
    } });
    await tx.rental.update({ where: { id: rentalId }, data: { expectedEndDate: endDate } });
    await tx.rentalItem.updateMany({ where: { id: { in: active.map((i) => i.item.id) } }, data: { expectedEndDate: endDate } });
  });
}
