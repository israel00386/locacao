import { TopBar } from "@/components/ui";
import { RentalForm } from "@/components/rental-form";
import { rentalFormOptions } from "@/lib/form-options";
import { todayISO } from "@/lib/dates";

export const metadata = { title: "Nova locação" };

export default async function NovaLocacaoPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const { customers, equipment } = await rentalFormOptions();
  return (
    <>
      <TopBar
        back="/locacoes"
        title="Nova locação"
        subtitle="Salve como orçamento ou confirme se o material já vai sair."
      />
      <div>
        <RentalForm customers={customers} equipment={equipment} todayISO={todayISO()} defaultCustomerId={cliente} />
      </div>
    </>
  );
}
