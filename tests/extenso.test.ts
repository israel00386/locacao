import { describe, expect, it } from "vitest";
import { reaisPorExtenso } from "../src/lib/extenso";

describe("reaisPorExtenso", () => {
  it.each([
    [0, "zero real"],
    [1, "um real"],
    [0.5, "cinquenta centavos"],
    [1.01, "um real e um centavo"],
    [100, "cem reais"],
    [101, "cento e um reais"],
    [215.9, "duzentos e quinze reais e noventa centavos"],
    [1000, "mil reais"],
    [1200, "mil e duzentos reais"],
    [1050, "mil e cinquenta reais"],
    [1234.56, "mil, duzentos e trinta e quatro reais e cinquenta e seis centavos"],
    [5822.24, "cinco mil, oitocentos e vinte e dois reais e vinte e quatro centavos"],
    [21000, "vinte e um mil reais"],
    [1000000, "um milhão de reais"],
  ])("%s → %s", (v, txt) => {
    expect(reaisPorExtenso(v)).toBe(txt);
  });
});
