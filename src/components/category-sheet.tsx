"use client";
import { useId, useState, useTransition, type ReactNode } from "react";
import { Check, ChevronRight, EyeOff, LoaderCircle, Plus, Shapes, Trash2, Truck } from "lucide-react";
import { createCategory, deleteCategory, setCategoryActive, updateCategory } from "@/app/(app)/financeiro/actions";
import { CATEGORY_COLORS, CATEGORY_ICON_KEYS, COLOR_STYLES, colorStyle, type ExpenseCategoryData } from "@/lib/expense-categories";
import { CategoryTile, iconFor } from "./finance-ui";
import { FormAlert, Sheet, Toggle } from "./sheet";

export interface CategoryDraft {
  name: string;
  color: string;
  icon: string;
  isFreight: boolean;
}

export const EMPTY_DRAFT: CategoryDraft = { name: "", color: "violet", icon: "tag", isFreight: false };

export function draftToForm(d: CategoryDraft) {
  const f = new FormData();
  f.set("name", d.name);
  f.set("color", d.color);
  f.set("icon", d.icon);
  if (d.isFreight) f.set("isFreight", "on");
  return f;
}

/** Campos da categoria (controlados): nome, cor, ícone e "conta como frete". */
export function CategoryFields({ value, onChange, compact = false }: { value: CategoryDraft; onChange: (d: CategoryDraft) => void; compact?: boolean }) {
  const uid = useId();
  const set = (p: Partial<CategoryDraft>) => onChange({ ...value, ...p });
  const PreviewIcon = iconFor(value.icon);
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${colorStyle(value.color).tile}`} aria-hidden>
          <PreviewIcon className="size-[22px]" strokeWidth={1.9} />
        </span>
        <div className="min-w-0 flex-1">
          <label className="label" htmlFor={`${uid}-name`}>Nome da categoria</label>
          <input
            id={`${uid}-name`}
            className="input"
            maxLength={40}
            placeholder="Ex.: Aluguel do galpão, Salários…"
            value={value.name}
            onChange={(e) => set({ name: e.target.value })}
            autoFocus={!compact}
          />
        </div>
      </div>

      <fieldset>
        <legend className="label">Cor</legend>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_COLORS.map((c) => {
            const on = value.color === c;
            return (
              <label
                key={c}
                title={COLOR_STYLES[c].label}
                className={`relative flex size-11 cursor-pointer items-center justify-center rounded-full transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-accent-400/60 ${
                  on ? "ring-2 ring-brand-900 ring-offset-2" : "hover:scale-105"
                }`}
              >
                <input type="radio" name={`${uid}-color`} value={c} checked={on} onChange={() => set({ color: c })} className="sr-only" aria-label={COLOR_STYLES[c].label} />
                <span className="size-8 rounded-full" style={{ background: COLOR_STYLES[c].hex }} aria-hidden />
                {on && <Check className="absolute size-4 text-white" strokeWidth={3} aria-hidden />}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="label">Ícone</legend>
        <div className="grid grid-cols-6 gap-1.5 min-[400px]:grid-cols-8">
          {CATEGORY_ICON_KEYS.map((k) => {
            const Icon = iconFor(k);
            const on = value.icon === k;
            return (
              <label
                key={k}
                className={`flex aspect-square min-h-11 cursor-pointer items-center justify-center rounded-[14px] transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600 ${
                  on ? `${colorStyle(value.color).tile} ring-2 ring-current` : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`}
              >
                <input type="radio" name={`${uid}-icon`} value={k} checked={on} onChange={() => set({ icon: k })} className="sr-only" aria-label={k} />
                <Icon className="size-5" strokeWidth={1.9} aria-hidden />
              </label>
            );
          })}
        </div>
      </fieldset>

      <Toggle
        checked={value.isFreight}
        onChange={(v) => set({ isFreight: v })}
        label={
          <span className="inline-flex items-center gap-1.5">
            <Truck className="size-4 text-sky-600" aria-hidden /> Conta como frete
          </span>
        }
        hint="Entra no “lucro do frete” (taxa cobrada do cliente − gasto)."
      />
    </div>
  );
}

function SaveButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button className="btn-primary w-full rounded-full sm:w-auto sm:flex-1" disabled={pending}>
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={2.4} aria-hidden />}
      {pending ? "Salvando…" : children}
    </button>
  );
}

/** Formulário completo (criar/editar). Na edição também ativa/desativa e exclui. */
function CategoryForm({ category, usage, onDone }: { category?: ExpenseCategoryData; usage?: number; onDone: (c?: ExpenseCategoryData) => void }) {
  const [draft, setDraft] = useState<CategoryDraft>(category ? { name: category.name, color: category.color, icon: category.icon, isFreight: category.isFreight } : EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = category ? await updateCategory(category.id, draftToForm(draft)) : await createCategory(draftToForm(draft));
      if (r.error) setError(r.error);
      else onDone(r.category);
    });
  };
  const toggle = () => {
    if (!category) return;
    setError(null);
    start(async () => {
      const r = await setCategoryActive(category.id, !category.active);
      if (r.error) setError(r.error);
      else onDone(r.category);
    });
  };
  const remove = () => {
    if (!category || !window.confirm(`Excluir a categoria “${category.name}”?`)) return;
    setError(null);
    start(async () => {
      const r = await deleteCategory(category.id);
      if (r.error) setError(r.error);
      else onDone();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5 px-5 pt-1 pb-5 sm:px-6">
      <CategoryFields value={draft} onChange={setDraft} />
      {category && (
        <div className="rounded-[16px] bg-slate-50 px-4 py-3 text-xs text-slate-500">
          {usage ? (
            <>
              <span className="font-semibold text-slate-700 tnum">{usage}</span> despesa{usage === 1 ? "" : "s"} nesta categoria. Para tirá-la do formulário,
              desative — as despesas antigas continuam com ela.
            </>
          ) : (
            "Nenhuma despesa usa esta categoria: dá para excluir."
          )}
        </div>
      )}
      <FormAlert>{error}</FormAlert>
      <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row-reverse sm:flex-wrap">
        <SaveButton pending={pending}>{category ? "Salvar categoria" : "Criar categoria"}</SaveButton>
        {category && (
          <button type="button" className="btn-secondary w-full rounded-full sm:w-auto" onClick={toggle} disabled={pending}>
            {category.active ? <EyeOff className="size-4" aria-hidden /> : <Check className="size-4" aria-hidden />}
            {category.active ? "Desativar" : "Reativar"}
          </button>
        )}
        {category && !usage && (
          <button type="button" className="btn-danger w-full rounded-full sm:w-auto" onClick={remove} disabled={pending}>
            <Trash2 className="size-4" aria-hidden /> Excluir
          </button>
        )}
      </div>
    </form>
  );
}

/** Botão "+ Nova categoria". */
export function NewCategoryButton({ className = "btn-primary", children }: { className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children ?? (
          <>
            <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Nova categoria
          </>
        )}
      </button>
      {open && (
        <Sheet title="Nova categoria" subtitle="Para organizar as despesas" icon={Shapes} iconClass="bg-violet-50 text-violet-600" onClose={() => setOpen(false)}>
          <CategoryForm onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  );
}

/** Linha da lista de categorias: toque abre a edição. */
export function CategoryRowButton({ category, usage, children }: { category: ExpenseCategoryData; usage: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="tap flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80 active:bg-slate-100/80 sm:px-6"
        aria-label={`Editar categoria ${category.name}`}
      >
        <CategoryTile category={category} size="lg" className={category.active ? "" : "opacity-50 grayscale"} />
        {children}
        <ChevronRight className="tap-chevron -mr-1 size-[18px] shrink-0 text-slate-300" strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <Sheet title="Editar categoria" subtitle={category.name} icon={iconFor(category.icon)} iconClass={colorStyle(category.color).tile} onClose={() => setOpen(false)}>
          <CategoryForm category={category} usage={usage} onDone={() => setOpen(false)} />
        </Sheet>
      )}
    </>
  );
}

/** Criação rápida dentro do formulário de despesa (sem <form> aninhado). */
export function InlineCategoryCreator({ onCreated, onCancel }: { onCreated: (c: ExpenseCategoryData) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState<CategoryDraft>(EMPTY_DRAFT);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const create = () => {
    setError(null);
    start(async () => {
      const r = await createCategory(draftToForm(draft));
      if (r.error || !r.category) setError(r.error ?? "Não foi possível criar.");
      else onCreated(r.category);
    });
  };
  return (
    <div className="mt-3 space-y-4 rounded-[20px] bg-violet-50/50 p-4 ring-1 ring-violet-200/70 ring-inset">
      <div className="text-sm font-semibold text-violet-900">Nova categoria</div>
      <CategoryFields value={draft} onChange={setDraft} compact />
      <FormAlert>{error}</FormAlert>
      <div className="flex gap-2">
        <button type="button" className="btn-secondary flex-1 rounded-full" onClick={onCancel} disabled={pending}>
          Cancelar
        </button>
        <button type="button" className="btn-primary flex-1 rounded-full" onClick={create} disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={2.4} aria-hidden />}
          {pending ? "Criando…" : "Criar e usar"}
        </button>
      </div>
    </div>
  );
}
