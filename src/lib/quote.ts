import "server-only";
import { headers } from "next/headers";
import { fmtDate } from "./dates";
import { money, rentalCode, whatsappNumber } from "./format";
import type { RentalWithCalc } from "./rentals";

export async function baseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function quoteUrl(r: { quoteToken: string }) {
  return `${await baseUrl()}/o/${r.quoteToken}`;
}

/** Texto pronto para o WhatsApp do cliente. */
export function quoteMessage(r: RentalWithCalc, companyName: string, url: string): string {
  const isQuote = r.stage === "ORCAMENTO";
  const lines = [
    `Olá, ${r.customer.name.split(" - ")[0]}! Aqui é da ${companyName}.`,
    "",
    isQuote ? `*Orçamento ${rentalCode(r.number)}*` : `*Locação ${rentalCode(r.number)}*`,
    ...(r.siteAddress ? [`Obra: ${r.siteAddress}`] : []),
    `Período: ${fmtDate(r.startDate)}${r.expectedEndDate ? ` a ${fmtDate(r.expectedEndDate)}` : ""}`,
    "",
    ...r.items.map((i) => `• ${i.qty}× ${i.equipment.name}`),
    "",
    `*Total: ${money(r.calc.total)}*`,
    ...(r.calc.paid > 0 && r.calc.open > 0 ? [`Pago: ${money(r.calc.paid)} · Em aberto: ${money(r.calc.open)}`] : []),
    "",
    `Detalhes e PDF: ${url}`,
  ];
  return lines.join("\n");
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const n = whatsappNumber(phone);
  if (!n) return null;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
