import { describe, expect, it } from "vitest";
import { calcRental, priceFor, suggestPeriod, outstandingDaysFor } from "@/lib/calc";
import { parseISODate as d, inclusiveDays } from "@/lib/dates";

const base = {
  discount: 0,
  extras: [] as { amount: number }[],
  payments: [] as { amount: number }[],
};

describe("dias", () => {
  it("conta o primeiro e o último dia como a planilha", () => {
    expect(inclusiveDays(d("2026-08-21")!, d("2026-09-19")!)).toBe(30);
    expect(inclusiveDays(d("2026-09-01")!, d("2026-09-19")!)).toBe(19);
  });

  it("depois da previsão continua contando até hoje", () => {
    expect(outstandingDaysFor("ATIVA", d("2026-11-01")!, d("2026-11-10")!, d("2026-11-15")!)).toBe(15);
    expect(outstandingDaysFor("ATIVA", d("2026-11-01")!, d("2026-11-10")!, d("2026-11-05")!)).toBe(10);
    expect(outstandingDaysFor("ORCAMENTO", d("2026-11-01")!, d("2026-11-10")!, d("2026-11-20")!)).toBe(10);
  });
});

describe("locação", () => {
  it("Victor Januário: tábua 2 × R$1,00 × 19 dias = R$38", () => {
    const c = calcRental(
      {
        ...base,
        stage: "ATIVA",
        startDate: d("2026-09-01")!,
        expectedEndDate: d("2026-09-19")!,
        items: [{ qty: 2, unitPrice: 1, daysOverride: null, returns: [] }],
      },
      d("2026-09-10")!,
    );
    expect(c.total).toBe(38);
    expect(c.overdue).toBe(false);
  });

  it("devolução parcial: cada parte cobra seus próprios dias", () => {
    const c = calcRental(
      {
        ...base,
        stage: "ATIVA",
        startDate: d("2026-11-01")!,
        expectedEndDate: d("2026-11-30")!,
        items: [
          {
            qty: 10,
            unitPrice: 0.5,
            daysOverride: null,
            // 4 voltaram no dia 10 (10 dias), 6 continuam até 30/11 (30 dias)
            returns: [{ qty: 4, date: d("2026-11-10")!, chargedDays: null }],
          },
        ],
      },
      d("2026-11-15")!,
    );
    expect(c.items[0].outstandingQty).toBe(6);
    expect(c.total).toBe(4 * 0.5 * 10 + 6 * 0.5 * 30);
    expect(c.allReturned).toBe(false);
  });

  it("devolvido não é pago: saldo continua em aberto", () => {
    const c = calcRental(
      {
        ...base,
        extras: [{ amount: 40 }],
        payments: [{ amount: 50 }],
        stage: "ATIVA",
        startDate: d("2026-11-01")!,
        expectedEndDate: d("2026-11-05")!,
        items: [{ qty: 8, unitPrice: 1.5, daysOverride: null, returns: [{ qty: 8, date: d("2026-11-05")!, chargedDays: null }] }],
      },
      d("2026-11-20")!,
    );
    expect(c.allReturned).toBe(true);
    expect(c.overdue).toBe(false); // tudo voltou, não está atrasada
    expect(c.total).toBe(8 * 1.5 * 5 + 40);
    expect(c.open).toBe(c.total - 50);
    expect(c.financial).toBe("PARCIAL");
  });

  it("atrasada quando passou da previsão e ainda tem material na obra", () => {
    const c = calcRental(
      {
        ...base,
        stage: "ATIVA",
        startDate: d("2026-11-01")!,
        expectedEndDate: d("2026-11-10")!,
        items: [{ qty: 1, unitPrice: 14, daysOverride: null, returns: [] }],
      },
      d("2026-11-13")!,
    );
    expect(c.overdue).toBe(true);
    expect(c.overdueDays).toBe(3);
    expect(c.total).toBe(14 * 13);
  });

  it("dias cobrados manualmente prevalecem", () => {
    const c = calcRental(
      {
        ...base,
        stage: "ATIVA",
        startDate: d("2026-10-30")!,
        expectedEndDate: d("2026-11-30")!,
        items: [
          { qty: 14, unitPrice: 0.5, daysOverride: 30, returns: [] },
          { qty: 4, unitPrice: 0.6, daysOverride: null, returns: [{ qty: 4, date: d("2026-11-30")!, chargedDays: 30 }] },
        ],
      },
      d("2026-11-15")!,
    );
    expect(c.total).toBe(14 * 0.5 * 30 + 4 * 0.6 * 30);
  });

  it("desconto e pago total", () => {
    const c = calcRental(
      {
        ...base,
        discount: 10,
        payments: [{ amount: 90 }],
        stage: "ATIVA",
        startDate: d("2026-11-01")!,
        expectedEndDate: d("2026-11-10")!,
        items: [{ qty: 10, unitPrice: 1, daysOverride: null, returns: [] }],
      },
      d("2026-11-05")!,
    );
    expect(c.total).toBe(90);
    expect(c.financial).toBe("PAGO");
  });
});

describe("tabela de preços", () => {
  it("sugere a faixa pela duração", () => {
    expect(suggestPeriod(3)).toBe("DIARIA");
    expect(suggestPeriod(7)).toBe("SEMANAL");
    expect(suggestPeriod(15)).toBe("QUINZENAL");
    expect(suggestPeriod(30)).toBe("MENSAL");
  });

  it("usa a faixa mais próxima quando falta preço", () => {
    const t = { priceDaily: 1, priceWeekly: null, priceBiweekly: 0.6, priceMonthly: 0.5 };
    expect(priceFor(t, "MENSAL")).toBe(0.5);
    expect(priceFor(t, "SEMANAL")).toBe(1);
    expect(priceFor(t, "ESPECIAL")).toBeNull();
    expect(priceFor({ priceDaily: null, priceWeekly: null, priceBiweekly: null, priceMonthly: null }, "DIARIA")).toBeNull();
  });
});
