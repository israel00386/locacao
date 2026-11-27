import { describe, it, expect } from "vitest";
import { calcRental, paymentStatus, type RentalInput } from "@/lib/calc";
import { calcPeriods, type PeriodInput } from "@/lib/periods";
const d = (s: string) => new Date(s + "T00:00:00Z");
const base: RentalInput = {
  stage: "ATIVA", startDate: d("2026-11-01"), expectedEndDate: d("2026-11-30"),
  discount: 0, extras: [], payments: [],
  items: [{ id: "item", qty: 2, unitPrice: 5, daysOverride: null, returns: [] }],
};
const periods: PeriodInput[] = [
  { id: "p1", sequence: 1, startDate: d("2026-11-01"), endDate: d("2026-11-30"), dueDate: d("2026-11-30"), amount: 300, items: [{ itemId: "item", name: "Andaime", qty: 2, dailyRate: 5 }] },
  { id: "p2", sequence: 2, startDate: d("2026-12-01"), endDate: d("2026-12-30"), dueDate: d("2026-12-15"), amount: 600, items: [{ itemId: "item", name: "Andaime", qty: 2, dailyRate: 10 }] },
];

describe("atraso financeiro independente da devolução", () => {
  it.each([0, 100])("devolvido com R$%s pago continua atrasado", (amount) => {
    const c = calcRental({ ...base, payments: [{ amount }], items: [{ ...base.items[0], returns: [{ qty: 2, date: d("2026-11-30"), chargedDays: null }] }] }, d("2026-12-01"));
    expect(c.overdue).toBe(false);
    expect(c.financialOverdue).toBe(true);
    expect(c.attention).toBe(true);
    expect(c.overdueOpen).toBe(300 - amount);
    expect(paymentStatus("ATIVA", c).status).toBe("ATRASADO");
  });
  it("encerramento não esconde dívida; quitação elimina o atraso financeiro", () => {
    const r = { ...base, stage: "ENCERRADA", items: [{ ...base.items[0], returns: [{ qty: 2, date: d("2026-11-30"), chargedDays: null }] }] };
    expect(calcRental(r, d("2026-12-01")).attention).toBe(true);
    const paid = calcRental({ ...r, payments: [{ amount: 300 }] }, d("2026-12-01"));
    expect(paid.attention).toBe(false);
    expect(paymentStatus("ENCERRADA", paid).status).toBe("FINALIZADO");
  });
  it("material pago ainda pode estar com devolução atrasada", () => {
    const c = calcRental({ ...base, payments: [{ amount: 300 }] }, d("2026-12-01"));
    expect(c.attention).toBe(true);
    expect(c.overdue).toBe(true);
    expect(c.financialOverdue).toBe(false);
  });
  it("orçamentos e cancelamentos não entram na inadimplência", () => {
    for (const stage of ["ORCAMENTO", "CANCELADA"]) expect(calcRental({ ...base, stage }, d("2026-12-01")).attention).toBe(false);
  });
});

describe("períodos de renovação", () => {
  it("mantém dívida antiga e separa o vencimento da renovação", () => {
    const c = calcRental({ ...base, expectedEndDate: d("2026-12-30"), periods, payments: [{ amount: 100 }] }, d("2026-12-10"));
    expect(c.total).toBe(900);
    expect(c.open).toBe(800);
    expect(c.overdueOpen).toBe(200);
    expect(c.periods.map((p) => p.paid)).toEqual([100, 0]);
    expect(c.overdue).toBe(false);
    expect(c.financialOverdue).toBe(true);
  });
  it("pagamentos abatem os períodos antigos primeiro, inclusive crédito anterior", () => {
    const c = calcPeriods(periods, 450, d("2026-12-10"), false, []);
    expect(c.map((p) => p.paid)).toEqual([300, 150]);
    expect(c.map((p) => p.open)).toEqual([0, 450]);
    expect(c.some((p) => p.overdue)).toBe(false);
  });
  it("vence após o dia de vencimento, mesmo com material na obra", () => {
    expect(calcPeriods(periods, 300, d("2026-12-15"), false, [])[1].overdue).toBe(false);
    expect(calcPeriods(periods, 300, d("2026-12-16"), false, [])[1].overdue).toBe(true);
  });
  it("devolução com saldo fica atrasada mesmo antes do vencimento da renovação", () => {
    const c = calcRental({ ...base, expectedEndDate: d("2026-12-30"), periods, payments: [{ amount: 300 }],
      items: [{ ...base.items[0], returns: [{ qty: 2, date: d("2026-12-10"), chargedDays: null }] }] }, d("2026-12-11"));
    expect(c.total).toBe(900);
    expect(c.allReturned).toBe(true);
    expect(paymentStatus("ATIVA", c).status).toBe("ATRASADO");
    expect(c.attention).toBe(true);
    expect(c.overdueOpen).toBe(600);
    expect(c.periods[1].overdue).toBe(true);
    expect(c.periods[1].dueDate).toEqual(d("2026-12-15"));
  });
  it.each([0, 450, 900])("renovação encerrada com R$%s pagos só fica em dia quando quitada", (amount) => {
    const c = calcRental({ ...base, stage: "ENCERRADA", periods, payments: [{ amount }],
      items: [{ ...base.items[0], returns: [{ qty: 2, date: d("2026-12-10"), chargedDays: null }] }] }, d("2026-12-11"));
    expect(c.financialOverdue).toBe(amount < 900);
    expect(c.overdueOpen).toBe(900 - amount);
    expect(paymentStatus("ENCERRADA", c).status).toBe(amount < 900 ? "ATRASADO" : "FINALIZADO");
  });
  it("excedentes não duplicam dias cobertos pela renovação", () => {
    expect(calcPeriods(periods, 0, d("2026-12-20"), true, []).map((p) => p.total)).toEqual([300, 600]);
    expect(calcPeriods(periods, 0, d("2027-01-02"), true, []).map((p) => p.total)).toEqual([300, 660]);
    expect(calcPeriods(periods, 0, d("2027-01-02"), false, []).map((p) => p.total)).toEqual([300, 600]);
  });
  it("excedentes param na devolução de cada unidade", () => {
    const ret = [{ itemId: "item", qty: 1, date: d("2026-12-31") }];
    expect(calcPeriods(periods, 0, d("2027-01-02"), true, ret)[1].total).toBe(640);
    ret.push({ itemId: "item", qty: 1, date: d("2027-01-01") });
    expect(calcPeriods(periods, 0, d("2027-01-10"), true, ret)[1].total).toBe(630);
  });
});
