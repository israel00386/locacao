import { notFound } from "next/navigation";
import {
  Ban,
  Banknote,
  CalendarClock,
  ChevronRight,
  CornerDownRight,
  FileText,
  Handshake,
  Lock,
  MapPin,
  MessageCircle,
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
import { ActionButton, MobileActionBar, PaymentForm, ReturnForm } from "@/components/rental-actions";
import { BalanceCard, Donut, QuickTile, RoundButton, SectionTitle, TopBar } from "@/components/ui";
import { Avatar, deadlineInfo, HeroStat, Panel, ProgressBar, QuickTileBody, quickTileClass, SOFT, TEXT_TONES } from "@/components/rental-ui";
import { AddItemsButton, AddItemsTile } from "@/components/add-items-form";
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

const STAGE_TITLE: Record<string, string> = {
  ORCAMENTO: "Orçamento",
  ATIVA: "Locação",
  ENCERRADA: "Locação encerrada",
  CANCELADA: "Locação cancelada",
};

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
  const isActive = r.stage === "ATIVA";
  const isLive = r.stage !== "ORCAMENTO" && r.stage !== "CANCELADA";
  const addOptions = isActive ? await addItemsOptions(r.customerId) : null;
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
  const open = Math.max(0, c.open);
  const hasOutstanding = c.outstandingQty > 0;
  const closeConfirm = c.open > 0 ? `Ainda há ${money(c.open)} em aberto. Encerrar mesmo assim? O valor continua no financeiro.` : undefined;

  // Linha do tempo (só exibição)
  const plannedPct =
    r.stage === "ENCERRADA" || c.allReturned
      ? 1
      : isActive && r.expectedEndDate
        ? Math.min(1, inclusiveDays(r.startDate, now) / inclusiveDays(r.startDate, r.expectedEndDate))
        : 0;

  const renderItem = (idx: number) => {
    const it = r.items[idx];
    const ic = c.items[idx];
    const st = itemSituation(ic.status);
    const retPct = it.qty > 0 ? ic.returnedQty / it.qty : 0;
    return (
      <li key={it.id} className={`${SOFT} px-4 py-4 sm:px-5`}>
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${ic.addition ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand-600"}`}
            aria-hidden
          >
            {ic.addition ? <PackagePlus size={20} strokeWidth={1.9} /> : <Package size={20} strokeWidth={1.9} />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] leading-snug font-semibold text-brand-950">{it.equipment.name}</div>
                <div className="tnum mt-0.5 text-[12.5px] text-slate-500">
                  <span className="font-semibold text-slate-700">{it.qty} un.</span> × {unitMoney(Number(it.unitPrice))}/dia · {periodLabel(it.period)}
                  {it.daysOverride ? ` · ${it.daysOverride} dias (manual)` : ""}
                </div>
              </div>
              <div className="tnum shrink-0 text-right text-[15px] font-bold tracking-[-0.01em] text-brand-950">{money(ic.total)}</div>
            </div>
            {ic.addition && (
              <div className="tnum mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                <CalendarClock size={12} aria-hidden /> {fmtDateShort(ic.startDate)} → {fmtDateShort(ic.expectedEndDate)}
              </div>
            )}
          </div>
        </div>
        {isLive && (
          <div className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <Badge tone={st.tone}>
                {st.label}
                {ic.overdue ? ` ${ic.overdueDays}d` : ""}
              </Badge>
              <span className="tnum text-[12px] text-slate-500">
                <strong className="font-semibold text-slate-700">{ic.returnedQty}</strong>/{it.qty} devolvidos
                {ic.outstandingQty > 0 && ic.returnedQty > 0 ? ` · ${ic.outstandingQty} na obra` : ""}
              </span>
            </div>
            <ProgressBar value={retPct} tone="yellow" className="mt-2" label={`Devolvido de ${it.equipment.name}`} />
          </div>
        )}
        {it.returns.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {it.returns.map((ret, ri) => (
              <li key={ret.id} className="flex items-center justify-between gap-2 rounded-2xl bg-slate-50 py-1.5 pr-1.5 pl-3 text-xs text-slate-600">
                <span className="flex min-w-0 items-start gap-1.5">
                  <CornerDownRight size={13} className="mt-px shrink-0 text-slate-400" aria-hidden />
                  <span className="tnum">
                    <strong className="font-semibold text-slate-800">{ret.qty}</strong> devolvidos em {fmtDate(ret.date)} · {c.items[idx].returnDays[ri]} dias
                    {ret.note ? <span className="text-slate-500"> · {ret.note}</span> : ""}
                  </span>
                </span>
                {isActive && (
                  <ActionButton
                    className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold text-red-700 hover:bg-red-50"
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
      </li>
    );
  };

  const confirmBtn = (cls: string, label = "Confirmar locação") => (
    <ActionButton className={cls} action={confirmRental.bind(null, r.id)}>
      <Truck size={17} aria-hidden /> {label}
    </ActionButton>
  );

  // Ações rápidas ("Quick Menu")
  const tiles = (
    <>
      <a href={wa} target="_blank" rel="noreferrer" className={quickTileClass("emerald")}>
        <QuickTileBody icon={MessageCircle} label="Enviar no WhatsApp" hint={r.customer.phone ?? "escolher contato"} />
      </a>
      <a href={url} target="_blank" rel="noreferrer" className={quickTileClass("brand")}>
        <QuickTileBody icon={FileText} label={isQuote ? "Orçamento / PDF" : "Ver PDF"} hint="link do cliente" />
      </a>
      {isActive && hasOutstanding && (
        <QuickTile href="#devolucao" tone="accent" icon={<Undo2 />} label="Devolução" hint={`${c.outstandingQty} un. na obra`} />
      )}
      {isLive && (
        <QuickTile href="#pagamento" tone="sky" icon={<Wallet />} label="Pagamento" hint={open > 0.009 ? `falta ${money(open)}` : "quitado"} />
      )}
      {isActive && (
        <AddItemsTile className={quickTileClass("amber")}>
          <QuickTileBody icon={PackagePlus} label="Acréscimo" hint="outra data" />
        </AddItemsTile>
      )}
      {editable && (
        <QuickTile href={`/locacoes/${r.id}/editar`} tone="violet" icon={<Pencil />} label={isQuote ? "Editar orçamento" : "Editar"} hint="itens e valores" />
      )}
    </>
  );

  return (
    <>
      {/* Topo: voltar · cliente · editar */}
      <TopBar
        center
        back="/locacoes"
        eyebrow={`${STAGE_TITLE[r.stage] ?? "Locação"} · ${rentalCode(r.number)}`}
        title={r.customer.name}
        actions={editable ? <RoundButton href={`/locacoes/${r.id}/editar`} label="Editar" icon={<Pencil />} /> : undefined}
      />

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)] lg:items-start lg:gap-5 xl:gap-6">
        {/* Coluna lateral (computador). No celular os blocos entram na ordem da página. */}
        <div className="contents lg:top-6 lg:[@media(min-height:1080px)]:sticky lg:col-start-2 lg:row-start-1 lg:flex lg:flex-col lg:gap-4">
          {/* CARTÃO-SALDO */}
          <BalanceCard
            className="order-1"
            label={isQuote ? "Total do orçamento" : "Total da locação"}
            amount={c.total}
            chips={
              <>
                <Badge tone={sit.tone}>
                  {sit.label}
                  {c.overdue ? ` ${c.overdueDays}d` : ""}
                </Badge>
                {isLive && <Badge tone={fin.tone}>{fin.label}</Badge>}
                {r.negotiating && <Badge tone="amber">Em negociação</Badge>}
              </>
            }
            actions={
              isLive ? (
                <Donut
                  size={92}
                  thickness={13}
                  track="rgb(255 255 255 / .14)"
                  className="w-[84px] sm:w-[92px]"
                  ariaLabel={`${Math.round(paidPct * 100)}% pago`}
                  centerValue={`${Math.round(paidPct * 100)}%`}
                  centerLabel="pago"
                  segments={[
                    { value: c.paid, color: "var(--data-emerald)", label: "Pago" },
                    { value: open > 0.009 ? open : 0, color: "var(--data-rose)", label: "Em aberto" },
                  ]}
                />
              ) : (
                <Donut
                  size={92}
                  thickness={13}
                  track="rgb(255 255 255 / .14)"
                  className="w-[84px] sm:w-[92px]"
                  ariaLabel={`${units} unidades`}
                  centerValue={units}
                  centerLabel={units === 1 ? "unidade" : "unidades"}
                  segments={[{ value: 1, color: "var(--data-yellow)", label: "Unidades" }]}
                />
              )
            }
            footer={
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={r.customer.name} size="md" tone="accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{r.customer.name}</div>
                    <div className="flex min-w-0 items-start gap-1 text-[12.5px] text-white/65">
                      <MapPin size={12} className="mt-0.5 shrink-0 text-accent-300/90" aria-hidden />
                      <span className="break-words">{r.siteAddress || "Sem endereço da obra"}</span>
                    </div>
                  </div>
                </div>
                {(r.customer.phone || r.customer.responsible) && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.customer.phone && (
                      <a href={`tel:${r.customer.phone.replace(/\D/g, "")}`} className="chip tnum min-h-9 bg-white/12 text-white ring-1 ring-white/15 ring-inset hover:bg-white/20">
                        <Phone size={13} className="text-accent-300" aria-hidden /> {r.customer.phone}
                      </a>
                    )}
                    {r.customer.responsible && (
                      <span className="chip min-h-9 bg-white/12 text-white ring-1 ring-white/15 ring-inset">
                        <UserRound size={13} className="text-accent-300" aria-hidden /> {r.customer.responsible}
                      </span>
                    )}
                  </div>
                )}
                {isQuote && <div className="hidden pt-1 lg:block">{confirmBtn("btn-accent w-full", "Confirmar locação (material saiu)")}</div>}
              </div>
            }
          >
            <div className="grid grid-cols-2 gap-3">
              {isLive ? (
                <>
                  <HeroStat label="Pago" tone="green">
                    <CountUp value={c.paid} format="money" />
                  </HeroStat>
                  <HeroStat label="Em aberto" tone={open > 0.009 ? "red" : "green"}>
                    <CountUp value={open} format="money" />
                  </HeroStat>
                </>
              ) : (
                <>
                  <HeroStat label="Itens" tone="accent">
                    {r.items.length}
                  </HeroStat>
                  <HeroStat label="Dias" tone="sky">
                    {c.days || "—"}
                  </HeroStat>
                </>
              )}
            </div>
            {isActive && hasOutstanding && <p className="mt-3 text-[12px] text-white/55">O total muda conforme os dias passam e as devoluções são registradas.</p>}
          </BalanceCard>

          {/* AÇÕES RÁPIDAS */}
          <section className="order-2" aria-labelledby="quick-title">
            <SectionTitle className="lg:sr-only" title={<span id="quick-title">Ações rápidas</span>} />
            <div className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden [&>*]:w-[132px] [&>*]:shrink-0 [&>*]:snap-start md:[&>*]:w-auto">
              {tiles}
            </div>
          </section>

          {/* VALORES */}
          <section className={`${SOFT} order-4 p-4 sm:p-5`} aria-labelledby="values-title">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-50 text-brand-600" aria-hidden>
                <Receipt size={20} strokeWidth={1.9} />
              </span>
              <h2 id="values-title" className="text-base font-semibold text-brand-950">
                Valores
              </h2>
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
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
              <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-slate-200 pt-3">
                <dt className="font-semibold text-slate-700">Total</dt>
                <dd className="tnum text-xl font-bold tracking-[-0.02em] text-brand-950">{money(c.total)}</dd>
              </div>
            </dl>
            {isLive && (
              <div className="mt-3">
                <ProgressBar value={paidPct} tone="green" label="Pago" />
                <div className="tnum mt-2 flex justify-between gap-3 text-[12.5px]">
                  <span className="font-semibold text-emerald-700">Pago {money(c.paid)}</span>
                  <span className={`font-semibold ${open > 0.009 ? "text-red-600" : "text-slate-500"}`}>Em aberto {money(open)}</span>
                </div>
              </div>
            )}
            {c.open < 0 && <p className="mt-2 text-xs text-amber-700">Recebido {money(-c.open)} a mais que o total.</p>}
          </section>

          {/* MAIS AÇÕES */}
          <section className={`${SOFT} order-5 overflow-hidden`} aria-label="Mais ações">
            <ul className="divide-y divide-slate-100">
              {isActive && (
                <li>
                  <ActionButton className={rowAction()} action={closeRental.bind(null, r.id)} confirm={closeConfirm}>
                    <RowIcon tone="bg-brand-50 text-brand-600"><Lock size={18} /></RowIcon>
                    <RowText title="Encerrar locação" hint={hasOutstanding ? "exige tudo devolvido" : "tudo já voltou"} />
                  </ActionButton>
                </li>
              )}
              {(r.stage === "ENCERRADA" || r.stage === "CANCELADA") && (
                <li>
                  <ActionButton className={rowAction()} action={reopenRental.bind(null, r.id)}>
                    <RowIcon tone="bg-brand-50 text-brand-600"><RotateCcw size={18} /></RowIcon>
                    <RowText title="Reabrir locação" />
                  </ActionButton>
                </li>
              )}
              {editable && (
                <li>
                  <ActionButton className={rowAction()} action={toggleNegotiating.bind(null, r.id)}>
                    <RowIcon tone="bg-amber-50 text-amber-600"><Handshake size={18} /></RowIcon>
                    <RowText title={r.negotiating ? "Tirar de negociação" : "Marcar em negociação"} />
                  </ActionButton>
                </li>
              )}
              {editable && (
                <li>
                  <ActionButton className={rowAction("danger")} confirm="Cancelar esta locação?" action={cancelRental.bind(null, r.id)}>
                    <RowIcon tone="bg-red-50 text-red-600"><Ban size={18} /></RowIcon>
                    <RowText title="Cancelar" danger />
                  </ActionButton>
                </li>
              )}
              {(isQuote || r.stage === "CANCELADA") && (
                <li>
                  <ActionButton className={rowAction("danger")} confirm="Excluir definitivamente?" action={deleteRental.bind(null, r.id)}>
                    <RowIcon tone="bg-red-50 text-red-600"><Trash2 size={18} /></RowIcon>
                    <RowText title="Excluir" danger />
                  </ActionButton>
                </li>
              )}
            </ul>
          </section>
        </div>

        {/* CONTEÚDO */}
        <div className="order-3 min-w-0 space-y-4 lg:col-start-1 lg:row-start-1 lg:space-y-5">
          {/* Linha do tempo */}
          <section className={`${SOFT} px-4 pt-4 pb-5 sm:px-5`} aria-label="Prazo">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[15px] font-semibold text-brand-950">
                <CalendarClock size={17} className="text-brand-500" aria-hidden /> Prazo
                {c.days > 0 && <span className="tnum text-[13px] font-medium text-slate-400">· {c.days} {c.days === 1 ? "dia" : "dias"}</span>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${TEXT_TONES[dl.tone]} ${dl.tone === "red" ? "bg-red-50" : dl.tone === "amber" ? "bg-amber-50" : dl.tone === "yellow" ? "bg-yellow-50" : "bg-slate-100"}`}>
                {dl.label}
              </span>
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
          </section>

          {c.overdue && (
            <div className="flex gap-3 rounded-[24px] bg-gradient-to-br from-red-50 to-rose-50 px-4 py-4 text-sm text-red-900">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-red-600 shadow-sm" aria-hidden>
                <TriangleAlert size={19} />
              </span>
              <div className="min-w-0">
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
            <div className="flex gap-3 rounded-[24px] bg-gradient-to-br from-accent-50 to-amber-50 px-4 py-4 text-sm text-slate-800">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-accent-700 shadow-sm" aria-hidden>
                <StickyNote size={18} />
              </span>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-accent-800">Observações internas</div>
                <p className="mt-0.5 break-words whitespace-pre-line">{r.notes}</p>
              </div>
            </div>
          )}

          {/* Equipamentos (breakdown) */}
          <section aria-labelledby="items-title">
            <SectionTitle
              action={<span className="tnum text-[15px] font-bold text-brand-950">{money(c.itemsTotal)}</span>}
              title={
                <>
                  <span id="items-title">Equipamentos</span>
                  <span className="tnum ml-1.5 text-[13px] font-medium text-slate-400">
                    {units} {units === 1 ? "unidade" : "unidades"} · {r.items.length} {r.items.length === 1 ? "item" : "itens"}
                  </span>
                </>
              }
            />
            {c.hasAdditions ? (
              <>
                <GroupTitle>
                  Itens iniciais · {fmtDateShort(r.startDate)} → {fmtDateShort(r.expectedEndDate)}
                </GroupTitle>
                <ul className="space-y-2.5">{initialItems.map((idx) => renderItem(idx))}</ul>
                <GroupTitle tone="amber">
                  <PackagePlus size={14} aria-hidden /> Acréscimos · datas próprias
                </GroupTitle>
                <ul className="space-y-2.5">{additions.map((idx) => renderItem(idx))}</ul>
              </>
            ) : (
              <ul className="space-y-2.5">{r.items.map((_, idx) => renderItem(idx))}</ul>
            )}
            {isActive && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
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
          </section>

          {isActive && (
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

          {isLive && (
            <Panel
              id="pagamento"
              title="Pagamentos"
              icon={Wallet}
              tone="green"
              subtitle={r.payments.length ? `${r.payments.length} registrado${r.payments.length > 1 ? "s" : ""}` : "Nenhum ainda"}
              actions={r.payments.length > 0 ? <span className="tnum text-[15px] font-bold text-emerald-700">{money(c.paid)}</span> : undefined}
            >
              {r.payments.length > 0 && (
                <ul className="mx-4 mb-2 space-y-1 sm:mx-5">
                  {r.payments.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-2xl bg-slate-50/80 py-2.5 pr-1.5 pl-2.5">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-[0_2px_8px_-4px_rgb(15_18_63/.25)]" aria-hidden>
                        <Banknote size={19} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-brand-950">{p.method || "Pagamento"}</span>
                        <span className="tnum block truncate text-[12px] text-slate-500">
                          {fmtDate(p.date)}
                          {p.note ? ` · ${p.note}` : ""}
                        </span>
                      </span>
                      <span className="tnum shrink-0 text-[15px] font-bold text-emerald-600">+ {money(Number(p.amount))}</span>
                      <ActionButton
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 [&>svg]:shrink-0"
                        confirm="Apagar este pagamento?"
                        action={deletePayment.bind(null, r.id, p.id)}
                      >
                        <Trash2 size={16} aria-label="Apagar pagamento" />
                      </ActionButton>
                    </li>
                  ))}
                </ul>
              )}
              <PaymentForm action={addPayment.bind(null, r.id)} open={open} todayISO={todayISO()} />
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
        </div>
      </div>

      {/* Ações principais no celular (acima da barra inferior flutuante) */}
      {isQuote && <MobileActionBar>{confirmBtn("btn-accent min-w-0 flex-1 rounded-full px-3")}</MobileActionBar>}
      {isActive && (
        <MobileActionBar>
          {hasOutstanding ? (
            <a href="#devolucao" className="btn-secondary rounded-full px-3">
              <Undo2 size={17} aria-hidden /> Devolução
            </a>
          ) : (
            <ActionButton className="btn-secondary min-w-0 flex-1 rounded-full px-3" action={closeRental.bind(null, r.id)} confirm={closeConfirm}>
              <Lock size={16} aria-hidden /> Encerrar
            </ActionButton>
          )}
          <a href="#pagamento" className="btn-primary rounded-full px-3">
            <Wallet size={17} aria-hidden /> Pagamento
          </a>
        </MobileActionBar>
      )}
      {r.stage === "ENCERRADA" && c.open > 0.009 && (
        <MobileActionBar>
          <a href="#pagamento" className="btn-primary rounded-full px-3">
            <Wallet size={17} aria-hidden /> Registrar pagamento
          </a>
        </MobileActionBar>
      )}
      {(isQuote || isActive || (r.stage === "ENCERRADA" && c.open > 0.009)) && <div className="h-20 lg:hidden" aria-hidden />}
    </>
  );
}

function rowAction(kind?: "danger") {
  return `group flex min-h-[64px] w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-slate-100 sm:px-5 disabled:opacity-60 ${
    kind === "danger" ? "hover:bg-red-50/60" : "hover:bg-slate-50"
  }`;
}

function RowIcon({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${tone}`} aria-hidden>
      {children}
    </span>
  );
}

function RowText({ title, hint, danger }: { title: string; hint?: string; danger?: boolean }) {
  return (
    <>
      <span className="min-w-0 flex-1">
        <span className={`block text-[14px] font-semibold ${danger ? "text-red-700" : "text-brand-950"}`}>{title}</span>
        {hint && <span className="block text-[12px] text-slate-500">{hint}</span>}
      </span>
      <ChevronRight size={18} className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" aria-hidden />
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
    current: "bg-white ring-brand-100 [box-shadow:inset_0_0_0_5px_var(--color-brand-600)]",
    late: "bg-red-500 ring-red-100",
    todo: "bg-white ring-slate-100 [box-shadow:inset_0_0_0_2px_var(--color-slate-200)]",
  }[state];
  return (
    <li className="relative flex flex-col items-center px-1">
      {line != null && (
        <span className="absolute top-[9px] left-1/2 h-1 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <span
            className={`block h-full rounded-full ${lineTone === "red" ? "bg-gradient-to-r from-brand-600 to-red-500" : "bg-gradient-to-r from-brand-400 to-brand-600"}`}
            style={{ width: `${Math.round(line * 100)}%` }}
          />
        </span>
      )}
      <span className={`relative z-10 h-[22px] w-[22px] rounded-full ring-4 ${dot}`} aria-hidden />
      <span className={`mt-2 text-[11.5px] font-medium ${state === "late" ? "text-red-700" : "text-slate-500"}`}>{label}</span>
      <span className={`tnum text-base leading-tight font-bold tracking-[-0.01em] ${state === "late" ? "text-red-700" : date ? "text-brand-950" : "text-slate-300"}`}>
        {date ? fmtDateShort(date) : "—"}
      </span>
      <span className={`text-[11px] ${state === "late" ? "font-semibold text-red-600" : "text-slate-400"}`}>{note ?? (date ? weekday(date) : "sem data")}</span>
    </li>
  );
}

function GroupTitle({ children, tone }: { children: React.ReactNode; tone?: "amber" }) {
  return (
    <div
      className={`tnum mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold ${tone === "amber" ? "mt-5 text-amber-700" : "text-slate-500"}`}
    >
      {children}
    </div>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="min-w-0 truncate text-slate-500">{label}</dt>
      <dd className="tnum shrink-0 font-medium text-slate-800">{children}</dd>
    </div>
  );
}
