"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDate, parseISODate, today } from "@/lib/dates";
import { parseMoney } from "@/lib/format";
import { getRental, getStock } from "@/lib/rentals";

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

      const earlyAddition = current.items.find((i) => i.startDate && i.startDate < startDate);
      if (earlyAddition) {
        throw new UserError(
          `O acréscimo de ${earlyAddition.equipment.name} foi retirado em ${fmtDate(earlyAddition.startDate)}. A retirada da locação não pode ser depois disso.`,
        );
      }

      await tx.rental.update({ where: { id: p.id }, data });

      const keep = new Set(p.items.filter((i) => i.id).map((i) => i.id));
      for (const old of current.items) {
        if (!keep.has(old.id)) {
          if (old.returns.length) throw new UserError(`${old.equipment.name} já tem devolução registrada e não pode ser removido.`);
          await tx.rentalItem.delete({ where: { id: old.id } });
        }
      }
      // Retirada/previsão próprias dos acréscimos não fazem parte do formulário: o update abaixo não as toca.
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

const additionSchema = z.object({
  startDate: z.string().min(10, "Informe a data de retirada."),
  expectedEndDate: z.string().optional(),
  items: z
    .array(
      z.object({
        equipmentId: z.string().min(1),
        qty: z.number().int().positive("Quantidade inválida."),
        unitPrice: z.number().min(0),
        period: z.enum(["DIARIA", "SEMANAL", "QUINZENAL", "MENSAL", "ESPECIAL"]),
      }),
    )
    .min(1, "Escolha pelo menos um equipamento."),
});

export type AdditionPayload = z.infer<typeof additionSchema>;

/**
 * Acréscimo de equipamento: só com a locação ativa. Cada item ganha a própria retirada e previsão,
 * conta os próprios dias e é devolvido separadamente.
 */
export async function addItemsToRental(rentalId: string, payload: AdditionPayload): Promise<ActionResult> {
  await requireUser();
  const parsed = additionSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const p = parsed.data;

  const startDate = parseISODate(p.startDate);
  const expectedEndDate = parseISODate(p.expectedEndDate);
  if (!startDate) return { error: "Informe a data de retirada." };

  try {
    await db.$transaction(async (tx) => {
      const rental = await tx.rental.findUnique({ where: { id: rentalId } });
      if (!rental) throw new UserError("Locação não encontrada.");
      if (rental.stage !== "ATIVA") {
        throw new UserError("Acréscimo de equipamento só pode ser feito com a locação ativa. Confirme a locação primeiro (ou reabra, se estiver encerrada).");
      }
      if (startDate < rental.startDate) {
        throw new UserError(`A retirada do acréscimo não pode ser antes da retirada da locação (${fmtDate(rental.startDate)}).`);
      }
      const end = expectedEndDate ?? rental.expectedEndDate;
      if (end && end < startDate) {
        throw new UserError(expectedEndDate ? "A previsão de devolução é antes da retirada." : "Informe a previsão de devolução do acréscimo.");
      }

      // Estoque: soma o que foi pedido de cada equipamento e compara com o disponível agora.
      const stock = new Map((await getStock()).map((s) => [s.id, s]));
      const wanted = new Map<string, number>();
      for (const i of p.items) wanted.set(i.equipmentId, (wanted.get(i.equipmentId) ?? 0) + i.qty);
      for (const [eqId, qty] of wanted) {
        const s = stock.get(eqId);
        if (!s) throw new UserError("Equipamento não encontrado ou inativo.");
        if (qty > s.availableQty) {
          throw new UserError(`${s.name}: só ${Math.max(0, s.availableQty)} disponíve${s.availableQty === 1 ? "l" : "is"} no estoque (pedido ${qty}).`);
        }
      }

      await tx.rentalItem.createMany({
        data: p.items.map((i) => ({
          rentalId,
          equipmentId: i.equipmentId,
          qty: i.qty,
          unitPrice: i.unitPrice,
          period: i.period,
          startDate,
          // Sem previsão própria, guarda a da locação: o acréscimo não muda se a previsão da locação mudar depois.
          expectedEndDate: end,
        })),
      });
    });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  refresh(rentalId);
  return {};
}

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
    const itemStart = rental.calc.items[idx].startDate;
    if (date < itemStart) {
      return { error: `${item.equipment.name} foi retirado em ${fmtDate(itemStart)}. A devolução não pode ser antes disso.` };
    }
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

/** Liga/desliga a cobrança dos dias excedentes (depois da previsão) desta locação. */
export async function toggleChargeOverdue(id: string) {
  await requireUser();
  const r = await db.rental.findUnique({ where: { id }, select: { chargeOverdue: true } });
  if (r) await db.rental.update({ where: { id }, data: { chargeOverdue: !r.chargeOverdue } });
  refresh(id);
}
