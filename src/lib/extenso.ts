// Valor em reais por extenso (pt-BR), para recibos: 1234.5 → "mil, duzentos e trinta e quatro reais e cinquenta centavos".
const UNID = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** 0–999 por extenso. */
function ate999(n: number): string {
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (c) parts.push(CEM[c]);
  if (r) {
    if (r < 20) parts.push(UNID[r]);
    else parts.push(DEZ[Math.floor(r / 10)] + (r % 10 ? " e " + UNID[r % 10] : ""));
  }
  return parts.join(" e ");
}

const ESCALAS: [string, string][] = [
  ["", ""],
  ["mil", "mil"],
  ["milhão", "milhões"],
  ["bilhão", "bilhões"],
];

/** Inteiro ≥ 0 por extenso ("mil e duzentos", "dois milhões e trinta mil"). */
export function inteiroPorExtenso(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zero";
  const grupos: number[] = [];
  while (n > 0) {
    grupos.push(n % 1000);
    n = Math.floor(n / 1000);
  }
  const partes: { txt: string; valor: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (!g) continue;
    let txt: string;
    if (i === 0) txt = ate999(g);
    else if (i === 1) txt = g === 1 ? "mil" : `${ate999(g)} mil`;
    else txt = `${ate999(g)} ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}`;
    partes.push({ txt, valor: g });
  }
  // "e" antes do último grupo quando ele é < 100 ou centena redonda (ex.: "mil e duzentos", "mil e cinquenta").
  return partes
    .map((p, idx) => {
      if (idx === 0) return p.txt;
      const ultimo = idx === partes.length - 1;
      const usaE = ultimo && (p.valor < 100 || p.valor % 100 === 0);
      return (usaE ? " e " : ", ") + p.txt;
    })
    .join("");
}

/** Valor monetário por extenso: "duzentos reais", "um real e cinco centavos", "cinquenta centavos". */
export function reaisPorExtenso(valor: number): string {
  const cents = Math.round(Math.abs(valor) * 100);
  const reais = Math.floor(cents / 100);
  const centavos = cents % 100;
  const milhaoRedondo = reais >= 1_000_000 && reais % 1_000_000 === 0;
  const r = reais ? `${inteiroPorExtenso(reais)}${milhaoRedondo ? " de" : ""} ${reais === 1 ? "real" : "reais"}` : "";
  const c = centavos ? `${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}` : "";
  if (r && c) return `${r} e ${c}`;
  return r || c || "zero real";
}
