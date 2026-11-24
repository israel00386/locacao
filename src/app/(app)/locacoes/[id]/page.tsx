import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, PageHeader, Section } from "@/components/ui";
import { ActionButton, PaymentForm, ReturnForm, ShareQuote } from "@/components/rental-actions";
import { AddItemsButton } from "@/components/add-items-form";
import { ExpenseList } from "@/components/expense-list";
import { getExpenseRentalOptions, getRentalExpenses } from "@/lib/expenses";
import { itemSituation, paymentStatus, situation } from "@/lib/calc";
import { fmtDate, fmtDateShort, toISODate, todayISO, weekday } from "@/lib/dates";
import { addItemsOptions } from "@/lib/form-options";
import { money, periodLabel, rentalCode, unitMoney } from "@/lib/format";
import { getCompany, getRental } from "@/lib/rentals";
import { quoteMessage, quoteUrl, whatsappLink } from "@/lib/quote";
import {
  addItemsToRental,
  addPayment,
  cancelRental,
  closeRental,
  confirmRental,
  deletePayment,
  deleteRental,
  deleteReturn,
  registerReturn,
  reopenRental,
  toggleNegotiating,
} from "../actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRental(id);
  return { title: r ? rentalCode(r.number) : "Locação" };
}

export default async function LocacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRental(id);
  if (!r) notFound();
  const company = await getCompany();
  const c = r.calc;
  const sit = situation(r.stage, c);
  const fin = paymentStatus(r.stage, c);
  const url = await quoteUrl(r);
  const text = quoteMessage(r, company.name, url);
  const wa = whatsappLink(r.customer.phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`;
  const editable = r.stage === "ORCAMENTO" || r.stage === "ATIVA";
  const addOptions = r.stage === "ATIVA" ? await addItemsOptions(r.customerId) : null;
  const showExpenses = r.stage === "ATIVA" || r.stage === "ENCERRADA";
  const [expenses, expenseRentals] = showExpenses
    ? await Promise.all([getRentalExpenses(r.id), getExpenseRentalOptions([r.id])])
    : [[], []];
  const initialItems = r.items.flatMap((_, idx) => (c.items[idx].addition ? [] : [idx]));
  const additions = r.items
    .flatMap((_, idx) => (c.items[idx].addition ? [idx] : []))
    .sort((a, b) => c.items[a].startDate.getTime() - c.items[b].startDate.getTime());

  const renderItem = (idx: number) => {
    const it = r.items[idx];
    const ic = c.items[idx];
    const st = itemSituation(ic.status);
    return (
      <li key={it.id} className="px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-semibold">{it.equipment.name}</span>
              {ic.addition && <Badge tone="amber">Acréscimo</Badge>}
            </div>
            <div className="text-xs text-slate-500">
              {it.qty} un. × {unitMoney(Number(it.unitPrice))}/dia · {periodLabel(it.period)}
              {it.daysOverride ? ` · ${it.daysOverride} dias (manual)` : ""}
            </div>
            {ic.addition && (
              <div className="mt-0.5 text-xs font-medium text-slate-700 tnum">
                Retirada {fmtDateShort(ic.startDate)} → previsão {fmtDateShort(ic.expectedEndDate)}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-sm font-semibold tnum">{money(ic.total)}</div>
            {r.stage !== "ORCAMENTO" && r.stage !== "CANCELADA" && (
              <div className="mt-0.5 flex flex-col items-end gap-0.5 text-xs tnum">
                <Badge tone={st.tone}>
                  {st.label}
                  {ic.overdue ? ` ${ic.overdueDays}d` : ""}
                </Badge>
                {ic.outstandingQty > 0 && ic.returnedQty > 0 && <span className="text-slate-500">{ic.outstandingQty} na obra</span>}
              </div>
            )}
          </div>
        </div>
        {it.returns.length > 0 && (
          <ul className="mt-2 space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {it.returns.map((ret, ri) => (
              <li key={ret.id} className="flex items-center justify-between gap-2">
                <span>
                  {ret.qty} devolvidos em {fmtDate(ret.date)} · {ic.returnDays[ri]} dias cobrados
                  {ret.note ? ` · ${ret.note}` : ""}
                </span>
                {r.stage === "ATIVA" && (
                  <ActionButton
                    className="text-red-600 hover:underline"
                    confirm="Desfazer esta devolução? O material volta a contar como na obra."
                    action={deleteReturn.bind(null, r.id, ret.id)}
                  >
                    desfazer
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <>
      <PageHeader
        back="/locacoes"
        title={r.customer.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-xs">{rentalCode(r.number)}</span>
            <Badge tone={sit.tone}>{sit.label}</Badge>
            {r.stage !== "ORCAMENTO" && r.stage !== "CANCELADA" && <Badge tone={fin.tone}>{fin.label}</Badge>}
            {r.negotiating && <Badge tone="amber">Em negociação</Badge>}
          </span>
        }
        actions={editable ? <Link href={`/locacoes/${r.id}/editar`} className="btn-secondary">Editar</Link> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <ShareQuote url={url} whatsappUrl={wa} />
        {r.stage === "ORCAMENTO" && (
          <ActionButton className="btn-primary" action={confirmRental.bind(null, r.id)}>
            Confirmar locação (material saiu)
          </ActionButton>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <div className="card grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-4">
            <Info label="Obra" className="col-span-2">{r.siteAddress || "—"}</Info>
            <Info label={c.hasAdditions ? "Retirada (itens iniciais)" : "Retirada"}>
              {fmtDate(r.startDate)}
              <span className="block text-xs text-slate-500">{weekday(r.startDate)}</span>
            </Info>
            <Info label={c.hasAdditions ? "Previsão (itens iniciais)" : "Previsão de devolução"}>
              {fmtDate(r.expectedEndDate)}
              {r.expectedEndDate && <span className="block text-xs text-slate-500">{weekday(r.expectedEndDate)}</span>}
            </Info>
            {c.overdue && (
              <div className="col-span-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 sm:col-span-4">
                Material na obra há {c.overdueDays} {c.overdueDays === 1 ? "dia" : "dias"} além da previsão. Os dias excedentes já estão sendo somados.
                {c.hasAdditions && (
                  <span className="mt-0.5 block text-xs">
                    Atrasado: {r.items.filter((_, i) => c.items[i].overdue).map((it) => it.equipment.name).join(", ")}
                  </span>
                )}
              </div>
            )}
            {r.customer.phone && (
              <Info label="Telefone">
                <a className="text-brand-700 underline" href={`tel:${r.customer.phone.replace(/\D/g, "")}`}>{r.customer.phone}</a>
              </Info>
            )}
            {r.customer.responsible && <Info label="Responsável">{r.customer.responsible}</Info>}
            {r.notes && <Info label="Observações" className="col-span-2 sm:col-span-4">{r.notes}</Info>}
          </div>

          <Section
            title="Equipamentos"
            actions={c.hasAdditions ? <span className="text-xs text-slate-500">{additions.length} {additions.length === 1 ? "acréscimo" : "acréscimos"}</span> : undefined}
          >
            {c.hasAdditions ? (
              <>
                <GroupTitle>Itens iniciais · {fmtDateShort(r.startDate)} → {fmtDateShort(r.expectedEndDate)}</GroupTitle>
                <ul className="divide-y divide-slate-100">{initialItems.map((idx) => renderItem(idx))}</ul>
                <GroupTitle>Acréscimos</GroupTitle>
                <ul className="divide-y divide-slate-100">{additions.map((idx) => renderItem(idx))}</ul>
              </>
            ) : (
              <ul className="divide-y divide-slate-100">{r.items.map((_, idx) => renderItem(idx))}</ul>
            )}
            {r.stage === "ATIVA" && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
                <AddItemsButton
                  action={addItemsToRental.bind(null, r.id)}
                  equipment={addOptions!.equipment}
                  customerPrices={addOptions!.customerPrices}
                  todayISO={todayISO()}
                  rentalStartISO={toISODate(r.startDate)}
                  rentalEndISO={toISODate(r.expectedEndDate)}
                />
              </div>
            )}
          </Section>

          {r.stage === "ATIVA" && (
            <Section title="Devolução (total ou parcial)">
              <ReturnForm
                action={registerReturn.bind(null, r.id)}
                todayISO={todayISO()}
                startISO={toISODate(r.startDate)}
                items={[...initialItems, ...additions].map((idx) => ({
                  id: r.items[idx].id,
                  name: r.items[idx].equipment.name,
                  outstanding: c.items[idx].outstandingQty,
                  suggestedDays: c.items[idx].outstandingDays,
                  startISO: toISODate(c.items[idx].startDate),
                  addition: c.items[idx].addition,
                }))}
              />
            </Section>
          )}
        </div>

        <div className="space-y-4">
          <Section title="Valores">
            <dl className="space-y-1.5 px-4 py-3 text-sm">
              <Row label="Equipamentos">{money(c.itemsTotal)}</Row>
              {r.extras.map((e) => (
                <Row key={e.id} label={e.description}>{money(Number(e.amount))}</Row>
              ))}
              {c.discount > 0 && <Row label="Desconto">− {money(c.discount)}</Row>}
              <div className="my-2 border-t border-slate-100" />
              <Row label={<strong>Total</strong>}><strong>{money(c.total)}</strong></Row>
              <Row label="Pago">{money(c.paid)}</Row>
              <Row label={<strong>Em aberto</strong>}>
                <strong className={c.open > 0 ? "text-red-700" : "text-brand-700"}>{money(Math.max(0, c.open))}</strong>
              </Row>
              {c.open < 0 && <p className="text-xs text-amber-700">Recebido {money(-c.open)} a mais que o total.</p>}
              {r.stage === "ATIVA" && c.outstandingQty > 0 && (
                <p className="pt-1 text-xs text-slate-500">O total muda conforme os dias passam e as devoluções são registradas.</p>
              )}
            </dl>
          </Section>

          {r.stage !== "ORCAMENTO" && r.stage !== "CANCELADA" && (
            <Section title="Pagamentos">
              {r.payments.length > 0 && (
                <ul className="divide-y divide-slate-100 border-b border-slate-100 text-sm">
                  {r.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 px-4 py-2">
                      <span>
                        <span className="font-medium tnum">{money(Number(p.amount))}</span>
                        <span className="block text-xs text-slate-500">
                          {fmtDate(p.date)}
                          {p.method ? ` · ${p.method}` : ""}
                          {p.note ? ` · ${p.note}` : ""}
                        </span>
                      </span>
                      <ActionButton className="text-xs text-red-600 hover:underline" confirm="Apagar este pagamento?" action={deletePayment.bind(null, r.id, p.id)}>
                        apagar
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
              <PaymentForm action={addPayment.bind(null, r.id)} open={Math.max(0, c.open)} todayISO={todayISO()} />
            </Section>
          )}

          {showExpenses && (
            <Section title="Despesas (frete etc.)">
              <ExpenseList
                expenses={expenses}
                extras={r.extras.map((x) => ({ amount: Number(x.amount) }))}
                rentalId={r.id}
                rentals={expenseRentals}
                todayISO={todayISO()}
              />
            </Section>
          )}

          <div className="card flex flex-wrap gap-2 p-4">
            {r.stage === "ATIVA" && (
              <ActionButton
                className="btn-primary w-full"
                action={closeRental.bind(null, r.id)}
                confirm={c.open > 0 ? `Ainda há ${money(c.open)} em aberto. Encerrar mesmo assim? O valor continua no financeiro.` : undefined}
              >
                Encerrar locação
              </ActionButton>
            )}
            {(r.stage === "ATIVA" || r.stage === "ORCAMENTO") && (
              <ActionButton className="btn-ghost btn-sm" action={toggleNegotiating.bind(null, r.id)}>
                {r.negotiating ? "Tirar de negociação" : "Marcar em negociação"}
              </ActionButton>
            )}
            {(r.stage === "ENCERRADA" || r.stage === "CANCELADA") && (
              <ActionButton className="btn-secondary w-full" action={reopenRental.bind(null, r.id)}>
                Reabrir locação
              </ActionButton>
            )}
            {(r.stage === "ORCAMENTO" || r.stage === "ATIVA") && (
              <ActionButton className="btn-ghost btn-sm text-red-700" confirm="Cancelar esta locação?" action={cancelRental.bind(null, r.id)}>
                Cancelar
              </ActionButton>
            )}
            {(r.stage === "ORCAMENTO" || r.stage === "CANCELADA") && (
              <ActionButton className="btn-ghost btn-sm text-red-700" confirm="Excluir definitivamente?" action={deleteRental.bind(null, r.id)}>
                Excluir
              </ActionButton>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <div className="border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 tnum">{children}</div>;
}

function Info({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-600">{label}</dt>
      <dd className="tnum">{children}</dd>
    </div>
  );
}
