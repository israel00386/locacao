import { CircleDollarSign, KeyRound, Layers, PackageOpen, Sheet } from "lucide-react";
import { IconBox, PageHeader, Section } from "@/components/ui";
import { db } from "@/lib/db";
import { ImportForm } from "../forms";

export const metadata = { title: "Importar planilha" };

const rules = [
  { icon: <Layers />, text: <>Linhas com o mesmo cliente, obra e data de retirada viram <strong className="font-semibold text-slate-800">uma locação com vários equipamentos</strong>.</> },
  { icon: <PackageOpen />, text: <>Itens com data de entrega voltam para o estoque. Sem data de entrega, continuam na obra.</> },
  { icon: <CircleDollarSign />, text: <>Status “Pago” ou “Finalizado” vira locação quitada. O “Valor Pago” vira pagamento.</> },
  { icon: <KeyRound />, text: <>Chave Pix, favorecido e observações vêm da aba Orçamento.</> },
];

export default async function ImportarPage() {
  const hasData = (await db.rental.count()) + (await db.customer.count()) > 0;
  return (
    <>
      <PageHeader title="Importar planilha" back="/config" subtitle="No Google Sheets: Arquivo → Fazer download → Microsoft Excel (.xlsx)." />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-5">
        <Section title="Como funciona" icon={<Sheet />} iconTone="green" description="Abas lidas: Clientes, Estoque, Locações Ativas e Orçamento">
          <ul className="space-y-4 p-4 sm:p-5">
            {rules.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed text-slate-600">
                <IconBox tone="slate" size="sm">{r.icon}</IconBox>
                <span className="pt-1">{r.text}</span>
              </li>
            ))}
          </ul>
        </Section>
        <section className="card">
          <ImportForm hasData={hasData} />
        </section>
      </div>
    </>
  );
}
