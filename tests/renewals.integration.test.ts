import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ requireUser: async () => ({ userId: "test" }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
import { db } from "@/lib/db";
import { renewRentalPeriod } from "@/lib/renewals";
import { getRental, getStock } from "@/lib/rentals";
import { registerReturn, deleteReturn, renewRental, saveRental, addItemsToRental } from "@/app/(app)/locacoes/actions";
const d = (s: string) => new Date(s + "T00:00:00Z");
const enabled = process.env.RUN_DB_TESTS === "1";
const payload = { previousEnd: "2026-11-30", endDate: "2026-12-30", dueDate: "2026-12-15", amount: 600 };

// Execute somente no banco descartável criado para validação.
describe.skipIf(!enabled)("renovação com PostgreSQL", () => {
  let rentalId: string, customerId: string, equipmentId: string, itemId: string;
  beforeEach(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (url.pathname !== "/locacao_test" || !["127.0.0.1", "localhost"].includes(url.hostname)) throw new Error("Use o banco local locacao_test.");
    const customer = await db.customer.create({ data: { name: "Teste renovação" } });
    customerId = customer.id;
    const eq = await db.equipment.create({ data: { name: `Teste-${customerId}`, totalQty: 10 } });
    equipmentId = eq.id;
    const r = await db.rental.create({ data: {
      customerId, stage: "ATIVA", startDate: d("2026-11-01"), expectedEndDate: d("2026-11-30"),
      items: { create: { equipmentId, qty: 2, unitPrice: 5, period: "MENSAL" } },
      payments: { create: { date: d("2026-11-01"), amount: 100, method: "Pix" } },
    }, include: { items: true } });
    rentalId = r.id; itemId = r.items[0].id;
  });
  afterEach(async () => {
    if (rentalId) await db.rental.deleteMany({ where: { id: rentalId } });
    if (customerId) await db.customer.deleteMany({ where: { id: customerId } });
    if (equipmentId) await db.equipment.deleteMany({ where: { id: equipmentId } });
  });
  afterAll(async () => { await db.$disconnect(); });

  it("preserva cliente, itens, pagamentos e estoque; cria períodos e cobrança", async () => {
    await renewRentalPeriod(rentalId, payload);
    const r = (await getRental(rentalId))!;
    expect(r.customerId).toBe(customerId);
    expect(r.items.map((i) => i.id)).toEqual([itemId]);
    expect(r.items[0].returns).toHaveLength(0);
    expect(r.payments).toHaveLength(1);
    expect(r.periods.map((p) => Number(p.amount))).toEqual([300, 600]);
    expect(r.calc.total).toBe(900);
    expect(r.calc.open).toBe(800);
    expect(r.periods[1].startDate).toEqual(d("2026-12-01"));
    expect(r.periods[1].dueDate).toEqual(d("2026-12-15"));
    expect((await getStock()).find((s) => s.id === equipmentId)?.availableQty).toBe(8);
    expect(await db.stockEntry.count({ where: { equipmentId } })).toBe(0);
  });
  it("duas requisições simultâneas só criam uma renovação", async () => {
    const results = await Promise.allSettled([renewRentalPeriod(rentalId, payload), renewRentalPeriod(rentalId, payload)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.rentalPeriod.count({ where: { rentalId } })).toBe(2);
  });
  it("segunda renovação preserva os períodos anteriores e aplica novo valor", async () => {
    await renewRentalPeriod(rentalId, payload);
    const before = await db.rentalPeriod.findMany({ where: { rentalId }, orderBy: { sequence: "asc" } });
    await renewRentalPeriod(rentalId, { previousEnd: "2026-12-30", endDate: "2027-01-29", dueDate: "2027-01-15", amount: 750 });
    const after = (await getRental(rentalId))!;
    expect(after.periods.slice(0, 2)).toEqual(before);
    expect(after.calc.total).toBe(1650);
    expect(after.calc.open).toBe(1550);
  });
  it("renova somente unidades ainda na obra após devolução parcial", async () => {
    await db.itemReturn.create({ data: { itemId, qty: 1, date: d("2026-11-15") } });
    await renewRentalPeriod(rentalId, { ...payload, amount: 300 });
    const r = (await getRental(rentalId))!;
    expect(r.calc.outstandingQty).toBe(1);
    expect(r.calc.periods[1].items[0].qty).toBe(1);
    expect(Number(r.periods[0].amount)).toBe(225);
    expect(r.items[0].returns).toHaveLength(1);
    expect((await getStock()).find((s) => s.id === equipmentId)?.availableQty).toBe(9);
    expect((await deleteReturn(rentalId, r.items[0].returns[0].id))?.error).toMatch(/histórico/);
  });
  it("devolução após renovação mantém valor e libera estoque", async () => {
    await renewRentalPeriod(rentalId, payload);
    const form = new FormData(); form.set("date", "2026-12-20"); form.set(`qty_${itemId}`, "2");
    expect(await registerReturn(rentalId, form)).toEqual({});
    const r = (await getRental(rentalId))!;
    expect(r.calc.total).toBe(900);
    expect(r.calc.allReturned).toBe(true);
    expect((await getStock()).find((s) => s.id === equipmentId)?.availableQty).toBe(10);
  });
  it("impede devolução retroativa e edição dos contratos preservados", async () => {
    await renewRentalPeriod(rentalId, payload);
    const form = new FormData(); form.set("date", "2026-11-20"); form.set(`qty_${itemId}`, "1");
    expect((await registerReturn(rentalId, form)).error).toMatch(/período anterior/);
    expect((await addItemsToRental(rentalId, { startDate: "2026-12-01", expectedEndDate: "2026-12-30", items: [{ equipmentId, qty: 1, unitPrice: 5, period: "MENSAL" }] })).error).toMatch(/preservar/);
    expect((await saveRental({ id: rentalId, customerId, siteAddress: "", startDate: "2026-11-01", expectedEndDate: "2026-12-30", discount: 0, extras: [], items: [{ id: itemId, equipmentId, qty: 2, unitPrice: 1, period: "MENSAL", daysOverride: null }] })).error).toMatch(/preservados/);
    expect((await getRental(rentalId))!.calc.total).toBe(900);
  });
  it("rejeita datas inválidas, valor inválido e material já devolvido sem gravar períodos", async () => {
    await expect(renewRentalPeriod(rentalId, { ...payload, endDate: "2026-02-31" })).rejects.toThrow(/datas válidas/);
    await expect(renewRentalPeriod(rentalId, { ...payload, endDate: "2026-11-30" })).rejects.toThrow(/término/);
    const form = new FormData(); form.set("amount", "abc");
    expect((await renewRental(rentalId, form)).error).toBeTruthy();
    await db.itemReturn.create({ data: { itemId, qty: 2, date: d("2026-11-30") } });
    await expect(renewRentalPeriod(rentalId, payload)).rejects.toThrow(/equipamentos na obra/);
    expect(await db.rentalPeriod.count({ where: { rentalId } })).toBe(0);
  });
  it("não renova orçamento ou locação encerrada", async () => {
    for (const stage of ["ORCAMENTO", "ENCERRADA", "CANCELADA"]) {
      await db.rental.update({ where: { id: rentalId }, data: { stage } });
      await expect(renewRentalPeriod(rentalId, payload)).rejects.toThrow(/ativa/);
    }
  });
});
