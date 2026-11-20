import Link from "next/link";
import { PageHeader, Section } from "@/components/ui";
import { ActionButton } from "@/components/rental-actions";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getCompany } from "@/lib/rentals";
import { AddUserForm, CompanyForm, PasswordForm } from "./forms";
import { removeUser } from "./actions";

export const metadata = { title: "Configurações" };

export default async function ConfigPage() {
  const [company, users, me] = await Promise.all([getCompany(), db.user.findMany({ orderBy: { createdAt: "asc" } }), getSession()]);
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Empresa e orçamento">
          <CompanyForm company={company} />
        </Section>
        <div className="space-y-4">
          <Section title="Importar planilha">
            <div className="p-4 text-sm text-slate-600">
              Traga clientes, estoque e locações da planilha do Google Sheets (Arquivo → Fazer download → .xlsx).
              <Link href="/config/importar" className="btn-secondary mt-3 w-full">Abrir importação</Link>
            </div>
          </Section>
          <Section title="Usuários">
            <ul className="divide-y divide-slate-100 text-sm">
              {users.map((u) => (
                <li key={u.id} className="flex items-center justify-between gap-2 px-4 py-2">
                  <span>
                    <span className="font-medium">{u.name}</span>
                    <span className="block text-xs text-slate-500">{u.email}</span>
                  </span>
                  {u.id !== me?.userId && (
                    <ActionButton className="text-xs text-red-600 hover:underline" confirm={`Remover o acesso de ${u.name}?`} action={removeUser.bind(null, u.id)}>
                      remover
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>
            <div className="border-t border-slate-100"><AddUserForm /></div>
          </Section>
          <Section title="Minha senha">
            <PasswordForm />
          </Section>
        </div>
      </div>
    </>
  );
}
