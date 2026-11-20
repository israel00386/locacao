"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export interface FormState {
  error?: string;
  ok?: number;
}

export async function saveCustomer(id: string | null, _: FormState, form: FormData): Promise<FormState> {
  await requireUser();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome." };
  const s = (k: string) => String(form.get(k) ?? "").trim() || null;
  const data = {
    name,
    responsible: s("responsible"),
    phone: s("phone"),
    type: s("type") ?? "Cliente",
    status: s("status") ?? "Ativo",
    notes: s("notes"),
  };
  if (id) await db.customer.update({ where: { id }, data });
  else id = (await db.customer.create({ data })).id;
  revalidatePath("/", "layout");
  redirect(`/clientes/${id}`);
}

export async function deleteSite(customerId: string, siteId: string) {
  await requireUser();
  await db.site.delete({ where: { id: siteId } });
  revalidatePath(`/clientes/${customerId}`);
}

export async function deleteCustomer(id: string) {
  await requireUser();
  const count = await db.rental.count({ where: { customerId: id } });
  if (count > 0) return { error: "Cliente tem locações. Marque como Bloqueado em vez de excluir." };
  await db.customer.delete({ where: { id } });
  revalidatePath("/clientes");
  redirect("/clientes");
}
