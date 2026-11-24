import { notFound } from "next/navigation";
import { CalendarDays, Instagram, MapPin, Phone, QrCode, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { fmtDate, today } from "@/lib/dates";
import { money, periodLabel, rentalCode, unitMoney } from "@/lib/format";
import { getCompany, rentalInclude, withCalc } from "@/lib/rentals";
import { LogoMark } from "@/components/logo";
import { CopyPix, PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await db.rental.findUnique({ where: { quoteToken: token }, select: { number: true, stage: true } });
  return { title: r ? `${r.stage === "ORCAMENTO" ? "Orçamento" : "Locação"} ${rentalCode(r.number)}` : "Orçamento", robots: { index: false } };
}

// A4 limpo: margens, cores preservadas, sem quebrar linhas da tabela.
const PRINT_CSS = `
@page { size: A4; margin: 12mm 12mm 14mm; }
@media print {
  html, body { background: #fff !important; }
  .quote-doc, .quote-doc * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .quote-doc tr, .quote-doc .avoid-break { break-inside: avoid; }
}
`;

export default async function OrcamentoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = await db.rental.findUnique({ where: { quoteToken: token }, include: rentalInclude });
  if (!raw || raw.stage === "CANCELADA") notFound();
  const r = withCalc(raw);
  const company = await getCompany();
  const c = r.calc;
  const isQuote = r.stage === "ORCAMENTO";
  const notes = company.quoteNotes.split("\n").map((s) => s.trim()).filter(Boolean);
  const hasPix = !!(company.pixKey || company.pixName || company.pixBank);

  return (
    <div className="min-h-dvh bg-[#eef0f6] px-3 py-4 sm:px-6 sm:py-8 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="no-print mx-auto mb-3 flex max-w-3xl items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">
          {isQuote ? "Orçamento" : "Locação"} {rentalCode(r.number)}
        </span>
        <PrintButton />
      </div>

      <article className="quote-doc mx-auto max-w-3xl overflow-hidden rounded-[24px] bg-white text-[13px] text-slate-800 shadow-[0_1px_2px_rgb(15_18_63/.06),0_24px_60px_-28px_rgb(15_18_63/.35)] ring-1 ring-slate-200/70 print:max-w-none print:rounded-none print:shadow-none print:ring-0">
        {/* CABEÇALHO */}
        <header className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-900 to-brand-800 px-6 pt-6 pb-6 text-white sm:px-8 print:px-7">
          <div className="pointer-events-none absolute -top-20 -right-12 h-60 w-60 rounded-full bg-[radial-gradient(closest-side,rgb(248_200_10/.18),transparent)]" aria-hidden />
          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <LogoMark className="h-14 w-auto" title={null} />
              <div>
                <div className="text-xl leading-none font-black tracking-tight">{company.name}</div>
                <p className="mt-1.5 max-w-[16rem] text-xs leading-snug text-white/70">{company.subtitle}</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[11px] font-semibold tracking-[0.12em] text-accent-300 uppercase">{isQuote ? "Orçamento" : "Locação"}</div>
              <div className="tnum mt-0.5 font-mono text-2xl leading-none font-bold tracking-tight">{rentalCode(r.number)}</div>
              <div className="tnum mt-1.5 text-xs text-white/70">Emitido em {fmtDate(today())}</div>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/10 pt-4 text-xs text-white/75">
            {company.location && (
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-accent-300" aria-hidden /> {company.location}
              </span>
            )}
            {company.phone && (
              <span className="flex items-center gap-1.5">
                <Phone size={13} className="text-accent-300" aria-hidden /> {company.phone}
              </span>
            )}
            {company.instagram && (
              <span className="flex items-center gap-1.5">
                <Instagram size={13} className="text-accent-300" aria-hidden /> {company.instagram}
              </span>
            )}
          </div>
        </header>
        <div className="h-1 bg-gradient-to-r from-accent-400 via-accent-300 to-accent-500" />

        {/* CLIENTE */}
        <section className="avoid-break grid gap-4 px-6 py-5 sm:grid-cols-[1.3fr_1fr] sm:px-8 print:grid-cols-[1.3fr_1fr] print:px-7">
          <div>
            <Label>Cliente</Label>
            <div className="mt-1 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
              <UserRound size={15} className="shrink-0 text-brand-500" aria-hidden /> {r.customer.name}
            </div>
            {r.customer.phone && (
              <div className="tnum mt-1 flex items-center gap-2 text-slate-600">
                <Phone size={14} className="shrink-0 text-slate-400" aria-hidden /> {r.customer.phone}
              </div>
            )}
          </div>
          <div>
            <Label>Endereço da obra</Label>
            <div className="mt-1 flex items-start gap-2 font-medium text-slate-800">
              <MapPin size={15} className="mt-0.5 shrink-0 text-brand-500" aria-hidden /> {r.siteAddress || "—"}
            </div>
            <div className="tnum mt-1 flex items-center gap-2 text-slate-600">
              <CalendarDays size={14} className="shrink-0 text-slate-400" aria-hidden /> {fmtDate(r.startDate)} a {fmtDate(r.expectedEndDate)}
            </div>
          </div>
        </section>

        {/* ITENS */}
        <section className="px-6 sm:px-8 print:px-7">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-sm font-bold text-brand-900">Itens {isQuote ? "do orçamento" : "da locação"}</h2>
            <span className="tnum text-xs text-slate-500">
              {r.items.length} {r.items.length === 1 ? "item" : "itens"}
            </span>
          </div>

          {/* Celular */}
          <ul className="space-y-2 sm:hidden print:hidden">
            {r.items.map((it, idx) => {
              const ic = c.items[idx];
              return (
                <li key={it.id} className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200/70 ring-inset">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold text-slate-900">
                      <span className="tnum text-brand-600">{it.qty}×</span> {it.equipment.name}
                      {ic.addition && <span className="ml-1.5 inline-block rounded-md bg-accent-100 px-1.5 py-0.5 align-middle text-[10px] font-bold text-accent-800 uppercase">Acréscimo</span>}
                    </span>
                    <span className="tnum shrink-0 font-bold text-slate-900">{money(ic.total)}</span>
                  </div>
                  <div className="tnum mt-1 text-[11.5px] text-slate-500">
                    {unitMoney(Number(it.unitPrice))}/dia · {periodLabel(it.period)} · {fmtDate(ic.startDate)} a {fmtDate(ic.expectedEndDate)}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Computador e impressão */}
          <div className="hidden overflow-hidden rounded-2xl ring-1 ring-slate-200 ring-inset sm:block print:block print:rounded-lg">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-slate-50 text-[10.5px] font-semibold tracking-[0.06em] text-slate-500 uppercase">
                  <th className="px-3 py-2.5 text-left">Equipamento</th>
                  <th className="px-2 py-2.5 text-right">Qtd.</th>
                  <th className="px-2 py-2.5 text-right">Unit./dia</th>
                  <th className="px-2 py-2.5 text-center">Período</th>
                  <th className="px-2 py-2.5 text-center">Início</th>
                  <th className="px-2 py-2.5 text-center">Término</th>
                  <th className="px-2 py-2.5 text-right">Dias</th>
                  <th className="px-3 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="tnum divide-y divide-slate-100">
                {r.items.map((it, idx) => {
                  const ic = c.items[idx];
                  const allDays = [...ic.returnDays, ...(ic.outstandingQty > 0 ? [ic.outstandingDays] : [])];
                  const daysText = allDays.length && allDays.every((d) => d === allDays[0]) ? String(allDays[0]) : allDays.join(" / ");
                  const lastReturn = it.returns.at(-1)?.date;
                  const end = ic.outstandingQty > 0 ? ic.expectedEndDate : lastReturn ?? ic.expectedEndDate;
                  return (
                    <tr key={it.id} className="border-t border-slate-100">
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {it.equipment.name}
                        {ic.addition && <span className="ml-1.5 rounded-md bg-accent-100 px-1.5 py-0.5 text-[9.5px] font-bold text-accent-800 uppercase">Acréscimo</span>}
                      </td>
                      <td className="px-2 py-2.5 text-right">{it.qty}</td>
                      <td className="px-2 py-2.5 text-right text-slate-600">{unitMoney(Number(it.unitPrice))}</td>
                      <td className="px-2 py-2.5 text-center text-slate-600">{periodLabel(it.period)}</td>
                      <td className="px-2 py-2.5 text-center text-slate-600">{fmtDate(ic.startDate)}</td>
                      <td className="px-2 py-2.5 text-center text-slate-600">{fmtDate(end)}</td>
                      <td className="px-2 py-2.5 text-right">{daysText}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-slate-900">{money(ic.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* TOTAIS + PIX */}
        <section className="avoid-break grid gap-4 px-6 py-5 sm:grid-cols-[1fr_300px] sm:px-8 print:grid-cols-[1fr_280px] print:px-7">
          {hasPix ? (
            <div className="order-2 self-start rounded-2xl bg-accent-50 p-4 ring-1 ring-accent-200 ring-inset sm:order-1 print:order-1">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent-400 text-brand-950" aria-hidden>
                  <QrCode size={17} />
                </span>
                <div className="text-sm font-bold text-brand-900">Pagamento via Pix</div>
              </div>
              {company.pixKey && (
                <div className="mt-3">
                  <div className="text-[11px] font-medium text-slate-500">Chave Pix</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="tnum font-mono text-base font-bold break-all text-slate-900">{company.pixKey}</span>
                    <CopyPix value={company.pixKey} />
                  </div>
                </div>
              )}
              <dl className="mt-2.5 grid grid-cols-2 gap-2 text-xs">
                {company.pixName && (
                  <div>
                    <dt className="text-slate-500">Favorecido</dt>
                    <dd className="font-semibold text-slate-800">{company.pixName}</dd>
                  </div>
                )}
                {company.pixBank && (
                  <div>
                    <dt className="text-slate-500">Banco</dt>
                    <dd className="font-semibold text-slate-800">{company.pixBank}</dd>
                  </div>
                )}
              </dl>
            </div>
          ) : (
            <div className="order-2 sm:order-1" />
          )}
          <dl className="order-1 overflow-hidden rounded-2xl ring-1 ring-slate-200 ring-inset sm:order-2 print:order-2">
            <Total label="Subtotal dos itens" value={money(c.itemsTotal)} />
            {r.extras.map((e) => (
              <Total key={e.id} label={e.description} value={money(Number(e.amount))} />
            ))}
            {c.discount > 0 && <Total label="Desconto" value={`− ${money(c.discount)}`} />}
            <div className="flex items-baseline justify-between gap-3 bg-brand-900 px-4 py-3 text-white">
              <dt className="text-xs font-semibold tracking-[0.08em] text-white/80 uppercase">Total geral</dt>
              <dd className="tnum text-xl font-bold tracking-[-0.02em]">{money(c.total)}</dd>
            </div>
            {c.paid > 0 && (
              <>
                <Total label="Pago" value={money(c.paid)} />
                <Total label="Em aberto" value={money(Math.max(0, c.open))} strong />
              </>
            )}
          </dl>
        </section>

        {/* OBSERVAÇÕES */}
        {(notes.length > 0 || company.footer) && (
          <section className="avoid-break border-t border-slate-100 px-6 py-5 sm:px-8 print:px-7">
            {notes.length > 0 && (
              <>
                <h2 className="text-sm font-bold text-brand-900">Condições</h2>
                <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-slate-600">
                  {notes.map((n) => (
                    <li key={n} className="flex gap-2">
                      <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" aria-hidden />
                      {n}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {company.footer && <p className="mt-5 text-center text-[12px] text-slate-400 italic">{company.footer}</p>}
          </section>
        )}
      </article>
      <p className="no-print mx-auto mt-4 max-w-3xl text-center text-[11px] text-slate-400">Documento gerado por {company.name}</p>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-semibold tracking-[0.08em] text-slate-400 uppercase">{children}</div>;
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3 border-b border-slate-100 px-4 py-2.5 last:border-b-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className={`tnum font-medium ${strong ? "font-bold text-red-700" : "text-slate-800"}`}>{value}</dd>
    </div>
  );
}
