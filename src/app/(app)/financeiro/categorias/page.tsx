import { EyeOff, Plus, Shapes, Truck } from "lucide-react";
import { CategoryRowButton, NewCategoryButton } from "@/components/category-sheet";
import { EmptyState } from "@/components/screen-kit";
import { Chip, Section, TopBar } from "@/components/ui";
import { getCategories, getCategoryUsage, type ExpenseCategoryData } from "@/lib/expenses";
import { money } from "@/lib/format";

export const metadata = { title: "Categorias de despesa" };

export default async function CategoriasPage() {
  const [categories, usage] = await Promise.all([getCategories(), getCategoryUsage()]);
  const active = categories.filter((c) => c.active);
  const inactive = categories.filter((c) => !c.active);

  const row = (c: ExpenseCategoryData) => {
    const u = usage.get(c.id);
    return (
      <li key={c.id}>
        <CategoryRowButton category={c} usage={u?.count ?? 0}>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-[15px] leading-snug font-semibold ${c.active ? "text-slate-900" : "text-slate-500"}`}>{c.name}</span>
            <span className="mt-0.5 block truncate text-[13px] text-slate-500 tnum">
              {u ? `${u.count} despesa${u.count === 1 ? "" : "s"} · ${money(u.total)}` : "Nenhuma despesa ainda"}
            </span>
          </span>
          <span className="flex shrink-0 flex-wrap justify-end gap-1">
            {c.isFreight && (
              <Chip tone="neutral" icon={<Truck />} className="!bg-sky-50 !text-sky-700">
                Frete
              </Chip>
            )}
            {!c.active && <Chip tone="neutral">Desativada</Chip>}
          </span>
        </CategoryRowButton>
      </li>
    );
  };

  return (
    <>
      <TopBar
        back="/financeiro?aba=despesas"
        eyebrow="Financeiro"
        title="Categorias"
        subtitle="Organize as despesas do jeito da empresa"
        actions={
          <NewCategoryButton className="btn-primary rounded-full">
            <Plus className="size-4" strokeWidth={2.4} aria-hidden /> Nova categoria
          </NewCategoryButton>
        }
      />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-5">
        <div className="space-y-4 lg:col-span-7 lg:space-y-5">
          <Section title="Em uso" icon={<Shapes />} iconTone="violet" description={`${active.length} categoria${active.length === 1 ? "" : "s"} no formulário de despesa`}>
            {active.length ? (
              <ul className="divide-y divide-slate-100/80 pb-2">{active.map(row)}</ul>
            ) : (
              <EmptyState icon={Shapes} title="Nenhuma categoria ativa" />
            )}
          </Section>
          {inactive.length > 0 && (
            <Section title="Desativadas" icon={<EyeOff />} iconTone="slate" description="Não aparecem no formulário; despesas antigas continuam com elas">
              <ul className="divide-y divide-slate-100/80 pb-2">{inactive.map(row)}</ul>
            </Section>
          )}
        </div>

        <aside className="card-soft p-5 text-sm leading-relaxed text-slate-600 sm:p-6 lg:col-span-5">
          <h2 className="mb-2 text-[17px] font-semibold text-brand-950">Como funciona</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Toque numa categoria para mudar nome, cor ou ícone.</li>
            <li>
              <strong>Conta como frete</strong>: as despesas dela entram no “lucro do frete” (taxa de entrega cobrada do cliente − gasto com frete).
            </li>
            <li>
              Só dá para <strong>excluir</strong> categoria sem despesas. Se já tem, <strong>desative</strong>: ela some do formulário e o histórico fica como
              está.
            </li>
            <li>Também dá para criar uma categoria na hora, direto no formulário de despesa.</li>
          </ul>
        </aside>
      </div>
    </>
  );
}
