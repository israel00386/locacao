import { describe, expect, it } from "vitest";
import {
  categoryLabel,
  colorStyle,
  findCategory,
  freightProfit,
  isFreightCategory,
  normalizeCategoryName,
  selectableCategories,
  sumAmounts,
  totalsByCategory,
  type ExpenseCategoryData,
} from "@/lib/expense-categories";

const cat = (id: string, name: string, extra: Partial<ExpenseCategoryData> = {}): ExpenseCategoryData => ({
  id,
  name,
  color: "slate",
  icon: "tag",
  isFreight: false,
  active: true,
  sortOrder: 50,
  ...extra,
});

const categories: ExpenseCategoryData[] = [
  cat("ENTREGA", "Entrega", { isFreight: true, sortOrder: 1, color: "sky", icon: "truck" }),
  cat("RETIRADA", "Retirada", { isFreight: true, sortOrder: 2 }),
  cat("COMBUSTIVEL", "Combustível", { sortOrder: 3 }),
  cat("OUTROS", "Outros", { sortOrder: 99 }),
  cat("c1", "Frete terceirizado", { isFreight: true, sortOrder: 6 }),
  cat("c2", "Aluguel antigo", { active: false, sortOrder: 7 }),
];

describe("despesas", () => {
  const list = [
    { category: "ENTREGA", amount: 80 },
    { category: "RETIRADA", amount: 70.1 },
    { category: "COMBUSTIVEL", amount: 200.2 },
    { category: "ENTREGA", amount: 50 },
    { category: "XYZ", amount: 5 },
    { category: "c1", amount: 30 },
  ];

  it("soma por categoria, do maior para o menor (desconhecida → Outros)", () => {
    const t = totalsByCategory(list, categories);
    expect(t.map((c) => [c.id, c.total, c.count])).toEqual([
      ["COMBUSTIVEL", 200.2, 1],
      ["ENTREGA", 130, 2],
      ["RETIRADA", 70.1, 1],
      ["c1", 30, 1],
      ["OUTROS", 5, 1],
    ]);
    expect(t[1]).toMatchObject({ label: "Entrega", color: "sky", icon: "truck" });
    expect(sumAmounts(list)).toBe(435.3);
  });

  it("frete vem da marcação isFreight (inclui categoria criada pelo usuário)", () => {
    expect(isFreightCategory(categories, "c1")).toBe(true);
    expect(isFreightCategory(categories, "COMBUSTIVEL")).toBe(false);
    expect(isFreightCategory(categories, "XYZ")).toBe(false);
    expect(freightProfit([{ amount: 150 }], list, categories)).toEqual({ charged: 150, spent: 230.1, profit: -80.1 });
    expect(freightProfit([], [], categories)).toEqual({ charged: 0, spent: 0, profit: 0 });
  });

  it("rótulos", () => {
    expect(categoryLabel(categories, "c1")).toBe("Frete terceirizado");
    expect(categoryLabel(categories, "desconhecida")).toBe("Outros");
    expect(categoryLabel([], "qualquer")).toBe("Outros");
    expect(categoryLabel("COMPRA")).toBe("Compra de material");
    expect(categoryLabel("nova")).toBe("Outros");
    expect(findCategory(categories, "c2").active).toBe(false);
  });

  it("formulário mostra só as ativas, na ordem, mais a atual mesmo desativada", () => {
    expect(selectableCategories(categories).map((c) => c.id)).toEqual(["ENTREGA", "RETIRADA", "COMBUSTIVEL", "c1", "OUTROS"]);
    expect(selectableCategories(categories, "c2").map((c) => c.id)).toEqual(["ENTREGA", "RETIRADA", "COMBUSTIVEL", "c1", "c2", "OUTROS"]);
  });

  it("nome normalizado e cor desconhecida cai no cinza", () => {
    expect(normalizeCategoryName("  Aluguel   do  galpão ")).toBe("Aluguel do galpão");
    expect(colorStyle("xyz")).toBe(colorStyle("slate"));
  });
});
