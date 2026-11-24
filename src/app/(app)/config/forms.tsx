"use client";
import { useActionState, useState } from "react";
import { CircleAlert, CircleCheck, FileSpreadsheet, KeyRound, Landmark, Loader2, Save, Store, TriangleAlert, Upload, UserPlus } from "lucide-react";
import { addUser, changePassword, importSpreadsheet, saveCompany, type FormState, type ImportState } from "./actions";

type Company = {
  name: string; subtitle: string; location: string; instagram: string; phone: string;
  pixKey: string; pixName: string; pixBank: string; quoteNotes: string; footer: string;
};

function Note({ tone, children }: { tone: "ok" | "error"; children: React.ReactNode }) {
  const Icon = tone === "ok" ? CircleCheck : CircleAlert;
  return (
    <p
      className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm ${tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
      role={tone === "ok" ? "status" : "alert"}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      {children}
    </p>
  );
}

function Msg({ state, ok }: { state: FormState; ok: string }) {
  if (state.error) return <Note tone="error">{state.error}</Note>;
  if (state.ok) return <Note tone="ok">{ok}</Note>;
  return null;
}

function Group({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand-950 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-brand-500">
        {icon}
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export function CompanyForm({ company }: { company: Company }) {
  const [state, action, pending] = useActionState(saveCompany, {});
  const f = (name: keyof Company, label: string, span = false, placeholder?: string) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={`co-${name}`}>{label}</label>
      <input id={`co-${name}`} name={name} className="input" defaultValue={company[name]} placeholder={placeholder} />
    </div>
  );
  return (
    <form action={action} className="space-y-6 px-4 pt-2 pb-5 sm:px-5">
      <Group icon={<Store strokeWidth={1.9} />} title="Identificação">
        <div className="grid gap-3 sm:grid-cols-2">
          {f("name", "Nome da empresa")}
          {f("subtitle", "Frase abaixo do nome")}
          {f("location", "Cidade")}
          {f("instagram", "Instagram", false, "@suaempresa")}
          {f("phone", "Telefone/WhatsApp da empresa", true, "(85) 90000-0000")}
        </div>
      </Group>
      <div className="h-px bg-slate-100" />
      <Group icon={<Landmark strokeWidth={1.9} />} title="Pagamento (Pix)">
        <div className="grid gap-3 sm:grid-cols-2">
          {f("pixKey", "Chave Pix", true)}
          {f("pixName", "Favorecido")}
          {f("pixBank", "Banco")}
        </div>
      </Group>
      <div className="h-px bg-slate-100" />
      <Group icon={<FileSpreadsheet strokeWidth={1.9} />} title="Texto do orçamento">
        <div>
          <label className="label" htmlFor="co-notes">Observações do orçamento (uma por linha)</label>
          <textarea id="co-notes" name="quoteNotes" rows={4} className="input leading-relaxed" defaultValue={company.quoteNotes} />
        </div>
        {f("footer", "Rodapé", true)}
      </Group>
      <Msg state={state} ok="Dados da empresa salvos." />
      <button className="btn-primary w-full sm:w-auto sm:min-w-40" disabled={pending}>
        {pending ? <Loader2 className="h-[18px] w-[18px] animate-spin" aria-hidden /> : <Save className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />}
        {pending ? "Salvando…" : "Salvar alterações"}
      </button>
    </form>
  );
}

export function AddUserForm() {
  const [state, action, pending] = useActionState(addUser, {});
  return (
    <form action={action} key={state.ok ?? 0} className="space-y-3 p-4 sm:p-5">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-700">
        <UserPlus className="h-4 w-4 text-slate-400" strokeWidth={1.9} aria-hidden /> Novo acesso
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" className="input" placeholder="Nome" aria-label="Nome" required />
        <input name="email" type="email" className="input" placeholder="E-mail" aria-label="E-mail" required />
        <input name="password" type="password" className="input sm:col-span-2" placeholder="Senha (mín. 6 caracteres)" aria-label="Senha" required minLength={6} />
      </div>
      <Msg state={state} ok="Usuário criado." />
      <button className="btn-secondary w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" strokeWidth={1.9} aria-hidden />}
        Adicionar usuário
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} key={state.ok ?? 0} className="space-y-3 px-4 pt-2 pb-5 sm:px-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="current" type="password" className="input" placeholder="Senha atual" aria-label="Senha atual" required autoComplete="current-password" />
        <input name="next" type="password" className="input" placeholder="Nova senha" aria-label="Nova senha" required minLength={6} autoComplete="new-password" />
      </div>
      <Msg state={state} ok="Senha alterada." />
      <button className="btn-secondary w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" strokeWidth={1.9} aria-hidden />}
        Trocar minha senha
      </button>
    </form>
  );
}

export function ImportForm({ hasData }: { hasData: boolean }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importSpreadsheet, {});
  const [fileName, setFileName] = useState<string | null>(null);
  const r = state.report;
  return (
    <form action={action} className="space-y-4 p-4 sm:p-5">
      <label
        className={`group relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed px-4 py-8 text-center transition-colors focus-within:border-brand-500 focus-within:bg-brand-50/40 ${
          fileName ? "border-emerald-300 bg-emerald-50/50" : "border-slate-200 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40"
        }`}
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ring-inset ${
            fileName ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-white text-brand-600 shadow-sm ring-slate-200 group-hover:text-brand-700"
          }`}
          aria-hidden
        >
          {fileName ? <FileSpreadsheet className="h-6 w-6" strokeWidth={1.75} /> : <Upload className="h-6 w-6" strokeWidth={1.75} />}
        </span>
        <span className="text-[15px] font-semibold text-slate-800">{fileName ?? "Escolher arquivo .xlsx"}</span>
        <span className="text-[13px] text-slate-500">{fileName ? "Toque para trocar o arquivo" : "Toque aqui para selecionar a planilha baixada"}</span>
        <input
          name="file"
          type="file"
          accept=".xlsx"
          required
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => setFileName(e.currentTarget.files?.[0]?.name ?? null)}
        />
      </label>
      {hasData && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 ring-inset">
          <input type="checkbox" name="replace" className="mt-0.5 h-5 w-5 shrink-0 accent-amber-600" />
          <span>
            <span className="flex items-center gap-1.5 font-semibold">
              <TriangleAlert className="h-4 w-4" strokeWidth={2} aria-hidden /> Substituir tudo
            </span>
            <span className="mt-0.5 block text-amber-800">
              <strong>Apaga clientes, estoque e locações atuais</strong> e importa de novo. Usuários e dados da empresa ficam.
            </span>
          </span>
        </label>
      )}
      {state.error && <Note tone="error">{state.error}</Note>}
      <button className="btn-primary btn-lg w-full" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Upload className="h-5 w-5" strokeWidth={1.9} aria-hidden />}
        {pending ? "Importando… (pode levar 1 minuto)" : "Importar planilha"}
      </button>
      {r && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-emerald-200 ring-inset" role="status">
          <p className="flex items-center gap-2 font-semibold">
            <CircleCheck className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden /> Importação concluída
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-emerald-500">
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
