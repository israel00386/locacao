"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseISODate, today } from "@/lib/dates";
import { parseMoney } from "@/lib/format";
import { getRental } from "@/lib/rentals";

export interface ActionResult {
  error?: string;
}

const itemSchema = z.object({
  id: z.string().optional(),
  equipmentId: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
  period: z.enum(["DIARIA", "SEMANAL", "QUINZENAL", "MENSAL", "ESPECIAL"]),
  daysOverride: z.number().int().positive().nullable(),
});

const rentalSchema = z.object({
  id: z.string().optional(),
  customerId: z.string().optional(),
  newCustomer: z.object({ name: z.string().trim().min(1), phone: z.string().trim().optional() }).optional(),
  siteAddress: z.string().trim(),
  startDate: z.string().min(10),
  expectedEndDate: z.string().optional(),
  items: z.array(itemSchema).min(1, "Adicione pelo menos um equipamento."),
  extras: z.array(z.object({ description: z.string().trim().min(1), amount: z.number() })),
  discount: z.number().min(0),
  notes: z.string().optional(),
  confirm: z.boolean().optional(),
});

export type RentalPayload = z.infer<typeof rentalSchema>;

function refresh(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/locacoes/${id}`);
}

export async function saveRental(payload: RentalPayload): Promise<ActionResult> {
  await requireUser();
  const parsed = rentalSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const p = parsed.data;

  const startDate = parseISODate(p.startDate);
  const expectedEndDate = parseISODate(p.expectedEndDate);
  if (!startDate) return { error: "Informe a data de retirada." };
  if (expectedEndDate && expectedEndDate < startDate) return { error: "A previsão de devolução é antes da retirada." };

  let id = p.id;
  try {
    id = await db.$transaction(async (tx) => {
      let customerId = p.customerId;
      if (!customerId && p.newCustomer) {
        const c = await tx.customer.create({ data: { name: p.newCustomer.name, phone: p.newCustomer.phone || null } });
        customerId = c.id;
      }
      if (!customerId) throw new UserError("Escolha o cliente.");

      if (p.siteAddress) {
        await tx.site.upsert({
          where: { customerId_address: { customerId, address: p.siteAddress } },
          create: { customerId, address: p.siteAddress },
          update: {},
        });
      }

      const data = {
        customerId,
        siteAddress: p.siteAddress,
        startDate,
        expectedEndDate,
        discount: p.discount,
        notes: p.notes?.trim() || null,
      };

      if (!p.id) {
        const r = await tx.rental.create({
          data: {
            ...data,
            stage: p.confirm ? "ATIVA" : "ORCAMENTO",
            items: {
              create: p.items.map((i) => ({
                equipmentId: i.equipmentId,
                qty: i.qty,
                unitPrice: i.unitPrice,
                period: i.period,
                daysOverride: i.daysOverride,
              })),
            },
            extras: { create: p.extras },
          },
        });
        return r.id;
      }

      const current = await tx.rental.findUnique({ where: { id: p.id }, include: { items: { include: { returns: true, equipment: true } } } });
      if (!current) throw new UserError("Locação não encontrada.");
      if (current.stage === "ENCERRADA" || current.stage === "CANCELADA") throw new UserError("Reabra a locação para editar.");

      await tx.rental.update({ where: { id: p.id }, data });

      const keep = new Set(p.items.filter((i) => i.id).map((i) => i.id));
      for (const old of current.items) {
        if (!keep.has(old.id)) {
          if (old.returns.length) throw new UserError(`${old.equipment.name} já tem devolução registrada e não pode ser removido.`);
          await tx.rentalItem.delete({ where: { id: old.id } });
        }
      }
      for (const i of p.items) {
        const fields = { equipmentId: i.equipmentId, qty: i.qty, unitPrice: i.unitPrice, period: i.period, daysOverride: i.daysOverride };
        const old = i.id ? current.items.find((x) => x.id === i.id) : undefined;
        if (old) {
          const returned = old.returns.reduce((s, r) => s + r.qty, 0);
          if (i.qty < returned) throw new UserError(`A quantidade não pode ser menor que a já devolvida (${returned}).`);
          await tx.rentalItem.update({ where: { id: old.id }, data: fields });
        } else {
          await tx.rentalItem.create({ data: { ...fields, rentalId: p.id } });
        }
      }
      await tx.rentalExtra.deleteMany({ where: { rentalId: p.id } });
      if (p.extras.length) await tx.rentalExtra.createMany({ data: p.extras.map((e) => ({ ...e, rentalId: p.id! })) });
      return p.id;
    });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  refresh(id);
  redirect(`/locacoes/${id}`);
}

class UserError extends Error {}

export async function confirmRental(id: string) {
  await requireUser();
  await db.rental.update({ where: { id, stage: "ORCAMENTO" }, data: { stage: "ATIVA" } });
  refresh(id);
}

export async function registerReturn(rentalId: string, form: FormData): Promise<ActionResult> {
  await requireUser();
  const date = parseISODate(String(form.get("date") ?? "")) ?? today();
  const note = String(form.get("note") ?? "").trim() || null;
  const rental = await getRental(rentalId);
  if (!rental) return { error: "Locação não encontrada." };
  if (rental.stage !== "ATIVA") return { error: "Só é possível devolver material de locação ativa." };
  if (date < rental.startDate) return { error: "A devolução é antes da retirada." };

  const entries: { itemId: string; qty: number; chargedDays: number | null }[] = [];
  for (const [idx, item] of rental.items.entries()) {
    const qty = Math.round(Number(form.get(`qty_${item.id}`) || 0));
    if (!qty) continue;
    const max = rental.calc.items[idx].outstandingQty;
    if (qty < 0 || qty > max) return { error: `Quantidade inválida para ${item.equipment.name} (máximo ${max}).` };
    const daysRaw = String(form.get(`days_${item.id}`) ?? "").trim();
    entries.push({ itemId: item.id, qty, chargedDays: daysRaw ? Math.max(1, Math.round(Number(daysRaw))) : null });
  }
  if (!entries.length) return { error: "Informe a quantidade devolvida de pelo menos um item." };

  await db.itemReturn.createMany({ data: entries.map((e) => ({ ...e, date, note })) });
  refresh(rentalId);
  return {};
}

export async function deleteReturn(rentalId: string, returnId: string) {
  await requireUser();
  await db.itemReturn.delete({ where: { id: returnId } });
  refresh(rentalId);
}

export async function addPayment(rentalId: string, form: FormData): Promise<ActionResult> {
  await requireUser();
  const amount = parseMoney(form.get("amount"));
  if (amount <= 0) return { error: "Informe o valor recebido." };
  const date = parseISODate(String(form.get("date") ?? "")) ?? today();
  await db.payment.create({
    data: {
      rentalId,
      amount,
      date,
      method: String(form.get("method") ?? "").trim() || null,
      note: String(form.get("note") ?? "").trim() || null,
    },
  });
  refresh(rentalId);
  return {};
}

export async function deletePayment(rentalId: string, paymentId: string) {
  await requireUser();
  await db.payment.delete({ where: { id: paymentId } });
  refresh(rentalId);
}

/** Encerrar = tudo devolvido. O saldo em aberto continua aparecendo no financeiro. */
export async function closeRental(id: string): Promise<ActionResult> {
  await requireUser();
  const r = await getRental(id);
  if (!r) return { error: "Locação não encontrada." };
  if (!r.calc.allReturned) return { error: "Ainda há material na obra. Registre a devolução antes de encerrar." };
  await db.rental.update({ where: { id }, data: { stage: "ENCERRADA", closedAt: today(), negotiating: false } });
  refresh(id);
  return {};
}

export async function reopenRental(id: string) {
  await requireUser();
  await db.rental.update({ where: { id }, data: { stage: "ATIVA", closedAt: null } });
  refresh(id);
}

export async function cancelRental(id: string): Promise<ActionResult> {
  await requireUser();
  const r = await getRental(id);
  if (!r) return { error: "Locação não encontrada." };
  if (r.items.some((i) => i.returns.length) || r.payments.length) {
    return { error: "Esta locação já tem devoluções ou pagamentos. Encerre em vez de cancelar." };
  }
  await db.rental.update({ where: { id }, data: { stage: "CANCELADA" } });
  refresh(id);
  return {};
}

export async function deleteRental(id: string) {
  await requireUser();
  const r = await db.rental.findUnique({ where: { id } });
  if (r && (r.stage === "ORCAMENTO" || r.stage === "CANCELADA")) {
    await db.rental.delete({ where: { id } });
  }
  refresh();
  redirect("/locacoes");
}

export async function toggleNegotiating(id: string) {
  await requireUser();
  const r = await db.rental.findUnique({ where: { id } });
  if (r) await db.rental.update({ where: { id }, data: { negotiating: !r.negotiating } });
  refresh(id);
}
