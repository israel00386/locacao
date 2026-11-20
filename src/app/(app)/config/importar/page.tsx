import { PageHeader } from "@/components/ui";
import { db } from "@/lib/db";
import { ImportForm } from "../forms";

export const metadata = { title: "Importar planilha" };

export default async function ImportarPage() {
  const hasData = (await db.rental.count()) + (await db.customer.count()) > 0;
  return (
    <>
      <PageHeader title="Importar planilha" back="/config" />
      <div className="card mb-4 space-y-2 p-4 text-sm text-slate-600">
        <p>O sistema lê as abas <strong>Clientes</strong>, <strong>Estoque</strong>, <strong>Locações Ativas</strong> e <strong>Orçamento</strong>.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Linhas com o mesmo cliente, obra e data de retirada viram <strong>uma locação com vários equipamentos</strong>.</li>
          <li>Itens com data de entrega voltam para o estoque. Sem data de entrega, continuam na obra.</li>
          <li>Status “Pago” ou “Finalizado” vira locação quitada. O “Valor Pago” vira pagamento.</li>
          <li>Chave Pix, favorecido e observações vêm da aba Orçamento.</li>
        </ul>
      </div>
      <div className="card">
        <ImportForm hasData={hasData} />
      </div>
    </>
  );
}
