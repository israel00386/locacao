import { ChevronLeft } from "lucide-react";
import { RoundLink } from "@/components/rental-ui";
import { RentalForm } from "@/components/rental-form";
import { rentalFormOptions } from "@/lib/form-options";
import { todayISO } from "@/lib/dates";

export const metadata = { title: "Nova locação" };

export default async function NovaLocacaoPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const { customers, equipment } = await rentalFormOptions();
  return (
    <>
      <header className="mb-5 flex items-center gap-3 lg:mb-7">
        <RoundLink href="/locacoes" label="Voltar para Locações">
          <ChevronLeft aria-hidden />
        </RoundLink>
        <div className="min-w-0">
          <h1 className="text-[26px] leading-[1.1] font-bold tracking-[-0.025em] text-brand-950 sm:text-[30px]">Nova locação</h1>
          <p className="mt-1 text-[13px] text-slate-500">Salve como orçamento ou confirme se o material já vai sair.</p>
        </div>
      </header>
      <div>
        <RentalForm customers={customers} equipment={equipment} todayISO={todayISO()} defaultCustomerId={cliente} />
      </div>
    </>
  );
}
