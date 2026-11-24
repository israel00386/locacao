import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Ban,
  Banknote,
  CalendarClock,
  ChevronLeft,
  CornerDownRight,
  ExternalLink,
  Handshake,
  Lock,
  MapPin,
  Package,
  PackagePlus,
  Pencil,
  Phone,
  Receipt,
  RotateCcw,
  StickyNote,
  Trash2,
  TriangleAlert,
  Truck,
  Undo2,
  UserRound,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui";
import { CountUp } from "@/components/count-up";
import { ActionButton, MobileActionBar, PaymentForm, ReturnForm, ShareQuote } from "@/components/rental-actions";
import { Avatar, deadlineInfo, HeroStat, IconTile, NavyHero, Panel, ProgressBar, TEXT_TONES } from "@/components/rental-ui";
import { AddItemsButton } from "@/components/add-items-form";
import { ExpenseList } from "@/components/expense-list";
import { getExpenseRentalOptions, getRentalExpenses } from "@/lib/expenses";
import { itemSituation, paymentStatus, situation } from "@/lib/calc";
import { fmtDate, fmtDateShort, inclusiveDays, toISODate, today, todayISO, weekday } from "@/lib/dates";
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

const navyBtn = "btn bg-white/10 text-white ring-1 ring-white/20 ring-inset hover:bg-white/15 active:bg-white/20";

