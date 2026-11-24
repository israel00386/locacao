"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { EXPENSE_CATEGORY_VALUES } from "@/lib/expense-categories";
import { parseMoney } from "@/lib/format";

export interface ExpenseActionResult {
  error?: string;
}

const expenseSchema = z.object({
  date: z.string().min(1, "Informe a data."),
  category: z.enum(EXPENSE_CATEGORY_VALUES, { error: "Escolha a categoria." }),
  description: z.string().trim().max(300, "Descrição muito longa."),
  amount: z.number().positive("Informe o valor da despesa.").max(10_000_000, "Valor muito alto."),
  method: z.string().trim().max(40).nullable(),
  rentalId: z.string().trim().nullable(),
});

async function parseForm(form: FormData) {
  const text = (k: string) => {
    const v = String(form.get(k) ?? "").trim();
    return v || null;
  };
  const parsed = expenseSchema.safeParse({
    date: String(form.get("date") ?? ""),
    category: String(form.get("category") ?? ""),
    description: String(form.get("description") ?? ""),
    amount: parseMoney(form.get("amount")),
    method: text("method"),
    rentalId: text("rentalId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." } as const;
  const p = parsed.data;
  const date = parseISODate(p.date);
  if (!date) return { error: "Data inválida." } as const;
  if (p.rentalId && !(await db.rental.findUnique({ where: { id: p.rentalId }, select: { id: true } }))) {
    return { error: "Locação não encontrada." } as const;
  }
  return { data: { date, category: p.category, description: p.description, amount: p.amount, method: p.method, rentalId: p.rentalId } } as const;
}

function refresh(...rentalIds: (string | null | undefined)[]) {
  revalidatePath("/", "layout");
  revalidatePath("/financeiro");
  for (const id of new Set(rentalIds)) if (id) revalidatePath(`/locacoes/${id}`);
}

export async function addExpense(form: FormData): Promise<ExpenseActionResult> {
  await requireUser();
  const r = await parseForm(form);
  if ("error" in r) return { error: r.error };
  await db.expense.create({ data: r.data });
  refresh(r.data.rentalId);
  return {};
}

export async function updateExpense(id: string, form: FormData): Promise<ExpenseActionResult> {
  await requireUser();
  const old = await db.expense.findUnique({ where: { id }, select: { rentalId: true } });
  if (!old) return { error: "Despesa não encontrada (pode ter sido excluída)." };
  const r = await parseForm(form);
  if ("error" in r) return { error: r.error };
  await db.expense.update({ where: { id }, data: r.data });
  refresh(old.rentalId, r.data.rentalId);
  return {};
}

export async function deleteExpense(id: string): Promise<ExpenseActionResult> {
  await requireUser();
  const old = await db.expense.findUnique({ where: { id }, select: { rentalId: true } });
  if (!old) return {};
  await db.expense.delete({ where: { id } });
  refresh(old.rentalId);
  return {};
}
