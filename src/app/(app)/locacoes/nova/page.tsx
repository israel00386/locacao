import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NavyHero } from "@/components/rental-ui";
import { RentalForm } from "@/components/rental-form";
import { rentalFormOptions } from "@/lib/form-options";
import { todayISO } from "@/lib/dates";

export const metadata = { title: "Nova locação" };

export default async function NovaLocacaoPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { cliente } = await searchParams;
  const { customers, equipment } = await rentalFormOptions();
  return (
    <>
      <NavyHero className="pb-16 lg:pb-16">
        <Link
          href="/locacoes"
          className="-ml-2 inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ChevronLeft size={18} aria-hidden /> Locações
        </Link>
        <h1 className="mt-2 text-[26px] leading-tight font-bold tracking-[-0.02em] sm:text-[28px]">Nova locação</h1>
        <p className="mt-1 max-w-xl text-sm text-white/65">Salve como orçamento para enviar ao cliente, ou confirme se o material já vai sair.</p>
      </NavyHero>
      <div className="relative z-10 -mt-10">
        <RentalForm customers={customers} equipment={equipment} todayISO={todayISO()} defaultCustomerId={cliente} />
      </div>
    </>
  );
}
