"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseISODate, today } from "@/lib/dates";
import { parseMoney } from "@/lib/format";

export interface FormState {
  error?: string;
  ok?: number;
}

const price = (v: FormDataEntryValue | null) => (v == null || String(v).trim() === "" ? null : parseMoney(v));

export async function saveEquipment(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do equipamento." };
  const data = {
    name,
    maintenanceQty: Math.max(0, Math.round(Number(form.get("maintenanceQty") || 0))),
    priceDaily: price(form.get("priceDaily")),
    priceWeekly: price(form.get("priceWeekly")),
    priceBiweekly: price(form.get("priceBiweekly")),
    priceMonthly: price(form.get("priceMonthly")),
    active: form.get("active") === "on",
  };
  const dup = await db.equipment.findFirst({ where: { name: { equals: name, mode: "insensitive" }, NOT: id ? { id } : undefined } });
  if (dup) return { error: "Já existe um equipamento com esse nome." };

  if (id) {
    await db.equipment.update({ where: { id }, data });
  } else {
    const total = Math.max(0, Math.round(Number(form.get("totalQty") || 0)));
    const e = await db.equipment.create({
      data: {
        ...data,
        totalQty: total,
        countedAt: today(),
        stockEntries: total ? { create: { date: today(), kind: "COMPRA", qtyChange: total, totalAfter: total, note: "Cadastro inicial" } } : undefined,
      },
    });
    id = e.id;
  }
  revalidatePath("/", "layout");
  redirect(`/estoque/${id}`);
}

/** Compra soma; baixa subtrai; recontagem define o total contado. Tudo fica no histórico. */
export async function addStockEntry(id: string, _: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const kind = String(form.get("kind") ?? "COMPRA");
  const qty = Math.round(Number(form.get("qty") || 0));
  const date = parseISODate(String(form.get("date") ?? "")) ?? today();
  const note = String(form.get("note") ?? "").trim() || null;
  const eq = await db.equipment.findUnique({ where: { id } });
  if (!eq) return { error: "Equipamento não encontrado." };
  if (qty < 0 || (kind !== "RECONTAGEM" && qty === 0)) return { error: "Informe a quantidade." };

  let totalAfter = eq.totalQty;
  if (kind === "COMPRA") totalAfter += qty;
  else if (kind === "BAIXA") totalAfter -= qty;
  else if (kind === "RECONTAGEM") totalAfter = qty;
  else return { error: "Tipo inválido." };
  if (totalAfter < 0) return { error: `O total não pode ficar negativo (hoje: ${eq.totalQty}).` };

  await db.$transaction([
    db.stockEntry.create({ data: { equipmentId: id, kind, date, note, qtyChange: totalAfter - eq.totalQty, totalAfter } }),
    db.equipment.update({ where: { id }, data: { totalQty: totalAfter, countedAt: date } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}
