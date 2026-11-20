// Importa a planilha "Locar Equipamento e Serviços.xlsx" (abas Clientes, Estoque, Locações Ativas e Orçamento).
import ExcelJS from "exceljs";
import type { PrismaClient } from "@prisma/client";
import { calcRental, suggestPeriod } from "./calc";
import { inclusiveDays, toISODate, today } from "./dates";
import { round2 } from "./format";

type Cell = ExcelJS.CellValue;

function val(v: Cell): string | number | Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return val((v as ExcelJS.CellFormulaValue).result as Cell);
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join("");
    if ("text" in v) return String((v as ExcelJS.CellHyperlinkValue).text);
    if ("formula" in v || "sharedFormula" in v) return null;
    return null;
  }
  return v as string | number;
}

function str(v: Cell): string | null {
  const x = val(v);
  if (x == null) return null;
  const s = (x instanceof Date ? toISODate(x) : String(x)).trim();
  return s === "" || s === "-" ? null : s;
}

function num(v: Cell): number | null {
  const x = val(v);
  if (x == null || x instanceof Date) return null;
  if (typeof x === "number") return x;
  const s = x.trim().replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return s && Number.isFinite(n) ? n : null;
}

function date(v: Cell): Date | null {
  const x = val(v);
  if (x instanceof Date) return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth(), x.getUTCDate()));
  if (typeof x === "string") {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(x.trim());
    if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
  }
  return null;
}

const key = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

export interface ImportReport {
  customers: number;
  equipment: number;
  rentals: number;
  rentalLines: number;
  active: number;
  closed: number;
  payments: number;
  fixedFinalizedWithoutReturn: number;
  createdEquipment: string[];
  createdCustomers: string[];
  skippedLines: number;
  warnings: string[];
}

