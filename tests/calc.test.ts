import { describe, expect, it } from "vitest";
import { calcRental, itemSituation, priceFor, suggestPeriod, suggestUnitPrice, outstandingDaysFor } from "@/lib/calc";
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

describe("acréscimo de equipamento", () => {
  // Locação: retirada 01/11, previsão 30/11. Acréscimo: retirada 10/11, previsão 20/11.
  const rental = {
    ...base,
    stage: "ATIVA",
    startDate: d("2026-11-01")!,
    expectedEndDate: d("2026-11-30")!,
  };
  const initial = { qty: 10, unitPrice: 1, daysOverride: null, returns: [] };

  it("item sem datas próprias calcula como antes", () => {
    const c = calcRental({ ...rental, items: [initial] }, d("2026-11-15")!);
    expect(c.items[0].addition).toBe(false);
    expect(c.items[0].startDate).toEqual(d("2026-11-01"));
    expect(c.items[0].expectedEndDate).toEqual(d("2026-11-30"));
    expect(c.items[0].outstandingDays).toBe(30);
    expect(c.items[0].status).toBe("NA_OBRA");
    expect(c.hasAdditions).toBe(false);
    expect(c.total).toBe(300);
  });

  it("acréscimo com início posterior e previsão própria conta só os seus dias", () => {
    const c = calcRental(
      {
        ...rental,
        items: [
          initial,
          { qty: 4, unitPrice: 2, daysOverride: null, returns: [], startDate: d("2026-11-10"), expectedEndDate: d("2026-11-20") },
        ],
      },
      d("2026-11-15")!,
    );
    const a = c.items[1];
    expect(a.addition).toBe(true);
    expect(a.startDate).toEqual(d("2026-11-10"));
    expect(a.expectedEndDate).toEqual(d("2026-11-20"));
    expect(a.outstandingDays).toBe(11); // 10/11 → 20/11
    expect(a.total).toBe(4 * 2 * 11);
    expect(c.total).toBe(300 + 88);
    expect(c.days).toBe(30);
    expect(c.overdue).toBe(false);
    expect(c.hasAdditions).toBe(true);
    expect(c.nextExpectedEnd).toEqual(d("2026-11-20"));
  });

  it("acréscimo sem previsão própria usa a previsão da locação", () => {
    const c = calcRental(
      { ...rental, items: [{ qty: 2, unitPrice: 5, daysOverride: null, returns: [], startDate: d("2026-11-21") }] },
      d("2026-11-22")!,
    );
    expect(c.items[0].expectedEndDate).toEqual(d("2026-11-30"));
    expect(c.items[0].outstandingDays).toBe(10); // 21/11 → 30/11
    expect(c.total).toBe(100);
  });

  it("devolução parcial do acréscimo conta da retirada do acréscimo", () => {
    const c = calcRental(
      {
        ...rental,
        items: [
          initial,
          {
            qty: 4,
            unitPrice: 2,
            daysOverride: null,
            startDate: d("2026-11-10"),
            expectedEndDate: d("2026-11-20"),
            // 3 voltaram em 14/11 (5 dias); 1 continua até a previsão 20/11 (11 dias)
            returns: [{ qty: 3, date: d("2026-11-14")!, chargedDays: null }],
          },
        ],
      },
      d("2026-11-15")!,
    );
    const a = c.items[1];
    expect(a.returnDays).toEqual([5]);
    expect(a.returnedQty).toBe(3);
    expect(a.outstandingQty).toBe(1);
    expect(a.status).toBe("NA_OBRA");
    expect(a.total).toBe(3 * 2 * 5 + 1 * 2 * 11);
    expect(c.total).toBe(300 + 52);
  });

  it("acréscimo devolvido por inteiro fica Devolvido, o resto continua na obra", () => {
    const c = calcRental(
      {
        ...rental,
        items: [
          initial,
          { qty: 2, unitPrice: 1, daysOverride: null, startDate: d("2026-11-10"), expectedEndDate: d("2026-11-20"), returns: [{ qty: 2, date: d("2026-11-12")!, chargedDays: null }] },
        ],
      },
      d("2026-11-25")!,
    );
    expect(c.items[1].status).toBe("DEVOLVIDO");
    expect(c.items[1].total).toBe(2 * 1 * 3);
    expect(c.items[1].overdue).toBe(false); // voltou tudo, mesmo depois da previsão
    expect(c.overdue).toBe(false);
    expect(c.allReturned).toBe(false);
    expect(itemSituation(c.items[1].status)).toEqual({ label: "Devolvido", tone: "yellow" });
  });

  it("só o acréscimo atrasado deixa a locação atrasada", () => {
    const c = calcRental(
      {
        ...rental,
        items: [
          initial,
          { qty: 1, unitPrice: 14, daysOverride: null, returns: [], startDate: d("2026-11-10"), expectedEndDate: d("2026-11-20") },
        ],
      },
      d("2026-11-23")!,
    );
    expect(c.items[0].overdue).toBe(false);
    expect(c.items[0].status).toBe("NA_OBRA");
    expect(c.items[1].overdue).toBe(true);
    expect(c.items[1].overdueDays).toBe(3);
    expect(c.items[1].status).toBe("ATRASADO");
    expect(c.items[1].outstandingDays).toBe(14); // 10/11 → 23/11 (hoje)
    expect(c.overdue).toBe(true);
    expect(c.overdueDays).toBe(3);
    expect(c.total).toBe(300 + 14 * 14);
    expect(c.nextExpectedEnd).toEqual(d("2026-11-30"));
    expect(itemSituation(c.items[1].status)).toEqual({ label: "Atrasado", tone: "red" });
  });

  it("locação atrasada usa o maior atraso entre os itens", () => {
    const c = calcRental(
      {
        ...rental,
        expectedEndDate: d("2026-11-12")!,
        items: [
          initial,
          { qty: 1, unitPrice: 1, daysOverride: null, returns: [], startDate: d("2026-11-10"), expectedEndDate: d("2026-11-20") },
        ],
      },
      d("2026-11-22")!,
    );
    expect(c.items[0].overdueDays).toBe(10);
    expect(c.items[1].overdueDays).toBe(2);
    expect(c.overdueDays).toBe(10);
  });

  it("previsão do acréscimo depois da previsão da locação: locação não atrasa enquanto o inicial já voltou", () => {
    const c = calcRental(
      {
        ...rental,
        expectedEndDate: d("2026-11-12")!,
        items: [
          { ...initial, returns: [{ qty: 10, date: d("2026-11-12")!, chargedDays: null }] },
          { qty: 1, unitPrice: 1, daysOverride: null, returns: [], startDate: d("2026-11-10"), expectedEndDate: d("2026-11-30") },
        ],
      },
      d("2026-11-22")!,
    );
    expect(c.overdue).toBe(false);
    expect(c.items[0].total).toBe(10 * 12);
    expect(c.items[1].outstandingDays).toBe(21);
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

  it("valor sugerido: cliente → tabela → último valor cobrado", () => {
    const eq = { priceDaily: 1, priceWeekly: null, priceBiweekly: null, priceMonthly: 0.5, lastPrice: 0.8 };
    expect(suggestUnitPrice(eq, 0.7, "MENSAL").unitPrice).toBe(0.7);
    expect(suggestUnitPrice(eq, undefined, "MENSAL").unitPrice).toBe(0.5);
    const empty = { priceDaily: null, priceWeekly: null, priceBiweekly: null, priceMonthly: null, lastPrice: 0.8 };
    expect(suggestUnitPrice(empty, null, "DIARIA")).toEqual({ unitPrice: 0.8, source: "último valor cobrado" });
    expect(suggestUnitPrice({ ...empty, lastPrice: null }, null, "DIARIA").unitPrice).toBeNull();
  });
});
