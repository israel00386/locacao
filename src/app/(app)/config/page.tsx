import Link from "next/link";
import { Building2, ChevronRight, FileSpreadsheet, KeyRound, Users } from "lucide-react";
import { Avatar, Badge, Section, TopBar } from "@/components/ui";
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
      <TopBar title="Configurações" subtitle="Dados da empresa, orçamento, acessos e importação." />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-6">
        <Section title="Empresa e orçamento" icon={<Building2 />} description="Aparece no orçamento enviado ao cliente">
          <CompanyForm company={company} />
        </Section>
        <div className="grid gap-5 lg:gap-6">
          <Link
            href="/config/importar"
            className="card-soft tap group relative flex items-center gap-4 overflow-hidden p-5 hover:brightness-[1.01]"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-[inset_0_1px_0_rgb(255_255_255/.35)]" aria-hidden>
              <FileSpreadsheet className="h-[22px] w-[22px]" strokeWidth={2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-brand-950">Importar planilha</span>
              <span className="mt-0.5 block text-[13px] text-slate-500">Clientes, estoque e locações do Google Sheets (.xlsx)</span>
            </span>
            <ChevronRight className="tap-chevron h-5 w-5 shrink-0 text-slate-300" strokeWidth={2} aria-hidden />
          </Link>

          <Section title="Usuários" icon={<Users />} description={`${users.length} ${users.length === 1 ? "pessoa tem" : "pessoas têm"} acesso`}>
            <ul className="divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className="flex min-h-[4.25rem] items-center gap-3 px-4 py-3 sm:px-5">
                  <Avatar name={u.name} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-semibold text-slate-900">{u.name}</span>
                      {u.id === me?.userId && <Badge tone="sky">Você</Badge>}
                    </span>
                    <span className="block truncate text-[13px] text-slate-500">{u.email}</span>
                  </span>
                  {u.id !== me?.userId && (
                    <ActionButton
                      className="btn-ghost btn-sm shrink-0 text-red-600 hover:bg-red-50"
                      confirm={`Remover o acesso de ${u.name}?`}
                      action={removeUser.bind(null, u.id)}
                    >
                      Remover
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>
            <div className="mx-3 mb-3 rounded-[20px] bg-[var(--app-bg)] [&_.input]:bg-white">
              <AddUserForm />
            </div>
          </Section>

          <Section title="Minha senha" icon={<KeyRound />} description="Use pelo menos 6 caracteres">
            <PasswordForm />
          </Section>
        </div>
      </div>
    </>
  );
}
