import { describe, expect, it } from "vitest";
import { cashSummary, countsInCash, filterStatement, groupByDay, periodSummary, signedAmount, type CashMovement } from "@/lib/cash";

const mv: CashMovement[] = [
  { kind: "RECEBIMENTO", date: "2026-10-28", amount: 500, method: "Pix" }, // antes da abertura
  { kind: "DESPESA", date: "2026-10-30", amount: 120, method: "Dinheiro" }, // antes da abertura
  { kind: "RECEBIMENTO", date: "2026-11-01", amount: 800, method: "Pix" }, // no dia da abertura: conta
  { kind: "DESPESA", date: "2026-11-03", amount: 150.35, method: "Pix" },
  { kind: "ENTRADA", date: "2026-11-05", amount: 1000, method: "Transferência" },
  { kind: "SAIDA", date: "2026-11-10", amount: 300, method: "Dinheiro" },
  { kind: "RECEBIMENTO", date: "2026-11-20", amount: 225.5, method: null },
  { kind: "DESPESA", date: "2026-12-02", amount: 99.9, method: "Pix" },
];

describe("caixa", () => {
  it("saldo = inicial + recebimentos + entradas − despesas − saídas, a partir da abertura", () => {
    const s = cashSummary({ balance: 2000, date: "2026-11-01" }, mv);
    // 2000 + 800 + 1000 + 225,50 − 150,35 − 300 − 99,90
    expect(s.inflow).toBe(2025.5);
    expect(s.outflow).toBe(550.25);
    expect(s.balance).toBe(3475.25);
    expect(s.count).toBe(6);
    expect(s.byKind).toEqual({ RECEBIMENTO: 1025.5, DESPESA: 250.25, ENTRADA: 1000, SAIDA: 300 });
  });

  it("sem data de abertura conta tudo desde sempre", () => {
    const s = cashSummary({ balance: 0, date: null }, mv);
    expect(s.balance).toBe(round(500 - 120 + 800 - 150.35 + 1000 - 300 + 225.5 - 99.9));
    expect(s.count).toBe(mv.length);
  });

  it("saldo até uma data (fim do mês) e saldo inicial negativo", () => {
    const s = cashSummary({ balance: -100, date: "2026-11-01" }, mv, "2026-12-01");
    expect(s.balance).toBe(round(-100 + 800 - 150.35 + 1000 - 300 + 225.5));
  });

  it("saldo por forma de pagamento", () => {
    const s = cashSummary({ balance: 0, date: "2026-11-01" }, mv);
    const pix = s.byMethod.find((m) => m.method === "Pix")!;
    expect(pix).toEqual({ method: "Pix", inflow: 800, outflow: 250.25, net: 549.75 });
    expect(s.byMethod.find((m) => m.method === "Sem forma")?.net).toBe(225.5);
    expect(s.byMethod.find((m) => m.method === "Dinheiro")?.net).toBe(-300);
    // soma das formas = movimento total
    expect(round(s.byMethod.reduce((t, m) => t + m.net, 0))).toBe(round(s.inflow - s.outflow));
  });

  it("entradas e saídas do mês", () => {
    const p = periodSummary(mv, "2026-11-01", "2026-12-01");
    expect(p).toMatchObject({ inflow: 2025.5, outflow: 450.35, net: 1575.15, count: 5 });
    // abertura no meio do mês: o que vem antes não conta
    expect(periodSummary(mv, "2026-10-01", "2026-11-01", "2026-10-29").outflow).toBe(120);
    expect(periodSummary(mv, "2026-10-01", "2026-11-01", "2026-10-29").inflow).toBe(0);
  });

  it("regras auxiliares do extrato", () => {
    expect(countsInCash("2026-11-01", "2026-11-01")).toBe(true);
    expect(countsInCash("2026-10-31", "2026-11-01")).toBe(false);
    expect(signedAmount({ kind: "SAIDA", amount: 10 })).toBe(-10);
    expect(filterStatement(mv, "entradas")).toHaveLength(4);
    expect(filterStatement(mv, "saidas")).toHaveLength(4);
    const days = groupByDay(mv.filter((m) => m.date.startsWith("2026-11")));
    expect(days[0]).toMatchObject({ date: "2026-11-20", net: 225.5 });
    expect(days.map((d) => d.date)).toEqual(["2026-11-20", "2026-11-10", "2026-11-05", "2026-11-03", "2026-11-01"]);
  });
});

function round(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
