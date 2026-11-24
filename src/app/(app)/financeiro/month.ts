import { todayISO } from "@/lib/dates";

export const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** Mês do financeiro a partir de ?mes=AAAA-MM (padrão: mês atual). Intervalo [from, to). */
export function parseMonth(mes: string | undefined) {
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(mes ?? "") ? mes! : todayISO().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  const prev = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const next = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  return { month, y, m, from, to, prev, next, name: MONTHS[m - 1] };
}
