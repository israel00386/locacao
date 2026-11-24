import Link from "next/link";
import {
  AlarmClock,
  ArrowUpRight,
  Boxes,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  HandCoins,
  PackageCheck,
  PackageX,
  Plus,
  TriangleAlert,
  Truck,
  UserPlus,
  Wallet,
} from "lucide-react";
import { Avatar, Badge, Empty, Hero, HeroStat, IconBox, ListRow, MoreLink, Section, Shortcut, Stat } from "@/components/ui";
import { paymentStatus } from "@/lib/calc";
import { diffDays, fmtDateShort, today } from "@/lib/dates";
import { money, rentalCode } from "@/lib/format";
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
  if (d === 0) return "hoje";
  if (d === 1) return "amanhã";
  return `em ${d} dias`;
}

export default async function PainelPage() {
  const [session, active, quotes, closedOpen, stock] = await Promise.all([
    getSession(),
    listRentals({ stage: "ATIVA" }),
    listRentals({ stage: "ORCAMENTO" }),
    listRentals({ stage: "ENCERRADA" }),
    getStock(),
  ]);
  const now = today();
  const onSite = active.filter((r) => r.calc.outstandingQty > 0);
  const overdue = onSite.filter((r) => r.calc.overdue).sort((a, b) => b.calc.overdueDays - a.calc.overdueDays);
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
  const topOwing = [...owing].sort((a, b) => b.calc.open - a.calc.open).slice(0, 5);
  const lacking = stock.filter((s) => s.availableQty <= 0 && s.totalQty > 0);
  const firstName = session?.name?.split(" ")[0];
  const empty = active.length === 0 && quotes.length === 0;

  const summary = overdue.length
    ? `${plural(overdue.length, "locação atrasada", "locações atrasadas")} pede${overdue.length === 1 ? "" : "m"} atenção.`
    : onSite.length
      ? "Tudo em dia com as devoluções."
      : "Nenhum material na obra no momento.";

  return (
    <>
      <Hero
        eyebrow={longDate()}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        subtitle={summary}
        actions={
          <div className="hidden gap-2 sm:flex">
            <Link href="/locacoes" className="btn-glass">
              <ClipboardList className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden /> Locações
            </Link>
            <Link href="/locacoes/nova" className="btn-accent">
              <Plus className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden /> Nova locação
            </Link>
          </div>
        }
        overlap={
          <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <Stat
              label="Locações na obra"
              amount={onSite.length}
              icon={<Truck />}
              hint={`${plural(
                onSite.reduce((s, r) => s + r.calc.outstandingQty, 0),
                "peça",
                "peças",
              )} fora`}
            />
            <Stat
              label="Atrasadas"
              amount={overdue.length}
              icon={<AlarmClock />}
              tone={overdue.length ? "red" : undefined}
              hint={overdue.length ? "passaram da previsão" : "nenhum atraso"}
            />
            <Stat label="Devolvem em até 3 dias" amount={dueSoon.length} icon={<CalendarClock />} hint="previsão de retorno" />
            <Stat label="Orçamentos" amount={quotes.length} icon={<FileText />} hint="aguardando cliente" />
          </div>
        }
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <HeroStat label="A receber" amount={receivable} format="money" hint={receivable > 0 ? `em ${plural(owing.length, "locação", "locações")}` : "Nenhum valor em aberto"} />
          <Link href="/financeiro" className="inline-flex min-h-10 items-center gap-1 rounded-xl px-2 text-[13px] font-semibold text-accent-300 hover:bg-white/10">
            Ver financeiro <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </Hero>

      {/* Atalhos */}
      <div className="mb-6 lg:mb-8">
        <h2 className="micro mb-3 px-1 text-slate-500">Atalhos</h2>
        <div className="stagger grid grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4">
          <Shortcut href="/locacoes/nova" icon={<Plus />} label="Nova locação" hint="Orçamento ou saída" tone="accent" />
          <Shortcut href="/clientes/novo" icon={<UserPlus />} label="Novo cliente" hint="Cadastro rápido" />
          <Shortcut href="/estoque" icon={<Boxes />} label="Estoque" hint="Disponível e na obra" tone="sky" />
          <Shortcut href="/financeiro" icon={<Wallet />} label="Financeiro" hint="Pagamentos e despesas" tone="green" />
        </div>
      </div>

      {empty ? (
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
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
          {/* Celular: Atrasadas → Devolvem → A receber → resto. Desktop: duas colunas independentes. */}
          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-1 lg:order-none">
              <Section
                title="Atrasadas"
                icon={<AlarmClock />}
                iconTone={overdue.length ? "red" : "slate"}
                description={overdue.length ? `${plural(overdue.length, "locação passou", "locações passaram")} da previsão` : undefined}
                actions={overdue.length > 0 && <MoreLink href="/locacoes?aba=atrasadas">Ver todas</MoreLink>}
              >
                {overdue.length ? (
                  <div className="stagger divide-y divide-slate-100">
                    {overdue.slice(0, 5).map((r) => (
                      <ListRow
                        key={r.id}
                        href={`/locacoes/${r.id}`}
                        leading={<Avatar name={r.customer.name} tone="red" />}
                        title={r.customer.name}
                        subtitle={itemsSummary(r)}
                        trailing={<Badge tone="red">{plural(r.calc.overdueDays, "dia", "dias")}</Badge>}
                        trailingSub={`previsto ${fmtDateShort(r.expectedEndDate)}`}
                      />
                    ))}
                  </div>
                ) : (
                  <AllGood>Nenhuma locação atrasada.</AllGood>
                )}
              </Section>
            </div>

            <div className="order-3 lg:order-none">
              <Section
                title="A receber"
                icon={<HandCoins />}
                iconTone="green"
                description={receivable > 0 ? `${money(receivable)} em aberto` : undefined}
                actions={owing.length > 0 && <MoreLink href="/locacoes?aba=receber">Ver todas</MoreLink>}
              >
                {topOwing.length ? (
                  <div className="stagger divide-y divide-slate-100">
                    {topOwing.map((r) => {
                      const fin = paymentStatus(r.stage, r.calc);
                      return (
                        <ListRow
                          key={r.id}
                          href={`/locacoes/${r.id}`}
                          leading={<Avatar name={r.customer.name} />}
                          title={r.customer.name}
                          subtitle={`${rentalCode(r.number)} · total ${money(r.calc.total)}`}
                          meta={<Badge tone={fin.tone}>{fin.label}</Badge>}
                          trailing={<span className={fin.tone === "red" ? "text-red-600" : "text-slate-900"}>{money(r.calc.open)}</span>}
                          trailingSub="em aberto"
                        />
                      );
                    })}
                  </div>
                ) : (
                  <AllGood>Tudo recebido. Nenhum valor em aberto.</AllGood>
                )}
              </Section>
            </div>
          </div>

          <div className="contents lg:flex lg:flex-col lg:gap-5">
            <div className="order-2 lg:order-none">
              <Section
                title="Devolvem em breve"
                icon={<CalendarClock />}
                iconTone="sky"
                description="Previsão de retorno nos próximos 3 dias"
                actions={dueSoon.length > 0 && <MoreLink href="/locacoes?aba=ativas">Na obra</MoreLink>}
              >
                {dueSoon.length ? (
                  <div className="stagger divide-y divide-slate-100">
                    {dueSoon.slice(0, 5).map((r) => {
                      const d = diffDays(now, r.calc.nextExpectedEnd!);
                      return (
                        <ListRow
                          key={r.id}
                          href={`/locacoes/${r.id}`}
                          leading={<Avatar name={r.customer.name} />}
                          title={r.customer.name}
                          subtitle={itemsSummary(r)}
                          trailing={<span className={d <= 1 ? "text-brand-700" : "text-slate-800"}>{relDay(d)}</span>}
                          trailingSub={fmtDateShort(r.calc.nextExpectedEnd)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <AllGood>Nada previsto para os próximos 3 dias.</AllGood>
                )}
              </Section>
            </div>

            <div className="order-4 grid gap-4 lg:order-none lg:gap-5">
              {returnedNotClosed.length > 0 && (
                <Section title="Devolvido, falta encerrar" icon={<PackageCheck />} iconTone="amber" description="Material voltou; confira valores e encerre">
                  <div className="stagger divide-y divide-slate-100">
                    {returnedNotClosed.slice(0, 5).map((r) => (
                      <ListRow
                        key={r.id}
                        href={`/locacoes/${r.id}`}
                        leading={<Avatar name={r.customer.name} />}
                        title={r.customer.name}
                        subtitle={rentalCode(r.number)}
                        trailing={money(r.calc.total)}
                        trailingSub={<Badge tone="yellow">Devolvido</Badge>}
                      />
                    ))}
                  </div>
                </Section>
              )}

              <Section
                title="Orçamentos aguardando"
                icon={<FileText />}
                iconTone="brand"
                actions={quotes.length > 0 && <MoreLink href="/locacoes?aba=orcamentos">Ver todos</MoreLink>}
              >
                {quotes.length ? (
                  <div className="stagger divide-y divide-slate-100">
                    {quotes.slice(0, 4).map((r) => (
                      <ListRow
                        key={r.id}
                        href={`/locacoes/${r.id}`}
                        leading={<Avatar name={r.customer.name} />}
                        title={r.customer.name}
                        subtitle={itemsSummary(r)}
                        trailing={money(r.calc.total)}
                        trailingSub={`retirada ${fmtDateShort(r.startDate)}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="px-5 py-6 text-center text-sm text-slate-500">Nenhum orçamento em aberto.</p>
                )}
              </Section>

              {lacking.length > 0 && (
                <Section title="Sem estoque disponível" icon={<PackageX />} iconTone="red" actions={<MoreLink href="/estoque">Estoque</MoreLink>}>
                  <ul className="divide-y divide-slate-100">
                    {lacking.map((s) => (
                      <li key={s.id}>
                        <ListRow
                          href={`/estoque/${s.id}`}
                          leading={
                            <IconBox tone="slate">
                              <TriangleAlert />
                            </IconBox>
                          }
                          title={s.name}
                          subtitle={s.maintenanceQty ? `${s.maintenanceQty} em manutenção` : "Todas as peças estão na obra"}
                          trailing={`${s.rentedQty}/${s.totalQty}`}
                          trailingSub="na obra"
                        />
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AllGood({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-5 text-sm text-slate-500">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 ring-inset">
        <CircleCheck className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
      </span>
      {children}
    </div>
  );
}
