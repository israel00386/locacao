import { PageHeader } from "@/components/ui";
import { RentalForm } from "@/components/rental-form";
import { rentalFormOptions } from "@/lib/form-options";
import { todayISO } from "@/lib/dates";

export const metadata = { title: "Nova locação" };

export default async function NovaLocacaoPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const { customers, equipment } = await rentalFormOptions();
  return (
    <>
      <PageHeader title="Nova locação" back="/locacoes" subtitle="Salve como orçamento para enviar ao cliente, ou confirme se o material já vai sair." />
      <RentalForm customers={customers} equipment={equipment} todayISO={todayISO()} defaultCustomerId={cliente} />
    </>
  );
}