export default async function LocacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await getRental(id);
  if (!r) notFound();
  const company = await getCompany();
  const c = r.calc;
  const now = today();
  const sit = situation(r.stage, c);
  const fin = paymentStatus(r.stage, c);
  const dl = deadlineInfo(r, c, now);
  const url = await quoteUrl(r);
  const text = quoteMessage(r, company.name, url);
  const wa = whatsappLink(r.customer.phone, text) ?? `https://wa.me/?text=${encodeURIComponent(text)}`;
  const editable = r.stage === "ORCAMENTO" || r.stage === "ATIVA";
  const isQuote = r.stage === "ORCAMENTO";
  const isLive = r.stage !== "ORCAMENTO" && r.stage !== "CANCELADA";
  const addOptions = r.stage === "ATIVA" ? await addItemsOptions(r.customerId) : null;
  const showExpenses = r.stage === "ATIVA" || r.stage === "ENCERRADA";
  const [expenses, expenseRentals] = showExpenses
    ? await Promise.all([getRentalExpenses(r.id), getExpenseRentalOptions([r.id])])
    : [[], []];
  const initialItems = r.items.flatMap((_, idx) => (c.items[idx].addition ? [] : [idx]));
  const additions = r.items
    .flatMap((_, idx) => (c.items[idx].addition ? [idx] : []))
    .sort((a, b) => c.items[a].startDate.getTime() - c.items[b].startDate.getTime());
  const units = r.items.reduce((s, i) => s + i.qty, 0);
  const lastReturn = r.items
    .flatMap((i) => i.returns.map((x) => x.date))
    .reduce<Date | null>((m, d) => (!m || d > m ? d : m), null);
  const paidPct = c.total > 0 ? Math.min(1, c.paid / c.total) : 0;
  const hasOutstanding = c.outstandingQty > 0;

  // Linha do tempo (só exibição)
  const plannedPct =
    r.stage === "ENCERRADA" || c.allReturned
      ? 1
      : r.stage === "ATIVA" && r.expectedEndDate
        ? Math.min(1, inclusiveDays(r.startDate, now) / inclusiveDays(r.startDate, r.expectedEndDate))
        : 0;

  const renderItem = (idx: number) => {
    const it = r.items[idx];
    const ic = c.items[idx];
    const st = itemSituation(ic.status);
    const retPct = it.qty > 0 ? ic.returnedQty / it.qty : 0;
    return (
      <li key={it.id} className="px-5 py-4">
        <div className="flex items-start gap-3">
          <IconTile icon={ic.addition ? PackagePlus : Package} tone={ic.addition ? "amber" : "slate"} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm leading-snug font-semibold text-slate-900">{it.equipment.name}</div>
                <div className="tnum mt-0.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{it.qty} un.</span> × {unitMoney(Number(it.unitPrice))}/dia · {periodLabel(it.period)}
                  {it.daysOverride ? ` · ${it.daysOverride} dias (manual)` : ""}
                </div>
                {ic.addition && (
                  <div className="tnum mt-1 inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-1.5 py-0.5 text-[11px] font-medium text-amber-900">
                    <CalendarClock size={12} aria-hidden /> {fmtDateShort(ic.startDate)} → {fmtDateShort(ic.expectedEndDate)}
                  </div>
                )}
              </div>
              <div className="tnum shrink-0 text-right text-sm font-bold text-slate-900">{money(ic.total)}</div>
            </div>
            {isLive && (
              <div className="mt-2.5 flex items-center gap-2.5">
                <Badge tone={st.tone}>
                  {st.label}
                  {ic.overdue ? ` ${ic.overdueDays}d` : ""}
                </Badge>
                {ic.returnedQty > 0 && ic.outstandingQty > 0 ? (
                  <>
                    <ProgressBar value={retPct} tone="yellow" className="flex-1" label="Devolvido" />
                    <span className="tnum shrink-0 text-[11px] text-slate-500">
                      {ic.returnedQty}/{it.qty} voltaram
                    </span>
                  </>
                ) : (
                  ic.outstandingQty > 0 && <span className="tnum text-[11px] text-slate-500">{ic.outstandingQty} na obra</span>
                )}
              </div>
            )}
            {it.returns.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {it.returns.map((ret, ri) => (
                  <li key={ret.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 py-1.5 pr-1.5 pl-2.5 text-xs text-slate-600 ring-1 ring-slate-100 ring-inset">
                    <span className="flex min-w-0 items-start gap-1.5">
                      <CornerDownRight size={13} className="mt-px shrink-0 text-slate-400" aria-hidden />
                      <span className="tnum">
                        <strong className="font-semibold text-slate-800">{ret.qty}</strong> devolvidos em {fmtDate(ret.date)} · {ic.returnDays[ri]} dias
                        {ret.note ? <span className="text-slate-500"> · {ret.note}</span> : ""}
                      </span>
                    </span>
                    {r.stage === "ATIVA" && (
                      <ActionButton
                        className="inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-red-700 hover:bg-red-50"
                        confirm="Desfazer esta devolução? O material volta a contar como na obra."
                        action={deleteReturn.bind(null, r.id, ret.id)}
                      >
                        <RotateCcw size={12} aria-hidden /> desfazer
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </li>
    );
  };

  const confirmBtn = (cls: string, label = "Confirmar locação") => (
    <ActionButton className={cls} action={confirmRental.bind(null, r.id)}>
      <Truck size={17} aria-hidden /> {label}
    </ActionButton>
  );

  return (
    <>
      <NavyHero className="pb-16 lg:pb-16">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/locacoes"
            className="-ml-2 inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft size={18} aria-hidden /> Locações
          </Link>
          {editable && (
            <Link href={`/locacoes/${r.id}/editar`} className={`${navyBtn} btn-sm min-h-10`}>
              <Pencil size={14} aria-hidden /> Editar
            </Link>
          )}
        </div>

        <div className="mt-3 flex items-start gap-3.5 sm:gap-4">
          <Avatar name={r.customer.name} size="xl" className="ring-white/20 shadow-lg shadow-black/20" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="tnum rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wide text-accent-200 ring-1 ring-white/15 ring-inset">
                {rentalCode(r.number)}
              </span>
              <Badge tone={sit.tone}>
                {sit.label}
                {c.overdue ? ` ${c.overdueDays}d` : ""}
              </Badge>
              {isLive && <Badge tone={fin.tone}>{fin.label}</Badge>}
              {r.negotiating && <Badge tone="amber">Em negociação</Badge>}
            </div>
            <h1 className="mt-1.5 text-[24px] leading-tight font-bold tracking-[-0.02em] break-words sm:text-[28px]">{r.customer.name}</h1>
            <div className="mt-1.5 flex flex-col gap-1 text-[13px] text-white/70 sm:flex-row sm:flex-wrap sm:gap-x-4">
              <span className="flex min-w-0 items-start gap-1.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-accent-300/80" aria-hidden />
                <span className="break-words">{r.siteAddress || "Sem endereço da obra"}</span>
              </span>
              {r.customer.phone && (
                <a href={`tel:${r.customer.phone.replace(/\D/g, "")}`} className="flex items-center gap-1.5 hover:text-white">
                  <Phone size={14} className="shrink-0 text-accent-300/80" aria-hidden />
                  <span className="tnum underline decoration-white/30 underline-offset-2">{r.customer.phone}</span>
                </a>
              )}
              {r.customer.responsible && (
                <span className="flex items-center gap-1.5">
                  <UserRound size={14} className="shrink-0 text-accent-300/80" aria-hidden /> {r.customer.responsible}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          {isQuote ? (
            <>
              <HeroStat label="Total" tone="accent" className="col-span-2 sm:col-span-1">
                <CountUp value={c.total} format="money" />
              </HeroStat>
              <HeroStat label="Unidades">{units}</HeroStat>
              <HeroStat label="Dias">{c.days || "—"}</HeroStat>
            </>
          ) : (
            <>
              <HeroStat label="Total" tone="accent" className="col-span-2 sm:col-span-1">
                <CountUp value={c.total} format="money" />
              </HeroStat>
              <HeroStat label="Pago" tone="green">
                <CountUp value={c.paid} format="money" />
              </HeroStat>
              <HeroStat label="Em aberto" tone={c.open > 0.009 ? "red" : "green"}>
                <CountUp value={Math.max(0, c.open)} format="money" />
              </HeroStat>
            </>
          )}
        </div>

        {/* Ações no computador */}
        <div className="mt-4 hidden flex-wrap gap-2 lg:flex">
          {isQuote && confirmBtn("btn-accent", "Confirmar locação (material saiu)")}
          <ShareQuote url={url} whatsappUrl={wa} tone="navy" mainClass={isQuote ? navyBtn : undefined} />
        </div>
      </NavyHero>

      {/* Linha do tempo, sobrepondo a faixa */}
      <div className="relative z-10 -mt-10 card rounded-[20px] px-5 pt-4 pb-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <CalendarClock size={16} className="text-brand-500" aria-hidden /> Prazo
            {c.days > 0 && <span className="tnum font-medium text-slate-500">· {c.days} {c.days === 1 ? "dia" : "dias"}</span>}
          </div>
          <span className={`text-[13px] font-semibold ${TEXT_TONES[dl.tone]}`}>{dl.label}</span>
        </div>
        <ol className="grid grid-cols-3 text-center">
          <TimelineStep
            label={c.hasAdditions ? "Retirada inicial" : "Retirada"}
            date={r.startDate}
            state={isQuote ? "todo" : "done"}
            line={plannedPct}
            lineTone={c.overdue ? "red" : "brand"}
          />
          <TimelineStep
            label={c.hasAdditions ? "Previsão inicial" : "Previsão"}
            date={r.expectedEndDate}
            state={c.overdue ? "late" : plannedPct >= 1 ? "done" : isQuote ? "todo" : "current"}
            line={r.stage === "ENCERRADA" || c.allReturned || c.overdue ? 1 : 0}
            lineTone={c.overdue ? "red" : "brand"}
          />
          {r.stage === "ENCERRADA" || c.allReturned ? (
            <TimelineStep label="Devolvido" date={lastReturn} state="done" />
          ) : c.overdue ? (
            <TimelineStep label="Hoje" date={now} state="late" note={`+${c.overdueDays} ${c.overdueDays === 1 ? "dia" : "dias"}`} />
          ) : (
            <TimelineStep label="Devolução" date={null} state="todo" note={isQuote ? "após confirmar" : lastReturn ? "parcial" : "aguardando"} />
          )}
        </ol>
      </div>

      {c.overdue && (
        <div className="mt-4 flex gap-3 rounded-[20px] bg-red-50 px-4 py-3.5 text-sm text-red-900 ring-1 ring-red-200 ring-inset">
          <TriangleAlert size={20} className="mt-0.5 shrink-0 text-red-600" aria-hidden />
          <div>
            <p className="font-semibold">
              Material na obra há {c.overdueDays} {c.overdueDays === 1 ? "dia" : "dias"} além da previsão.
            </p>
            <p className="mt-0.5 text-red-800/90">Os dias excedentes já estão sendo somados.</p>
            {c.hasAdditions && (
              <p className="mt-1 text-xs text-red-800/80">
                Atrasado: {r.items.filter((_, i) => c.items[i].overdue).map((it) => it.equipment.name).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {r.notes && (
        <div className="mt-4 flex gap-3 rounded-[20px] bg-accent-50 px-4 py-3.5 text-sm text-slate-800 ring-1 ring-accent-200/80 ring-inset">
          <StickyNote size={18} className="mt-0.5 shrink-0 text-accent-700" aria-hidden />
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-accent-800 uppercase">Observações internas</div>
            <p className="mt-0.5 break-words whitespace-pre-line">{r.notes}</p>
          </div>
        </div>
      )}

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <Panel
            title="Equipamentos"
            icon={Package}
            subtitle={
              <span className="tnum">
                {units} {units === 1 ? "unidade" : "unidades"} · {r.items.length} {r.items.length === 1 ? "item" : "itens"}
                {c.hasAdditions ? ` · ${additions.length} ${additions.length === 1 ? "acréscimo" : "acréscimos"}` : ""}
              </span>
            }
            actions={<span className="tnum text-sm font-bold text-slate-900">{money(c.itemsTotal)}</span>}
          >
            {c.hasAdditions ? (
              <>
                <GroupTitle>
                  Itens iniciais · {fmtDateShort(r.startDate)} → {fmtDateShort(r.expectedEndDate)}
                </GroupTitle>
                <ul className="divide-y divide-slate-100">{initialItems.map((idx) => renderItem(idx))}</ul>
                <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-amber-50/50 ring-1 ring-amber-200/80 ring-inset">
                  <div className="flex items-center gap-2 border-b border-amber-200/60 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-amber-800 uppercase">
                    <PackagePlus size={14} aria-hidden /> Acréscimos · datas próprias
                  </div>
                  <ul className="divide-y divide-amber-200/50 [&>li]:px-4">{additions.map((idx) => renderItem(idx))}</ul>
                </div>
              </>
            ) : (
              <ul className="divide-y divide-slate-100 border-t border-slate-100">{r.items.map((_, idx) => renderItem(idx))}</ul>
            )}
            {r.stage === "ATIVA" && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
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
          </Panel>

          {r.stage === "ATIVA" && (
            <Panel id="devolucao" title="Devolução" subtitle="Total ou parcial — o material volta para o estoque" icon={Undo2} tone="accent">
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
            </Panel>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title="Valores" icon={Receipt}>
            <dl className="space-y-2 px-5 pb-4 text-sm">
              <Row label="Equipamentos">{money(c.itemsTotal)}</Row>
              {r.extras.map((e) => (
                <Row key={e.id} label={e.description}>
                  {money(Number(e.amount))}
                </Row>
              ))}
              {c.discount > 0 && (
                <Row label="Desconto">
                  <span className="text-emerald-700">− {money(c.discount)}</span>
                </Row>
              )}
            </dl>
            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="tnum text-2xl font-bold tracking-[-0.02em] text-brand-900">{money(c.total)}</span>
              </div>
              {isLive && (
                <>
                  <ProgressBar value={paidPct} tone="green" className="mt-3 h-2" label="Pago" />
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-xs text-slate-500">Pago</dt>
                      <dd className="tnum font-semibold text-emerald-700">{money(c.paid)}</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-xs text-slate-500">Em aberto</dt>
                      <dd className={`tnum font-bold ${c.open > 0 ? "text-red-700" : "text-brand-700"}`}>{money(Math.max(0, c.open))}</dd>
                    </div>
                  </dl>
                </>
              )}
              {c.open < 0 && <p className="mt-2 text-xs text-amber-700">Recebido {money(-c.open)} a mais que o total.</p>}
              {r.stage === "ATIVA" && hasOutstanding && (
                <p className="mt-3 text-xs leading-relaxed text-slate-500">O total muda conforme os dias passam e as devoluções são registradas.</p>
              )}
            </div>
          </Panel>

          {isLive && (
            <Panel id="pagamento" title="Pagamentos" icon={Wallet} tone="green" subtitle={r.payments.length ? `${r.payments.length} registrado${r.payments.length > 1 ? "s" : ""}` : "Nenhum ainda"}>
              {r.payments.length > 0 && (
                <ul className="mx-5 mb-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200/80 ring-inset">
                  {r.payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 py-2.5 pr-2 pl-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-600" aria-hidden>
                        <Banknote size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="tnum block text-sm font-semibold text-slate-900">{money(Number(p.amount))}</span>
                        <span className="tnum block truncate text-xs text-slate-500">
                          {fmtDate(p.date)}
                          {p.method ? ` · ${p.method}` : ""}
                          {p.note ? ` · ${p.note}` : ""}
                        </span>
                      </span>
                      <ActionButton
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 [&>svg]:shrink-0"
                        confirm="Apagar este pagamento?"
                        action={deletePayment.bind(null, r.id, p.id)}
                      >
                        <Trash2 size={16} aria-label="Apagar pagamento" />
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
              <PaymentForm action={addPayment.bind(null, r.id)} open={Math.max(0, c.open)} todayISO={todayISO()} />
            </Panel>
          )}

          {showExpenses && (
            <Panel title="Despesas" subtitle="Frete, combustível e outros custos desta locação" icon={Truck} tone="red">
              <div className="border-t border-slate-100">
                <ExpenseList
                  expenses={expenses}
                  extras={r.extras.map((x) => ({ amount: Number(x.amount) }))}
                  rentalId={r.id}
                  rentals={expenseRentals}
                  todayISO={todayISO()}
                />
              </div>
            </Panel>
          )}

          <Panel title="Mais ações" icon={Handshake} tone="slate">
            <div className="flex flex-col gap-2 px-5 pb-5">
              {r.stage === "ATIVA" && (
                <ActionButton
                  className="btn-primary w-full"
                  action={closeRental.bind(null, r.id)}
                  confirm={c.open > 0 ? `Ainda há ${money(c.open)} em aberto. Encerrar mesmo assim? O valor continua no financeiro.` : undefined}
                >
                  <Lock size={16} aria-hidden /> Encerrar locação
                </ActionButton>
              )}
              {isQuote && confirmBtn("btn-accent w-full lg:hidden")}
              <div className="lg:hidden">
                <ShareQuote url={url} whatsappUrl={wa} className="mt-2 w-full first:mt-0" mainClass="btn-secondary" />
              </div>
              {(r.stage === "ENCERRADA" || r.stage === "CANCELADA") && (
                <ActionButton className="btn-secondary w-full" action={reopenRental.bind(null, r.id)}>
                  <RotateCcw size={16} aria-hidden /> Reabrir locação
                </ActionButton>
              )}
              {(r.stage === "ATIVA" || r.stage === "ORCAMENTO") && (
                <ActionButton className="btn-ghost w-full" action={toggleNegotiating.bind(null, r.id)}>
                  <Handshake size={16} aria-hidden /> {r.negotiating ? "Tirar de negociação" : "Marcar em negociação"}
                </ActionButton>
              )}
              {(r.stage === "ORCAMENTO" || r.stage === "ATIVA" || r.stage === "CANCELADA") && (
                <div className="mt-1 flex gap-2 border-t border-slate-100 pt-3">
                  {(r.stage === "ORCAMENTO" || r.stage === "ATIVA") && (
                    <ActionButton className="btn-ghost btn-sm flex-1 text-red-700 hover:bg-red-50" confirm="Cancelar esta locação?" action={cancelRental.bind(null, r.id)}>
                      <Ban size={14} aria-hidden /> Cancelar
                    </ActionButton>
                  )}
                  {(r.stage === "ORCAMENTO" || r.stage === "CANCELADA") && (
                    <ActionButton className="btn-ghost btn-sm flex-1 text-red-700 hover:bg-red-50" confirm="Excluir definitivamente?" action={deleteRental.bind(null, r.id)}>
                      <Trash2 size={14} aria-hidden /> Excluir
                    </ActionButton>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>

      {/* Ações principais no celular (acima da navegação inferior) */}
      {isQuote && (
        <MobileActionBar>
          <ShareQuote url={url} whatsappUrl={wa} showView={false} mainClass="btn-secondary px-3" />
          {confirmBtn("btn-accent flex-1 min-w-0 px-3")}
        </MobileActionBar>
      )}
      {r.stage === "ATIVA" && (
        <MobileActionBar>
          {hasOutstanding ? (
            <a href="#devolucao" className="btn-secondary px-3">
              <Undo2 size={17} aria-hidden /> Devolução
            </a>
          ) : (
            <ActionButton
              className="btn-secondary flex-1 min-w-0 px-3"
              action={closeRental.bind(null, r.id)}
              confirm={c.open > 0 ? `Ainda há ${money(c.open)} em aberto. Encerrar mesmo assim? O valor continua no financeiro.` : undefined}
            >
              <Lock size={16} aria-hidden /> Encerrar
            </ActionButton>
          )}
          <a href="#pagamento" className="btn-primary px-3">
            <Wallet size={17} aria-hidden /> Pagamento
          </a>
        </MobileActionBar>
      )}
      {r.stage === "ENCERRADA" && (
        <MobileActionBar>
          <a href={url} target="_blank" rel="noreferrer" className="btn-secondary px-3">
            <ExternalLink size={16} aria-hidden /> Orçamento / PDF
          </a>
          {c.open > 0.009 && (
            <a href="#pagamento" className="btn-primary px-3">
              <Wallet size={17} aria-hidden /> Pagamento
            </a>
          )}
        </MobileActionBar>
      )}
      {(isQuote || r.stage === "ATIVA" || r.stage === "ENCERRADA") && <div className="h-20 lg:hidden" aria-hidden />}
    </>
  );
}

function TimelineStep({
  label,
  date,
  state,
  note,
  line,
  lineTone = "brand",
}: {
  label: string;
  date: Date | null;
  state: "done" | "current" | "late" | "todo";
  note?: string;
  /** Preenchimento (0–1) da linha até o próximo passo. Sem valor = último passo. */
  line?: number;
  lineTone?: "brand" | "red";
}) {
  const dot = {
    done: "bg-brand-600 ring-brand-100",
    current: "bg-white ring-brand-500 [box-shadow:inset_0_0_0_3px_var(--color-brand-600)]",
    late: "bg-red-600 ring-red-100",
    todo: "bg-white ring-slate-200",
  }[state];
  return (
    <li className="relative flex flex-col items-center px-1">
      {line != null && (
        <span className="absolute top-[9px] left-1/2 h-[3px] w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <span
            className={`block h-full rounded-full ${lineTone === "red" ? "bg-gradient-to-r from-brand-600 to-red-500" : "bg-brand-600"}`}
            style={{ width: `${Math.round(line * 100)}%` }}
          />
        </span>
      )}
      <span className={`relative z-10 h-5 w-5 rounded-full ring-4 ${dot}`} aria-hidden />
      <span className={`mt-2 text-[11px] font-medium ${state === "late" ? "text-red-700" : "text-slate-500"}`}>{label}</span>
      <span className={`tnum text-[15px] leading-tight font-bold tracking-[-0.01em] ${state === "late" ? "text-red-700" : date ? "text-slate-900" : "text-slate-300"}`}>
        {date ? fmtDateShort(date) : "—"}
      </span>
      <span className={`text-[11px] ${state === "late" ? "font-semibold text-red-600" : "text-slate-400"}`}>{note ?? (date ? weekday(date) : "sem data")}</span>
    </li>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="tnum border-y border-slate-100 bg-slate-50/70 px-5 py-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500 uppercase">{children}</div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="tnum font-medium text-slate-800">{children}</dd>
    </div>
  );
}
