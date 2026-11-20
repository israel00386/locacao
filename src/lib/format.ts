const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function money(n: number | null | undefined): string {
  return brl.format(round2(Number(n ?? 0)));
}

/** Valor unitário pode ter 3 casas (ex.: R$ 0,533). */
export function unitMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  const decimals = Math.round(v * 1000) % 10 === 0 ? 2 : 3;
  return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Aceita "1.234,56", "1234,56", "1234.56". */
export function parseMoney(value: FormDataEntryValue | string | null | undefined): number {
  if (value == null) return 0;
  let s = String(value).trim().replace(/[R$\s]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function rentalCode(number: number): string {
  return "LOC-" + String(number).padStart(4, "0");
}

/** Só dígitos, com 55 na frente, para links do WhatsApp. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/\D/g, "");
  if (d.length < 8) return null;
  // Telefones da planilha vêm sem DDD (9.9272-6640). A empresa fica no Ceará (85).
  if (d.length === 8 || d.length === 9) d = "85" + d;
  if (!d.startsWith("55")) d = "55" + d;
  return d;
}

export const PERIODS = [
  { value: "DIARIA", label: "Diária" },
  { value: "SEMANAL", label: "Semanal" },
  { value: "QUINZENAL", label: "Quinzenal" },
  { value: "MENSAL", label: "Mensal" },
  { value: "ESPECIAL", label: "Especial" },
] as const;

export type Period = (typeof PERIODS)[number]["value"];

export function periodLabel(p: string): string {
  return PERIODS.find((x) => x.value === p)?.label ?? p;
}

export const CUSTOMER_TYPES = [
  "Cliente",
  "Construtora",
  "Mestre de Obra",
  "Encarregado",
  "Pedreiro",
  "Carpinteiro",
  "Serviços",
] as const;

export const CUSTOMER_STATUSES = ["Ativo", "Parceiro", "Bloqueado", "Inadimplente"] as const;
