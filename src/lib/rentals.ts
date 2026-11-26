import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { calcRental, type RentalInput } from "./calc";
import { today } from "./dates";

export const rentalInclude = {
  customer: true,
  items: { include: { equipment: true, returns: { orderBy: { date: "asc" } } }, orderBy: { id: "asc" } },
  extras: true,
  payments: { orderBy: { date: "asc" } },
} satisfies Prisma.RentalInclude;

export type RentalFull = Prisma.RentalGetPayload<{ include: typeof rentalInclude }>;

const n = (v: Prisma.Decimal | number | null | undefined) => (v == null ? 0 : Number(v));

export function toCalcInput(r: RentalFull): RentalInput {
  return {
    stage: r.stage,
    startDate: r.startDate,
    expectedEndDate: r.expectedEndDate,
    discount: n(r.discount),
    chargeOverdue: r.chargeOverdue,
    extras: r.extras.map((e) => ({ amount: n(e.amount) })),
    payments: r.payments.map((p) => ({ amount: n(p.amount) })),
    items: r.items.map((i) => ({
      qty: i.qty,
      unitPrice: n(i.unitPrice),
      daysOverride: i.daysOverride,
      startDate: i.startDate,
      expectedEndDate: i.expectedEndDate,
      returns: i.returns.map((x) => ({ qty: x.qty, date: x.date, chargedDays: x.chargedDays })),
    })),
  };
}

export function withCalc(r: RentalFull, now = today()) {
  return { ...r, calc: calcRental(toCalcInput(r), now) };
}

export type RentalWithCalc = ReturnType<typeof withCalc>;

export async function getRental(id: string) {
  const r = await db.rental.findUnique({ where: { id }, include: rentalInclude });
  return r ? withCalc(r) : null;
}

export async function listRentals(where: Prisma.RentalWhereInput = {}) {
  const rows = await db.rental.findMany({ where, include: rentalInclude, orderBy: [{ startDate: "desc" }, { number: "desc" }] });
  const now = today();
  return rows.map((r) => withCalc(r, now));
}

export interface StockRow {
  id: string;
  name: string;
  totalQty: number;
  maintenanceQty: number;
  rentedQty: number;
  availableQty: number;
  priceDaily: number | null;
  priceWeekly: number | null;
  priceBiweekly: number | null;
  priceMonthly: number | null;
  countedAt: Date | null;
  active: boolean;
}

/** Estoque calculado: só sai quando a locação está ativa e só volta quando há devolução registrada. */
export async function getStock(opts: { includeInactive?: boolean } = {}): Promise<StockRow[]> {
  const [equipment, items] = await Promise.all([
    db.equipment.findMany({
      where: opts.includeInactive ? {} : { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.rentalItem.findMany({
      where: { rental: { stage: "ATIVA" } },
      select: { equipmentId: true, qty: true, returns: { select: { qty: true } } },
    }),
  ]);
  const rented = new Map<string, number>();
  for (const it of items) {
    const out = it.qty - it.returns.reduce((s, r) => s + r.qty, 0);
    if (out > 0) rented.set(it.equipmentId, (rented.get(it.equipmentId) ?? 0) + out);
  }
  const num = (v: Prisma.Decimal | null) => (v == null ? null : Number(v));
  return equipment.map((e) => {
    const rentedQty = rented.get(e.id) ?? 0;
    return {
      id: e.id,
      name: e.name,
      totalQty: e.totalQty,
      maintenanceQty: e.maintenanceQty,
      rentedQty,
      availableQty: e.totalQty - rentedQty - e.maintenanceQty,
      priceDaily: num(e.priceDaily),
      priceWeekly: num(e.priceWeekly),
      priceBiweekly: num(e.priceBiweekly),
      priceMonthly: num(e.priceMonthly),
      countedAt: e.countedAt,
      active: e.active,
    };
  });
}

export async function getCompany() {
  return (await db.company.findUnique({ where: { id: 1 } })) ?? (await db.company.create({ data: { id: 1 } }));
}
