"use client";
import { useActionState } from "react";
import { addUser, changePassword, importSpreadsheet, saveCompany, type FormState, type ImportState } from "./actions";

type Company = {
  name: string; subtitle: string; location: string; instagram: string; phone: string;
  pixKey: string; pixName: string; pixBank: string; quoteNotes: string; footer: string;
};

function Msg({ state, ok }: { state: FormState; ok: string }) {
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p className="text-sm text-brand-700">{ok}</p>;
  return null;
}

export function CompanyForm({ company }: { company: Company }) {
  const [state, action, pending] = useActionState(saveCompany, {});
  const f = (name: keyof Company, label: string, span = false) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={`co-${name}`}>{label}</label>
      <input id={`co-${name}`} name={name} className="input" defaultValue={company[name]} />
    </div>
  );
  return (
    <form action={action} className="space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {f("name", "Nome da empresa")}
        {f("subtitle", "Frase abaixo do nome")}
        {f("location", "Cidade")}
        {f("instagram", "Instagram")}
        {f("phone", "Telefone/WhatsApp da empresa")}
        {f("pixKey", "Chave Pix")}
        {f("pixName", "Favorecido")}
        {f("pixBank", "Banco")}
      </div>
      <div>
        <label className="label" htmlFor="co-notes">Observações do orçamento (uma por linha)</label>
        <textarea id="co-notes" name="quoteNotes" rows={4} className="input" defaultValue={company.quoteNotes} />
      </div>
      {f("footer", "Rodapé", true)}
      <Msg state={state} ok="Salvo." />
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar"}</button>
    </form>
  );
}

export function AddUserForm() {
  const [state, action, pending] = useActionState(addUser, {});
  return (
    <form action={action} key={state.ok ?? 0} className="grid gap-3 p-4 sm:grid-cols-3">
      <input name="name" className="input" placeholder="Nome" required />
      <input name="email" type="email" className="input" placeholder="E-mail" required />
      <input name="password" type="password" className="input" placeholder="Senha (mín. 6)" required minLength={6} />
      <div className="sm:col-span-3"><Msg state={state} ok="Usuário criado." /></div>
      <button className="btn-secondary sm:col-span-3" disabled={pending}>Adicionar usuário</button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} key={state.ok ?? 0} className="grid gap-3 p-4 sm:grid-cols-2">
      <input name="current" type="password" className="input" placeholder="Senha atual" required autoComplete="current-password" />
      <input name="next" type="password" className="input" placeholder="Nova senha" required minLength={6} autoComplete="new-password" />
      <div className="sm:col-span-2"><Msg state={state} ok="Senha alterada." /></div>
      <button className="btn-secondary sm:col-span-2" disabled={pending}>Trocar minha senha</button>
    </form>
  );
}

export function ImportForm({ hasData }: { hasData: boolean }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importSpreadsheet, {});
  const r = state.report;
  return (
    <form action={action} className="space-y-3 p-4">
      <input name="file" type="file" accept=".xlsx" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700" required />
      {hasData && (
        <label className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <input type="checkbox" name="replace" className="mt-0.5 h-4 w-4 accent-amber-600" />
          <span>Substituir tudo: <strong>apaga clientes, estoque e locações atuais</strong> e importa de novo. Usuários e dados da empresa ficam.</span>
        </label>
      )}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? "Importando… (pode levar 1 minuto)" : "Importar planilha"}</button>
      {r && (
        <div className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
          <p className="font-semibold">Importação concluída</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>{r.customers} clientes e {r.equipment} equipamentos</li>
            <li>{r.rentalLines} linhas agrupadas em {r.rentals} locações ({r.active} ativas, {r.closed} encerradas)</li>
            <li>{r.payments} pagamentos registrados</li>
            {r.fixedFinalizedWithoutReturn > 0 && <li>{r.fixedFinalizedWithoutReturn} itens “Finalizado” sem data de entrega foram marcados como devolvidos na data prevista</li>}
            {r.createdCustomers.length > 0 && <li>Clientes que só existiam nas locações: {r.createdCustomers.join(", ")}</li>}
            {r.createdEquipment.length > 0 && <li>Equipamentos que só existiam nas locações: {r.createdEquipment.join(", ")}</li>}
            {r.skippedLines > 0 && <li>{r.skippedLines} linhas ignoradas</li>}
          </ul>
        </div>
      )}
    </form>
  );
}