export async function importWorkbook(db: PrismaClient, buffer: ArrayBuffer | Buffer, opts: { replace: boolean }): Promise<ImportReport> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);
  const sheet = (name: string) => wb.worksheets.find((w) => key(w.name) === key(name));

  const wsC = sheet("Clientes");
  const wsE = sheet("Estoque");
  const wsL = sheet("Locações Ativas");
  if (!wsC || !wsE || !wsL) throw new Error("A planilha precisa ter as abas Clientes, Estoque e Locações Ativas.");

  if ((await db.rental.count()) > 0 || (await db.customer.count()) > 0) {
    if (!opts.replace) throw new Error("Já existem dados no sistema. Marque “substituir tudo” para apagar e importar de novo.");
    await db.$transaction([
      db.payment.deleteMany(),
      db.itemReturn.deleteMany(),
      db.rentalItem.deleteMany(),
      db.rentalExtra.deleteMany(),
      db.rental.deleteMany(),
      db.site.deleteMany(),
      db.customer.deleteMany(),
      db.stockEntry.deleteMany(),
      db.equipment.deleteMany(),
    ]);
    await db.$executeRawUnsafe(`ALTER SEQUENCE "Rental_number_seq" RESTART WITH 1`);
  }

  const report: ImportReport = {
    customers: 0,
    equipment: 0,
    rentals: 0,
    rentalLines: 0,
    active: 0,
    closed: 0,
    payments: 0,
    fixedFinalizedWithoutReturn: 0,
    createdEquipment: [],
    createdCustomers: [],
    skippedLines: 0,
    warnings: [],
  };

  // ---------- Estoque ----------
  const equipmentIds = new Map<string, string>();
  let order = 0;
  for (let i = 2; i <= wsE.rowCount; i++) {
    const row = wsE.getRow(i);
    const name = str(row.getCell(1).value);
    if (!name) continue;
    if (equipmentIds.has(key(name))) continue;
    const total = Math.round(num(row.getCell(3).value) ?? 0);
    const countedAt = date(row.getCell(2).value);
    const e = await db.equipment.create({
      data: {
        name: name.replace(/\s+/g, " "),
        totalQty: total,
        maintenanceQty: Math.round(num(row.getCell(6).value) ?? 0),
        priceDaily: num(row.getCell(7).value),
        priceWeekly: num(row.getCell(8).value),
        priceBiweekly: num(row.getCell(9).value),
        priceMonthly: num(row.getCell(10).value),
        countedAt,
        sortOrder: order++,
        stockEntries: { create: { date: countedAt ?? today(), kind: "RECONTAGEM", qtyChange: total, totalAfter: total, note: "Importado da planilha" } },
      },
    });
    equipmentIds.set(key(name), e.id);
    report.equipment++;
  }

  // ---------- Clientes ----------
  const customerIds = new Map<string, string>();
  for (let i = 2; i <= wsC.rowCount; i++) {
    const row = wsC.getRow(i);
    const name = str(row.getCell(1).value);
    if (!name || customerIds.has(key(name))) continue;
    const c = await db.customer.create({
      data: {
        name: name.replace(/\s+/g, " "),
        responsible: str(row.getCell(2).value),
        phone: str(row.getCell(3).value),
        type: str(row.getCell(6).value) ?? "Cliente",
        status: str(row.getCell(7).value) ?? "Ativo",
      },
    });
    customerIds.set(key(name), c.id);
    report.customers++;
  }

  // ---------- Locações ----------
  interface Line {
    customer: string;
    site: string;
    equipment: string;
    qty: number;
    unit: number;
    extra: number | null;
    extraDesc: string | null;
    start: Date;
    expected: Date | null;
    returned: Date | null;
    days: number | null;
    paid: number | null;
    status: string;
    notes: string | null;
  }
  const groups = new Map<string, Line[]>();
  for (let i = 2; i <= wsL.rowCount; i++) {
    const row = wsL.getRow(i);
    const customer = str(row.getCell(1).value);
    if (!customer) continue;
    const equipment = str(row.getCell(3).value);
    const qty = Math.round(num(row.getCell(4).value) ?? 0);
    const start = date(row.getCell(10).value);
    if (!equipment || !qty || !start) {
      report.skippedLines++;
      report.warnings.push(`Linha ${i} ignorada (faltando equipamento, quantidade ou data de retirada).`);
      continue;
    }
    let expectedDate = date(row.getCell(11).value);
    if (expectedDate && expectedDate < start) {
      report.warnings.push(`Linha ${i} (${customer}): previsão ${toISODate(expectedDate)} antes da retirada ${toISODate(start)}, previsão deixada em branco.`);
      expectedDate = null;
    }
    const line: Line = {
      customer,
      site: str(row.getCell(2).value) ?? "",
      equipment,
      qty,
      // O banco guarda 3 casas; arredonda antes de calcular para não sobrar centavos.
      unit: Math.round((num(row.getCell(6).value) ?? 0) * 1000) / 1000,
      extra: num(row.getCell(8).value),
      extraDesc: str(row.getCell(9).value),
      start,
      expected: expectedDate,
      returned: date(row.getCell(12).value),
      days: num(row.getCell(13).value),
      paid: num(row.getCell(15).value),
      status: str(row.getCell(17).value) ?? "Em Aberto",
      notes: str(row.getCell(18).value),
    };
    const g = `${key(customer)}|${key(line.site)}|${toISODate(start)}`;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(line);
    report.rentalLines++;
  }

  const now = today();
  for (const lines of groups.values()) {
    const first = lines[0];
    let customerId = customerIds.get(key(first.customer));
    if (!customerId) {
      const c = await db.customer.create({ data: { name: first.customer } });
      customerId = c.id;
      customerIds.set(key(first.customer), c.id);
      report.createdCustomers.push(first.customer);
    }
    if (first.site) {
      await db.site.upsert({
        where: { customerId_address: { customerId, address: first.site } },
        create: { customerId, address: first.site },
        update: {},
      });
    }

    const statuses = lines.map((l) => key(l.status));
    const allFinal = statuses.every((s) => s === "finalizado");
    const settled = statuses.every((s) => s === "finalizado" || s === "pago");
    const expected = lines.map((l) => l.expected).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null;

    const items = [];
    for (const l of lines) {
      let eqId = equipmentIds.get(key(l.equipment));
      if (!eqId) {
        const e = await db.equipment.create({ data: { name: l.equipment, totalQty: 0, active: true, sortOrder: order++ } });
        eqId = e.id;
        equipmentIds.set(key(l.equipment), e.id);
        report.createdEquipment.push(l.equipment);
      }
      let returned = l.returned;
      // "Finalizado" sem data de entrega: o material com certeza já voltou.
      if (!returned && key(l.status) === "finalizado") {
        returned = l.expected ?? l.start;
        report.fixedFinalizedWithoutReturn++;
      }
      const days = l.days != null ? Math.max(1, Math.round(l.days)) : null;
      const periodDays = days ?? (l.expected ? inclusiveDays(l.start, l.expected) : 1);
      items.push({
        equipmentId: eqId,
        qty: l.qty,
        unitPrice: l.unit,
        period: suggestPeriod(periodDays),
        daysOverride: returned ? null : days,
        returns: returned ? [{ qty: l.qty, date: returned < l.start ? l.start : returned, chargedDays: days, note: "Importado" }] : [],
      });
    }

    const extras = lines
      .filter((l) => l.extra)
      .map((l) => ({ description: (l.extraDesc ?? "Acréscimo").trim(), amount: l.extra! }));
    const paidSheet = round2(lines.reduce((s, l) => s + (l.paid ?? 0), 0));

    const allReturned = items.every((i) => i.returns.length > 0);
    const stage = allReturned && allFinal ? "ENCERRADA" : "ATIVA";

    const calc = calcRental(
      {
        stage,
        startDate: first.start,
        expectedEndDate: expected,
        discount: 0,
        extras,
        payments: [],
        items: items.map((i) => ({ qty: i.qty, unitPrice: i.unitPrice, daysOverride: i.daysOverride, returns: i.returns })),
      },
      now,
    );

    // Pago/Finalizado na planilha = quitado. Se pagou menos que o calculado, a diferença vira desconto.
    let payment = paidSheet;
    let discount = 0;
    if (settled) {
      if (paidSheet <= 0) payment = calc.total;
      else if (paidSheet < calc.total) discount = round2(calc.total - paidSheet);
    }
    const lastDate = items.flatMap((i) => i.returns.map((r) => r.date)).sort((a, b) => b.getTime() - a.getTime())[0] ?? first.start;

    await db.rental.create({
      data: {
        stage,
        customerId,
        siteAddress: first.site,
        startDate: first.start,
        expectedEndDate: expected,
        discount,
        negotiating: statuses.includes("negociação"),
        notes: [...new Set(lines.map((l) => l.notes).filter(Boolean))].join(" / ") || null,
        closedAt: stage === "ENCERRADA" ? lastDate : null,
        items: {
          create: items.map((i) => ({
            equipmentId: i.equipmentId,
            qty: i.qty,
            unitPrice: i.unitPrice,
            period: i.period,
            daysOverride: i.daysOverride,
            returns: { create: i.returns },
          })),
        },
        extras: { create: extras },
        payments: payment > 0 ? { create: { amount: payment, date: lastDate, method: "Importado", note: "Valor pago na planilha" } } : undefined,
      },
    });
    report.rentals++;
    if (payment > 0) report.payments++;
    if (stage === "ATIVA") report.active++;
    else report.closed++;
  }

  // ---------- Dados do orçamento (Pix, observações) ----------
  const wsO = sheet("Orçamento");
  if (wsO) {
    const text = (addr: string) => str(wsO.getCell(addr).value) ?? "";
    const after = (s: string) => s.replace(/^[^:]*:\s*/, "").trim();
    const notes = ["D30", "D31", "D32", "D33"].map(text).filter(Boolean).map((s) => s.replace(/^•\s*/, ""));
    const loc = text("E4").split("•").map((s) => s.trim());
    await db.company.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    await db.company.update({
      where: { id: 1 },
      data: {
        ...(text("A2") && { name: text("A2") }),
        ...(text("E3") && { subtitle: text("E3") }),
        ...(loc[0] && { location: loc[0] }),
        ...(loc[1] && { instagram: loc[1] }),
        ...(text("A30") && { pixKey: after(text("A30")) }),
        ...(text("A31") && { pixName: after(text("A31")) }),
        ...(text("A32") && { pixBank: after(text("A32")) }),
        ...(notes.length && { quoteNotes: notes.join("\n") }),
        ...(text("A34") && { footer: text("A34") }),
      },
    });
  }

  return report;
}
