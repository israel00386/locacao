"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { importWorkbook, type ImportReport } from "@/lib/importer";

export interface FormState {
  error?: string;
  ok?: number;
}

export async function saveCompany(_: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const s = (k: string) => String(form.get(k) ?? "").trim();
  const data = {
    name: s("name") || "LOCAR EQUIPAMENTOS",
    subtitle: s("subtitle"),
    location: s("location"),
    instagram: s("instagram"),
    phone: s("phone"),
    pixKey: s("pixKey"),
    pixName: s("pixName"),
    pixBank: s("pixBank"),
    quoteNotes: s("quoteNotes"),
    footer: s("footer"),
  };
  await db.company.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  revalidatePath("/", "layout");
  return { ok: Date.now() };
}

export async function addUser(_: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email.includes("@")) return { error: "Preencha nome e e-mail." };
  if (password.length < 6) return { error: "Senha com pelo menos 6 caracteres." };
  if (await db.user.findUnique({ where: { email } })) return { error: "Já existe usuário com esse e-mail." };
  await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/config");
  return { ok: Date.now() };
}

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireUser();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const user = await db.user.findUnique({ where: { id: me.userId } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { error: "Senha atual incorreta." };
  if (next.length < 6) return { error: "Nova senha com pelo menos 6 caracteres." };
  await db.user.update({ where: { id: me.userId }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: Date.now() };
}

export async function removeUser(id: string) {
  const me = await requireUser();
  if (id === me.userId) return { error: "Você não pode remover o próprio acesso." };
  await db.user.delete({ where: { id } });
  revalidatePath("/config");
}

export interface ImportState {
  error?: string;
  report?: ImportReport;
}

export async function importSpreadsheet(_: ImportState, form: FormData): Promise<ImportState> {
  await requireUser();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Escolha o arquivo .xlsx da planilha." };
  try {
    const report = await importWorkbook(db, await file.arrayBuffer(), { replace: form.get("replace") === "on" });
    revalidatePath("/", "layout");
    return { report };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao importar." };
  }
}
