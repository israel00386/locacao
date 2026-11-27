import Link from "next/link";
import {
  AlarmClock,
  ArrowRight,
  Bell,
  Boxes,
  CircleCheck,
  FileSpreadsheet,
  FileText,
  Fuel,
  HandCoins,
  HardHat,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  ShoppingCart,
  Tag,
  Truck,
  UserPlus,
  Wallet,
  Wrench,
} from "lucide-react";
import {
  Avatar,
  BalanceCard,
  BarChart,
  Badge,
  Chip,
  Donut,
  Empty,
  IconBox,
  ListRow,
  MoreLink,
  ProgressRow,
  QuickTile,
  RoundButton,
  Section,
  SectionTitle,
  TopBar,
  TxRow,
  dataColors,
  type IconTone,
} from "@/components/ui";
import { CountUp } from "@/components/count-up";
import { paymentStatus } from "@/lib/calc";
import { diffDays, fmtDateShort, today } from "@/lib/dates";
import { categoryLabel } from "@/lib/expense-categories";
import { money, rentalCode } from "@/lib/format";
import { db } from "@/lib/db";
import { getStock, listRentals, type RentalWithCalc } from "@/lib/rentals";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TZ = "America/Fortaleza";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function longDate() {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" }).format(new Date());
}

/** "60× Andaime tubular, 120× Escora…" — só o que ainda está na obra quando houver. */
function itemsSummary(r: RentalWithCalc) {
  const list = r.items.map((i, idx) => ({ qty: r.calc.items[idx]?.outstandingQty || i.qty, name: i.equipment.name }));
  const first = list
    .slice(0, 2)
    .map((i) => `${i.qty}× ${i.name}`)
    .join(", ");
  return list.length > 2 ? `${first} +${list.length - 2}` : first;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function relDay(d: number) {
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  return `Em ${d} dias`;
}

const expenseIcon: Record<string, { icon: React.ReactNode; tone: IconTone }> = {
  ENTREGA: { icon: <Truck />, tone: "sky" },
  RETIRADA: { icon: <Truck />, tone: "indigo" },
  COMBUSTIVEL: { icon: <Fuel />, tone: "amber" },
  MANUTENCAO: { icon: <Wrench />, tone: "rose" },
  COMPRA: { icon: <ShoppingCart />, tone: "green" },
};

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function PainelPage() {
  const now = today();
  const chartFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
  const [session, active, quotes, closedOpen, stock, payments, expenses] = await Promise.all([
    getSession(),
    listRentals({ stage: "ATIVA" }),
    listRentals({ stage: "ORCAMENTO" }),
    listRentals({ stage: "ENCERRADA" }),
    getStock(),
    db.payment.findMany({
      where: { date: { gte: chartFrom } },
      select: { id: true, date: true, amount: true, method: true, createdAt: true, rental: { select: { id: true, number: true, customer: { select: { name: true } } } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.expense.findMany({
      where: { date: { gte: chartFrom } },
      select: { id: true, date: true, amount: true, category: true, description: true, createdAt: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
  ]);
  const onSite = active.filter((r) => r.calc.outstandingQty > 0);
  const overdue = [...active, ...closedOpen].filter((r) => r.calc.attention).sort((a, b) => b.calc.overdueDays - a.calc.overdueDays);
  const dueSoon = onSite
    .filter((r) => {
      // Próxima previsão entre os itens na obra (acréscimos têm a própria).
      if (!r.calc.nextExpectedEnd || r.calc.overdue) return false;
      const d = diffDays(now, r.calc.nextExpectedEnd);
      return d >= 0 && d <= 3;
    })
    .sort((a, b) => a.calc.nextExpectedEnd!.getTime() - b.calc.nextExpectedEnd!.getTime());
  const returnedNotClosed = active.filter((r) => r.calc.allReturned);
  const owing = [...active, ...closedOpen].filter((r) => r.calc.open > 0.009);
  const receivable = owing.reduce((s, r) => s + Math.max(0, r.calc.open), 0);
  const overdueOpen = owing.reduce((s, r) => s + r.calc.overdueOpen, 0);
  const topOwing = [...owing].sort((a, b) => b.calc.open - a.calc.open).slice(0, 5);
  const lacking = stock.filter((s) => s.availableQty <= 0 && s.totalQty > 0);
  const piecesOut = onSite.reduce((s, r) => s + r.calc.outstandingQty, 0);
  const firstName = session?.name?.split(" ")[0];
  const empty = active.length === 0 && quotes.length === 0;

  // Equipamentos: na obra × disponível × manutenção
  const eq = stock.reduce(
    (a, s) => ({ rented: a.rented + s.rentedQty, available: a.available + Math.max(0, s.availableQty), maint: a.maint + s.maintenanceQty, total: a.total + s.totalQty }),
    { rented: 0, available: 0, maint: 0, total: 0 },
  );
  const occupancy = eq.total ? Math.round((eq.rented / eq.total) * 100) : 0;
  const topEquip = stock
    .filter((s) => s.totalQty > 0 && s.rentedQty > 0)
    .map((s) => ({ ...s, pct: (s.rentedQty / s.totalQty) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  // Recebido × despesas nos últimos 6 meses
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1));
    return { key: `${d.getUTCFullYear()}-${d.getUTCMonth()}`, label: MONTHS[d.getUTCMonth()], inc: 0, exp: 0 };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const p of payments) {
    const m = byKey.get(`${p.date.getUTCFullYear()}-${p.date.getUTCMonth()}`);
    if (m) m.inc += Number(p.amount);
  }
  for (const e of expenses) {
    const m = byKey.get(`${e.date.getUTCFullYear()}-${e.date.getUTCMonth()}`);
    if (m) m.exp += Number(e.amount);
  }
  const thisMonth = months[5];

  // Últimos movimentos (pagamentos recebidos e despesas)
  const moves = [
    ...payments.slice(0, 6).map((p) => ({
      id: "p" + p.id,
      date: p.date,
      created: p.createdAt,
      href: `/locacoes/${p.rental.id}`,
      title: p.rental.customer.name,
      subtitle: `${fmtDateShort(p.date)} · ${p.method ?? "Pagamento"} · ${rentalCode(p.rental.number)}`,
      amount: Number(p.amount),
      icon: <HandCoins />,
      tone: "green" as IconTone,
    })),
    ...expenses.slice(0, 6).map((e) => ({
      id: "e" + e.id,
      date: e.date,
      created: e.createdAt,
      href: "/financeiro",
      title: e.description || categoryLabel(e.category),
      subtitle: `${fmtDateShort(e.date)} · ${categoryLabel(e.category)}`,
      amount: -Number(e.amount),
      icon: expenseIcon[e.category]?.icon ?? <Tag />,
      tone: expenseIcon[e.category]?.tone ?? ("slate" as IconTone),
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime() || b.created.getTime() - a.created.getTime())
    .slice(0, 6);

  const quickTiles = (
    <div className="grid grid-cols-2 gap-3 min-[560px]:grid-cols-4 lg:grid-cols-2">
      <QuickTile href="/locacoes/nova" icon={<Plus />} label="Nova locação" hint="Orçamento ou saída" tone="accent" />
      <QuickTile href="/clientes/novo" icon={<UserPlus />} label="Novo cliente" hint="Cadastro rápido" tone="brand" />
      <QuickTile href="/estoque" icon={<Boxes />} label="Estoque" hint="Disponível e na obra" tone="sky" />
      <QuickTile href="/financeiro" icon={<Wallet />} label="Financeiro" hint="Pagamentos e despesas" tone="emerald" />
    </div>
  );

  return (
    <>
      <TopBar
        title={
          <>
            <span className="block text-[1.5rem] leading-tight font-medium tracking-[-0.02em] text-slate-500 sm:text-[1.75rem]">{greeting()},</span>
            {firstName ? `${firstName}!` : "bem-vindo!"}
          </>
        }
        subtitle={<span className="hidden first-letter:uppercase lg:inline-block">{longDate()}</span>}
        actions={
          <>
            <Link href="/locacoes/nova" className="btn-accent hidden xl:inline-flex">
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden /> Nova locação
            </Link>
            <RoundButton href="/locacoes?aba=todas" label="Buscar locação" icon={<Search />} />
            <RoundButton
              href="/locacoes?aba=atrasadas"
              label={overdue.length ? `${plural(overdue.length, "locação atrasada", "locações atrasadas")}` : "Avisos"}
              icon={<Bell />}
              dot={overdue.length > 0}
            />
          </>
        }
      />

      {empty ? (
        <div className="grid gap-5">
          <Empty
            icon={<FileSpreadsheet strokeWidth={1.75} />}
            title="Comece sua primeira locação"
            action={
              <>
                <Link href="/locacoes/nova" className="btn-accent">
                  <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden /> Nova locação
                </Link>
                <Link href="/config/importar" className="btn-secondary">
                  Importar planilha
                </Link>
              </>
            }
          >
            Ainda não há locações. Crie uma agora ou traga tudo da planilha que você já usa.
          </Empty>
          {quickTiles}
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-6">
          {/* Coluna principal */}
          <div className="stagger flex min-w-0 flex-col gap-6 lg:col-span-7 xl:col-span-8">
            <BalanceCard
              label="A receber"
              icon={<HandCoins />}
              amount={receivable}
              actions={
                <Link
                  href="/locacoes/nova"
                  aria-label="Nova locação"
                  title="Nova locação"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-900 shadow-[0_6px_16px_-6px_rgb(0_0_0/.45)] transition-transform active:scale-95"
                >
                  <Plus className="h-5 w-5" strokeWidth={2.4} aria-hidden />
                </Link>
              }
              chips={
                <>
                  <Chip tone="glass">{receivable > 0 ? plural(owing.length, "locação", "locações") : "Nada em aberto"}</Chip>
                  {overdueOpen > 0 && (
                    <Chip tone="glass-red" icon={<AlarmClock />}>
                      {money(overdueOpen)} em atraso
                    </Chip>
                  )}
                  {thisMonth.inc > 0 && <Chip tone="glass-yellow">+{money(thisMonth.inc)} no mês</Chip>}
                </>
              }
              footer={
                <div className="flex items-center justify-between gap-3">
                  <Link href="/locacoes?aba=receber" className="inline-flex min-h-10 items-center gap-1 text-[13px] font-semibold text-white/80 hover:text-white">
                    Ver quem deve
                  </Link>
                  <Link href="/financeiro" className="inline-flex min-h-10 items-center gap-1 rounded-full px-1 text-[13px] font-semibold text-accent-300 hover:text-accent-200">
                    Financeiro <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </Link>
                </div>
              }
            >
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <MiniStat icon={<HardHat />} label="Na obra" value={onSite.length} hint={plural(piecesOut, "peça", "peças")} />
                <MiniStat icon={<AlarmClock />} label="Atrasadas" value={overdue.length} hint={overdue.length ? "devolução ou pagamento" : "nenhum atraso"} alert={overdue.length > 0} />
                <MiniStat icon={<FileText />} label="Orçamentos" value={quotes.length} hint="aguardando" />
              </div>
            </BalanceCard>

            {overdue.length > 0 && (
              <section className="card overflow-hidden ring-1 ring-red-100">
                <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-red-50 to-white px-4 py-3.5 sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <IconBox tone="red" round>
                      <AlarmClock />
                    </IconBox>
                    <div className="min-w-0">
                      <h2 className="text-[17px] leading-snug font-semibold text-red-900">{plural(overdue.length, "locação atrasada", "locações atrasadas")}</h2>
                      <p className="text-[13px] text-red-700/80">Material passou da previsão de devolução</p>
                    </div>
                  </div>
                  <MoreLink href="/locacoes?aba=atrasadas">Ver</MoreLink>
                </div>
                <div className="divide-y divide-slate-100">
                  {overdue.slice(0, 4).map((r) => (
                    <ListRow
                      key={r.id}
                      href={`/locacoes/${r.id}`}
                      leading={<Avatar name={r.customer.name} tone="red" />}
                      title={r.customer.name}
                      subtitle={itemsSummary(r)}
                      trailing={<Badge tone="red">{r.calc.financialOverdue ? "Pagamento atrasado" : plural(r.calc.overdueDays, "dia", "dias")}</Badge>}
                      trailingSub={`previsto ${fmtDateShort(r.expectedEndDate)}`}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Devolvem em breve: cards lado a lado (carrossel no celular) */}
            <section className="min-w-0">
              <SectionTitle title="Devolvem em breve" action={dueSoon.length > 0 && <MoreLink href="/locacoes?aba=ativas">Ver todas</MoreLink>} />
              {dueSoon.length ? (
                <div className="snap-row -mx-4 scroll-px-4 px-4 pb-2 lg:mx-0 lg:px-0">
                  {dueSoon.slice(0, 6).map((r, i) => {
                    const d = diffDays(now, r.calc.nextExpectedEnd!);
                    return <DueCard key={r.id} r={r} days={d} featured={i === 0} />;
                  })}
                </div>
              ) : (
                <div className="card">
                  <AllGood>Nada previsto para os próximos 3 dias.</AllGood>
                </div>
              )}
            </section>

            <div className="lg:hidden">
              <SectionTitle title="Acesso rápido" />
              {quickTiles}
            </div>

            <section className="min-w-0">
              <SectionTitle title="Últimos movimentos" action={<MoreLink href="/financeiro">Ver todos</MoreLink>} />
              {moves.length ? (
                <div className="grid gap-2.5">
                  {moves.map((m) => (
                    <TxRow key={m.id} card href={m.href} icon={m.icon} iconTone={m.tone} title={m.title} subtitle={m.subtitle} amount={m.amount} />
                  ))}
                </div>
              ) : (
                <div className="card px-5 py-6 text-center text-sm text-slate-500">Nenhum pagamento ou despesa nos últimos meses.</div>
              )}
            </section>
          </div>

          {/* Coluna lateral */}
          <div className="stagger grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:col-span-5 lg:grid-cols-1 xl:col-span-4">
            <div className="hidden lg:block">
              <SectionTitle title="Acesso rápido" />
              {quickTiles}
            </div>

            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-semibold text-brand-950">Recebido × despesas</h2>
                <span className="text-xs font-medium text-slate-400">6 meses</span>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50/70 px-3.5 py-2.5">
                  <div className="text-xs font-medium text-emerald-700">Recebido no mês</div>
                  <div className="tnum mt-0.5 truncate text-lg font-bold text-emerald-800">
                    <CountUp value={thisMonth.inc} format="money" />
                  </div>
                </div>
                <div className="rounded-2xl bg-rose-50/70 px-3.5 py-2.5">
                  <div className="text-xs font-medium text-rose-700">Despesas no mês</div>
                  <div className="tnum mt-0.5 truncate text-lg font-bold text-rose-800">
                    <CountUp value={thisMonth.exp} format="money" />
                  </div>
                </div>
              </div>
              <BarChart
                data={months.map((m) => ({ label: m.label, values: [m.inc, m.exp] }))}
                series={[
                  { label: "Recebido", color: dataColors.navy },
                  { label: "Despesas", color: dataColors.yellow },
                ]}
                highlight={5}
                height={140}
              />
            </section>

            <section className="card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[17px] font-semibold text-brand-950">Equipamentos</h2>
                <MoreLink href="/estoque">Estoque</MoreLink>
              </div>
              <div className="grid grid-cols-[minmax(0,148px)_minmax(0,1fr)] items-center gap-5">
                <Donut
                  size={148}
                  thickness={13}
                  centerValue={`${occupancy}%`}
                  centerLabel="na obra"
                  segments={[
                    { value: eq.rented, color: dataColors.navy, label: "Na obra" },
                    { value: eq.available, color: dataColors.sky, label: "Disponível" },
                    { value: eq.maint, color: dataColors.amber, label: "Manutenção" },
                  ]}
                  className="text-brand-950"
                />
                <ul className="space-y-2.5 text-[13px]">
                  {[
                    { label: "Na obra", v: eq.rented, c: dataColors.navy },
                    { label: "Disponível", v: eq.available, c: dataColors.sky },
                    { label: "Manutenção", v: eq.maint, c: dataColors.amber },
                  ].map((x) => (
                    <li key={x.label} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: x.c }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-slate-600">{x.label}</span>
                      <span className="tnum font-semibold text-brand-950">{x.v.toLocaleString("pt-BR")}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {topEquip.length > 0 && (
                <div className="-mx-5 mt-4 -mb-2 border-t border-slate-100 pt-1">
                  {topEquip.map((s, i) => (
                    <ProgressRow
                      key={s.id}
                      href={`/estoque/${s.id}`}
                      title={s.name}
                      subtitle={`${s.rentedQty} de ${s.totalQty} na obra`}
                      value={`${Math.round(s.pct)}%`}
                      percent={s.pct}
                      color={[dataColors.navy, dataColors.indigo, dataColors.sky][i]}
                    />
                  ))}
                </div>
              )}
            </section>

            <Section title="A receber" actions={owing.length > 0 && <MoreLink href="/locacoes?aba=receber">Ver todas</MoreLink>}>
              {topOwing.length ? (
                <div className="divide-y divide-slate-100">
                  {topOwing.map((r) => {
                    const fin = paymentStatus(r.stage, r.calc);
                    return (
                      <ListRow
                        key={r.id}
                        href={`/locacoes/${r.id}`}
                        leading={<Avatar name={r.customer.name} />}
                        title={r.customer.name}
                        subtitle={rentalCode(r.number)}
                        trailing={<span className={fin.tone === "red" ? "text-red-600" : "text-slate-900"}>{money(r.calc.open)}</span>}
                        trailingSub={<Badge tone={fin.tone}>{fin.label}</Badge>}
                        chevron={false}
                      />
                    );
                  })}
                </div>
              ) : (
                <AllGood>Tudo recebido. Nenhum valor em aberto.</AllGood>
              )}
            </Section>

            {returnedNotClosed.length > 0 && (
              <Section title="Devolvido, falta encerrar" icon={<PackageCheck />} iconTone="amber" description="Confira valores e encerre">
                <div className="divide-y divide-slate-100">
                  {returnedNotClosed.slice(0, 5).map((r) => (
                    <ListRow
                      key={r.id}
                      href={`/locacoes/${r.id}`}
                      leading={<Avatar name={r.customer.name} />}
                      title={r.customer.name}
                      subtitle={rentalCode(r.number)}
                      trailing={money(r.calc.total)}
                      trailingSub={<Badge tone="yellow">Devolvido</Badge>}
                      chevron={false}
                    />
                  ))}
                </div>
              </Section>
            )}

            <Section title="Orçamentos aguardando" actions={quotes.length > 0 && <MoreLink href="/locacoes?aba=orcamentos">Ver todos</MoreLink>}>
              {quotes.length ? (
                <div className="divide-y divide-slate-100">
                  {quotes.slice(0, 4).map((r) => (
                    <ListRow
                      key={r.id}
                      href={`/locacoes/${r.id}`}
                      leading={
                        <IconBox tone="violet" size="lg" round>
                          <FileText />
                        </IconBox>
                      }
                      title={r.customer.name}
                      subtitle={itemsSummary(r)}
                      trailing={money(r.calc.total)}
                      trailingSub={`retirada ${fmtDateShort(r.startDate)}`}
                      chevron={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="px-5 pt-2 pb-6 text-sm text-slate-500">Nenhum orçamento em aberto.</p>
              )}
            </Section>

            {lacking.length > 0 && (
              <Section title="Sem estoque disponível" icon={<PackageX />} iconTone="red" actions={<MoreLink href="/estoque">Estoque</MoreLink>}>
                <div className="divide-y divide-slate-100">
                  {lacking.map((s) => (
                    <ListRow
                      key={s.id}
                      href={`/estoque/${s.id}`}
                      title={s.name}
                      subtitle={s.maintenanceQty ? `${s.maintenanceQty} em manutenção` : "Todas as peças estão na obra"}
                      trailing={`${s.rentedQty}/${s.totalQty}`}
                      trailingSub="na obra"
                      chevron={false}
                    />
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MiniStat({ icon, label, value, hint, alert }: { icon: React.ReactNode; label: string; value: number; hint: string; alert?: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 ${alert ? "bg-red-500/20 ring-1 ring-red-300/30 ring-inset" : "bg-white/[.08]"}`}>
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-white/70 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="tnum mt-1 text-xl leading-none font-bold text-white sm:text-2xl">
        <CountUp value={value} />
      </div>
      <div className="mt-1 truncate text-[11px] text-white/55">{hint}</div>
    </div>
  );
}

function DueCard({ r, days, featured }: { r: RentalWithCalc; days: number; featured?: boolean }) {
  return (
    <Link
      href={`/locacoes/${r.id}`}
      className={`tap flex w-[calc(50%-6px)] min-w-[158px] max-w-[240px] flex-col rounded-3xl p-4 sm:w-[calc(33.333%-8px)] sm:p-5 ${
        featured ? "bg-gradient-to-br from-brand-700 to-brand-900 text-white shadow-[0_12px_24px_-14px_rgb(15_18_63/.8)]" : "card text-brand-950"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <Avatar name={r.customer.name} tone={featured ? "white" : undefined} />
        <span className={`chip ${featured ? "bg-accent-400 text-brand-950" : days <= 1 ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}>{relDay(days)}</span>
      </div>
      <div className="mt-4 truncate text-[15px] leading-snug font-semibold">{r.customer.name}</div>
      <div className={`mt-1 line-clamp-2 min-h-[2.5em] text-[13px] leading-snug ${featured ? "text-white/70" : "text-slate-500"}`}>{itemsSummary(r)}</div>
      <div className={`tnum mt-3 text-[13px] font-semibold ${featured ? "text-accent-300" : "text-slate-700"}`}>
        Previsto {fmtDateShort(r.calc.nextExpectedEnd)}
      </div>
    </Link>
  );
}

function AllGood({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-5 text-sm text-slate-500">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <CircleCheck className="h-5 w-5" strokeWidth={1.9} aria-hidden />
      </span>
      {children}
    </div>
  );
}
