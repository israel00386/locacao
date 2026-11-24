import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/dates";
import { categoryLabel, getMonthExpenses } from "@/lib/expenses";
import { rentalCode } from "@/lib/format";
import { parseMonth } from "../month";

// CSV no formato do Excel brasileiro: separador ";", vírgula decimal e BOM para acentos.
const cell = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const num = (n: number) => n.toFixed(2).replace(".", ",");

export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.redirect(new URL("/login", req.url));
  const { month, from, to } = parseMonth(req.nextUrl.searchParams.get("mes") ?? undefined);

  const [payments, expenses] = await Promise.all([
    db.payment.findMany({
      where: { date: { gte: from, lt: to } },
      include: { rental: { select: { number: true, customer: { select: { name: true } } } } },
      orderBy: { date: "asc" },
    }),
    getMonthExpenses(from, to),
  ]);

  const rows: (string | number | null)[][] = [["Tipo", "Data", "Categoria", "Descrição", "Locação", "Cliente", "Forma", "Valor"]];
  for (const p of payments) {
    rows.push(["Recebimento", fmtDate(p.date), "Pagamento", p.note ?? "", rentalCode(p.rental.number), p.rental.customer.name, p.method ?? "", num(Number(p.amount))]);
  }
  for (const e of [...expenses].reverse()) {
    rows.push(["Despesa", fmtDate(new Date(e.date + "T00:00:00Z")), categoryLabel(e.category), e.description, e.rental?.code ?? "", e.rental?.customerName ?? "", e.method ?? "", num(-e.amount)]);
  }
  const received = payments.reduce((s, p) => s + Number(p.amount), 0);
  const spent = expenses.reduce((s, e) => s + e.amount, 0);
  rows.push([]);
  rows.push(["Total recebido", "", "", "", "", "", "", num(received)]);
  rows.push(["Total despesas", "", "", "", "", "", "", num(-spent)]);
  rows.push(["Saldo do mês", "", "", "", "", "", "", num(received - spent)]);

  const body = "﻿" + rows.map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
