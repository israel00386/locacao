import { describe, expect, it } from "vitest";
import { categoryLabel, freightProfit, sumAmounts, totalsByCategory } from "@/lib/expense-categories";

describe("despesas", () => {
  const list = [
    { category: "ENTREGA", amount: 80 },
    { category: "RETIRADA", amount: 70.1 },
    { category: "COMBUSTIVEL", amount: 200.2 },
    { category: "ENTREGA", amount: 50 },
    { category: "XYZ", amount: 5 },
  ];

  it("soma por categoria, do maior para o menor", () => {
    const t = totalsByCategory(list);
    expect(t.map((c) => [c.value, c.total, c.count])).toEqual([
      ["COMBUSTIVEL", 200.2, 1],
      ["ENTREGA", 130, 2],
      ["RETIRADA", 70.1, 1],
      ["OUTROS", 5, 1],
    ]);
    expect(sumAmounts(list)).toBe(405.3);
  });

  it("lucro do frete = extras cobrados − entrega/retirada", () => {
    expect(freightProfit([{ amount: 150 }], list)).toEqual({ charged: 150, spent: 200.1, profit: -50.1 });
    expect(freightProfit([], [])).toEqual({ charged: 0, spent: 0, profit: 0 });
  });

  it("rótulos", () => {
    expect(categoryLabel("COMPRA")).toBe("Compra de material");
    expect(categoryLabel("desconhecida")).toBe("Outros");
  });
});
