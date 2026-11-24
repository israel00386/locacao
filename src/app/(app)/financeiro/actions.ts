"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseISODate } from "@/lib/dates";
import { CATEGORY_COLORS, CATEGORY_ICON_KEYS, normalizeCategoryName, type ExpenseCategoryData } from "@/lib/expense-categories";
import { parseMoney } from "@/lib/format";

export interface ExpenseActionResult {
  error?: string;
}

const text = (form: FormData, k: string) => {
  const v = String(form.get(k) ?? "").trim();
  return v || null;
};

/* ------------------------------------------------------------------ */
/* Despesas                                                             */
/* ------------------------------------------------------------------ */

const expenseSchema = z.object({
  date: z.string().min(1, "Informe a data."),
  category: z.string().trim().min(1, "Escolha a categoria."),
  description: z.string().trim().max(300, "Descrição muito longa."),
  amount: z.number().positive("Informe o valor da despesa.").max(10_000_000, "Valor muito alto."),
  method: z.string().trim().max(40).nullable(),
  rentalId: z.string().trim().nullable(),
});

async function parseForm(form: FormData, currentCategory?: string) {
  const parsed = expenseSchema.safeParse({
    date: String(form.get("date") ?? ""),
    category: String(form.get("category") ?? ""),
    description: String(form.get("description") ?? ""),
    amount: parseMoney(form.get("amount")),
    method: text(form, "method"),
    rentalId: text(form, "rentalId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." } as const;
  const p = parsed.data;
  const date = parseISODate(p.date);
  if (!date) return { error: "Data inválida." } as const;
  const cat = await db.expenseCategory.findUnique({ where: { id: p.category }, select: { active: true } });
  // Categoria desativada só vale se a despesa já era dela (edição).
  if (!cat || (!cat.active && p.category !== currentCategory)) return { error: "Escolha a categoria." } as const;
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
  const old = await db.expense.findUnique({ where: { id }, select: { rentalId: true, category: true } });
  if (!old) return { error: "Despesa não encontrada (pode ter sido excluída)." };
  const r = await parseForm(form, old.category);
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

/* ------------------------------------------------------------------ */
/* Categorias de despesa                                                */
/* ------------------------------------------------------------------ */

export interface CategoryActionResult {
  error?: string;
  category?: ExpenseCategoryData;
}

const categorySchema = z.object({
  name: z.string().min(1, "Informe o nome da categoria.").max(40, "Nome muito longo (até 40 letras)."),
  color: z.enum(CATEGORY_COLORS, { error: "Escolha uma cor." }),
  icon: z.enum(CATEGORY_ICON_KEYS, { error: "Escolha um ícone." }),
  isFreight: z.boolean(),
});

function parseCategory(form: FormData) {
  return categorySchema.safeParse({
    name: normalizeCategoryName(String(form.get("name") ?? "")),
    color: String(form.get("color") ?? ""),
    icon: String(form.get("icon") ?? ""),
    isFreight: form.get("isFreight") === "on",
  });
}

const categorySelect = { id: true, name: true, color: true, icon: true, isFreight: true, active: true, sortOrder: true } as const;

async function nameTaken(name: string, exceptId?: string) {
  const dup = await db.expenseCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" }, NOT: exceptId ? { id: exceptId } : undefined }, select: { id: true } });
  return !!dup;
}

function refreshCategories() {
  revalidatePath("/", "layout");
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/categorias");
}

export async function createCategory(form: FormData): Promise<CategoryActionResult> {
  await requireUser();
  const parsed = parseCategory(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const p = parsed.data;
  if (await nameTaken(p.name)) return { error: "Já existe uma categoria com esse nome." };
  // Nova categoria entra antes de "Outros" (sortOrder 99).
  const last = await db.expenseCategory.aggregate({ _max: { sortOrder: true }, where: { sortOrder: { lt: 99 } } });
  const category = await db.expenseCategory.create({
    data: { name: p.name, color: p.color, icon: p.icon, isFreight: p.isFreight, sortOrder: (last._max.sortOrder ?? 0) + 1 },
    select: categorySelect,
  });
  refreshCategories();
  return { category };
}

export async function updateCategory(id: string, form: FormData): Promise<CategoryActionResult> {
  await requireUser();
  const parsed = parseCategory(form);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const p = parsed.data;
  if (!(await db.expenseCategory.findUnique({ where: { id }, select: { id: true } }))) return { error: "Categoria não encontrada." };
  if (await nameTaken(p.name, id)) return { error: "Já existe uma categoria com esse nome." };
  const category = await db.expenseCategory.update({
    where: { id },
    data: { name: p.name, color: p.color, icon: p.icon, isFreight: p.isFreight, active: form.has("active") ? form.get("active") === "on" : undefined },
    select: categorySelect,
  });
  refreshCategories();
  return { category };
}

export async function setCategoryActive(id: string, active: boolean): Promise<CategoryActionResult> {
  await requireUser();
  if (!active) {
    const remaining = await db.expenseCategory.count({ where: { active: true, NOT: { id } } });
    if (remaining === 0) return { error: "Deixe pelo menos uma categoria ativa." };
  }
  const category = await db.expenseCategory.update({ where: { id }, data: { active }, select: categorySelect }).catch(() => null);
  if (!category) return { error: "Categoria não encontrada." };
  refreshCategories();
  return { category };
}

/** Exclui só se nenhuma despesa usa a categoria; senão, peça para desativar. */
export async function deleteCategory(id: string): Promise<CategoryActionResult> {
  await requireUser();
  const used = await db.expense.count({ where: { category: id } });
  if (used > 0) {
    return { error: `Esta categoria tem ${used} despesa${used === 1 ? "" : "s"}. Desative-a: ela some do formulário e as despesas antigas continuam com ela.` };
  }
  const remaining = await db.expenseCategory.count({ where: { active: true, NOT: { id } } });
  if (remaining === 0) return { error: "Deixe pelo menos uma categoria ativa." };
  await db.expenseCategory.delete({ where: { id } }).catch(() => null);
  refreshCategories();
  return {};
}

/* ------------------------------------------------------------------ */
/* Caixa: movimentações manuais e saldo inicial                         */
/* ------------------------------------------------------------------ */

export interface CashActionResult {
  error?: string;
}

const cashEntrySchema = z.object({
  kind: z.enum(["ENTRADA", "SAIDA"], { error: "Escolha entrada ou saída." }),
  date: z.string().min(1, "Informe a data."),
  description: z.string().trim().min(1, "Descreva a movimentação (ex.: aporte do sócio).").max(200, "Descrição muito longa."),
  amount: z.number().positive("Informe o valor.").max(100_000_000, "Valor muito alto."),
  method: z.string().trim().max(40).nullable(),
});

function parseCashEntry(form: FormData) {
  const parsed = cashEntrySchema.safeParse({
    kind: String(form.get("kind") ?? ""),
    date: String(form.get("date") ?? ""),
    description: String(form.get("description") ?? ""),
    amount: parseMoney(form.get("amount")),
    method: text(form, "method"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." } as const;
  const date = parseISODate(parsed.data.date);
  if (!date) return { error: "Data inválida." } as const;
  return { data: { ...parsed.data, date } } as const;
}

function refreshCash() {
  revalidatePath("/", "layout");
  revalidatePath("/financeiro");
}

export async function addCashEntry(form: FormData): Promise<CashActionResult> {
  await requireUser();
  const r = parseCashEntry(form);
  if ("error" in r) return { error: r.error };
  await db.cashEntry.create({ data: r.data });
  refreshCash();
  return {};
}

export async function updateCashEntry(id: string, form: FormData): Promise<CashActionResult> {
  await requireUser();
  const r = parseCashEntry(form);
  if ("error" in r) return { error: r.error };
  const ok = await db.cashEntry.update({ where: { id }, data: r.data }).catch(() => null);
  if (!ok) return { error: "Movimentação não encontrada (pode ter sido excluída)." };
  refreshCash();
  return {};
}

export async function deleteCashEntry(id: string): Promise<CashActionResult> {
  await requireUser();
  await db.cashEntry.delete({ where: { id } }).catch(() => null);
  refreshCash();
  return {};
}

const openingSchema = z.object({
  balance: z.number().min(-100_000_000, "Valor muito baixo.").max(100_000_000, "Valor muito alto."),
  date: z.string().nullable(),
});

/** Saldo inicial do caixa: valor que havia no início do dia `date` (vazio = desde sempre). */
export async function setCashOpening(form: FormData): Promise<CashActionResult> {
  await requireUser();
  const raw = String(form.get("balance") ?? "").trim();
  const negative = raw.startsWith("-") || raw.startsWith("−");
  const parsed = openingSchema.safeParse({
    balance: (negative ? -1 : 1) * parseMoney(raw.replace(/^[-−]/, "")),
    date: text(form, "date"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const date = parsed.data.date ? parseISODate(parsed.data.date) : null;
  if (parsed.data.date && !date) return { error: "Data inválida." };
  await db.company.upsert({
    where: { id: 1 },
    update: { cashOpeningBalance: parsed.data.balance, cashOpeningDate: date },
    create: { id: 1, cashOpeningBalance: parsed.data.balance, cashOpeningDate: date },
  });
  refreshCash();
  return {};
}
