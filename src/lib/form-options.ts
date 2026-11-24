import "server-only";
import { db } from "./db";
import { getStock, type RentalWithCalc } from "./rentals";
import type { CustomerOption, EquipmentOption } from "@/components/rental-form";

/** Último valor cobrado: por equipamento e por cliente+equipamento (condição especial). */
async function lastPrices() {
  const priced = await db.rentalItem.findMany({
    where: { unitPrice: { gt: 0 }, rental: { stage: { not: "CANCELADA" } } },
    select: { equipmentId: true, unitPrice: true, startDate: true, rental: { select: { customerId: true, startDate: true, number: true } } },
  });
  // Mais recente primeiro (acréscimos valem pela própria retirada).
  priced.sort(
    (a, b) =>
      (b.startDate ?? b.rental.startDate).getTime() - (a.startDate ?? a.rental.startDate).getTime() || b.rental.number - a.rental.number,
  );
  const lastPrice = new Map<string, number>();
  const customerPrices = new Map<string, Record<string, number>>();
  for (const it of priced) {
    const v = Number(it.unitPrice);
    if (!lastPrice.has(it.equipmentId)) lastPrice.set(it.equipmentId, v);
    const m = customerPrices.get(it.rental.customerId) ?? {};
    if (m[it.equipmentId] == null) m[it.equipmentId] = v;
    customerPrices.set(it.rental.customerId, m);
  }
  return { lastPrice, customerPrices };
}

/** Opções do formulário de acréscimo: estoque disponível agora e valores sugeridos para o cliente. */
export async function addItemsOptions(customerId: string) {
  const [stock, { lastPrice, customerPrices }] = await Promise.all([getStock(), lastPrices()]);
  const equipment: EquipmentOption[] = stock.map((s) => ({
    id: s.id,
    name: s.name,
    availableQty: s.availableQty,
    priceDaily: s.priceDaily,
    priceWeekly: s.priceWeekly,
    priceBiweekly: s.priceBiweekly,
    priceMonthly: s.priceMonthly,
    lastPrice: lastPrice.get(s.id) ?? null,
  }));
  return { equipment, customerPrices: customerPrices.get(customerId) ?? {} };
}

export async function rentalFormOptions(editing?: RentalWithCalc) {
  const [customers, stock, { lastPrice, customerPrices }] = await Promise.all([
    db.customer.findMany({
      where: { status: { not: "Bloqueado" } },
      orderBy: { name: "asc" },
      include: { sites: { orderBy: { createdAt: "desc" } } },
    }),
    getStock(),
    lastPrices(),
  ]);

  // Na edição, o que esta própria locação está usando conta como disponível para ela.
  const own = new Map<string, number>();
  if (editing?.stage === "ATIVA") {
    editing.items.forEach((it, idx) => own.set(it.equipmentId, (own.get(it.equipmentId) ?? 0) + editing.calc.items[idx].outstandingQty));
  }

  const customerOptions: CustomerOption[] = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    type: c.type,
    sites: c.sites.map((s) => s.address),
    prices: customerPrices.get(c.id) ?? {},
  }));
  // Cliente bloqueado que já está na locação continua aparecendo.
  if (editing && !customerOptions.some((c) => c.id === editing.customerId)) {
    customerOptions.push({ id: editing.customer.id, name: editing.customer.name, phone: editing.customer.phone, type: editing.customer.type, sites: [], prices: customerPrices.get(editing.customer.id) ?? {} });
  }

  const equipmentOptions: EquipmentOption[] = stock.map((s) => ({
    id: s.id,
    name: s.name,
    availableQty: s.availableQty + (own.get(s.id) ?? 0),
    priceDaily: s.priceDaily,
    priceWeekly: s.priceWeekly,
    priceBiweekly: s.priceBiweekly,
    priceMonthly: s.priceMonthly,
    lastPrice: lastPrice.get(s.id) ?? null,
  }));
  return { customers: customerOptions, equipment: equipmentOptions };
}
