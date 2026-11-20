import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate, inclusiveDays, today } from "@/lib/dates";
import { money, periodLabel, rentalCode, unitMoney } from "@/lib/format";
import { getCompany, rentalInclude, withCalc } from "@/lib/rentals";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await db.rental.findUnique({ where: { quoteToken: token }, select: { number: true, stage: true } });
  return { title: r ? `${r.stage === "ORCAMENTO" ? "Orçamento" : "Locação"} ${rentalCode(r.number)}` : "Orçamento", robots: { index: false } };
}

export default async function OrcamentoPublico({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = await db.rental.findUnique({ where: { quoteToken: token }, include: rentalInclude });
  if (!raw || raw.stage === "CANCELADA") notFound();
  const r = withCalc(raw);
  const company = await getCompany();
  const c = r.calc;
  const isQuote = r.stage === "ORCAMENTO";
  const notes = company.quoteNotes.split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="min-h-dvh bg-slate-100 py-4 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-3 flex max-w-3xl justify-end gap-2 px-4">
        <PrintButton />
      </div>
      <article className="mx-auto max-w-3xl bg-white text-[13px] shadow-sm print:max-w-none print:shadow-none">
        <header className="bg-[#1f3a5f] px-6 py-5 text-white">
          <div className="text-xs font-semibold uppercase tracking-[.2em] text-white/70">{isQuote ? "Orçamento" : "Locação"} {rentalCode(r.number)}</div>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-black tracking-tight">{company.name}</h1>
              <p className="text-sm text-white/80">{company.subtitle}</p>
            </div>
            <p className="text-right text-xs text-white/80">
              {[company.location, company.instagram, company.phone].filter(Boolean).join(" • ")}
            </p>
          </div>
        </header>
        <div className="h-1 bg-[#d9a520]" />

        <section className="grid grid-cols-2 gap-x-6 gap-y-2 px-6 py-4 sm:grid-cols-4">
          <Field label="Cliente" className="col-span-2">{r.customer.name}</Field>
          <Field label="Telefone">{r.customer.phone || "—"}</Field>
          <Field label="Data">{fmtDate(today())}</Field>
          <Field label="Endereço da obra" className="col-span-2 sm:col-span-4">{r.siteAddress || "—"}</Field>
        </section>

        <section className="px-6">
          <h2 className="bg-[#1f3a5f] px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">Itens do orçamento</h2>
          <ul className="divide-y divide-slate-200 sm:hidden print:hidden">
            {r.items.map((it, idx) => {
              const ic = c.items[idx];
              return (
                <li key={it.id} className="py-2.5">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold">{it.qty}× {it.equipment.name}</span>
                    <span className="font-semibold tnum">{money(ic.total)}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 tnum">
                    {unitMoney(Number(it.unitPrice))}/dia · {periodLabel(it.period)} · {fmtDate(r.startDate)} a {fmtDate(r.expectedEndDate)}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto sm:block print:block">
            <table className="w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="bg-[#2c4f7c] text-[10px] uppercase text-white">
                  <th className="px-2 py-1.5 text-left">Equipamento</th>
                  <th className="px-2 py-1.5 text-right">Qtd.</th>
                  <th className="px-2 py-1.5 text-right">Valor unit./dia</th>
                  <th className="px-2 py-1.5">Período</th>
                  <th className="px-2 py-1.5">Início</th>
                  <th className="px-2 py-1.5">Término</th>
                  <th className="px-2 py-1.5 text-right">Dias</th>
                  <th className="px-2 py-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {r.items.map((it, idx) => {
                  const ic = c.items[idx];
                  const returnDays = it.returns.map((x) => x.chargedDays ?? inclusiveDays(r.startDate, x.date));
                  const allDays = [...returnDays, ...(ic.outstandingQty > 0 ? [ic.outstandingDays] : [])];
                  const daysText = allDays.length && allDays.every((d) => d === allDays[0]) ? String(allDays[0]) : allDays.join(" / ");
                  const lastReturn = it.returns.at(-1)?.date;
                  const end = ic.outstandingQty > 0 ? r.expectedEndDate : lastReturn ?? r.expectedEndDate;
                  return (
                    <tr key={it.id} className="border-b border-slate-200 odd:bg-slate-50">
                      <td className="px-2 py-1.5 font-medium">{it.equipment.name}</td>
                      <td className="px-2 py-1.5 text-right">{it.qty}</td>
                      <td className="px-2 py-1.5 text-right">{unitMoney(Number(it.unitPrice))}</td>
                      <td className="px-2 py-1.5 text-center">{periodLabel(it.period)}</td>
                      <td className="px-2 py-1.5 text-center">{fmtDate(r.startDate)}</td>
                      <td className="px-2 py-1.5 text-center">{fmtDate(end)}</td>
                      <td className="px-2 py-1.5 text-right">{daysText}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{money(ic.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex justify-end px-6 py-4">
          <dl className="w-full max-w-xs overflow-hidden rounded text-[12px] ring-1 ring-[#1f3a5f]/20">
            <Total label="Subtotal dos itens" value={money(c.itemsTotal)} />
            {r.extras.map((e) => <Total key={e.id} label={e.description} value={money(Number(e.amount))} />)}
            {c.discount > 0 && <Total label="Desconto" value={`− ${money(c.discount)}`} />}
            <div className="flex justify-between bg-[#1f3a5f] px-3 py-2 text-sm font-bold text-white">
              <dt>TOTAL GERAL</dt>
              <dd className="tnum">{money(c.total)}</dd>
            </div>
            {c.paid > 0 && (
              <>
                <Total label="Pago" value={money(c.paid)} />
                <Total label="Em aberto" value={money(Math.max(0, c.open))} strong />
              </>
            )}
          </dl>
        </section>

        <section className="px-6 pb-5">
          <h2 className="bg-[#1f3a5f] px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-white">Observações</h2>
          <div className="grid gap-4 py-3 sm:grid-cols-[220px_1fr]">
            {(company.pixKey || company.pixName || company.pixBank) && (
              <div className="rounded bg-[#1f3a5f] px-3 py-2 text-[12px] text-white">
                {company.pixKey && <div>Chave Pix: <strong>{company.pixKey}</strong></div>}
                {company.pixName && <div>Favorecido: {company.pixName}</div>}
                {company.pixBank && <div>Banco: {company.pixBank}</div>}
              </div>
            )}
            <ul className="space-y-1 text-[12px] text-slate-700">
              {notes.map((n) => <li key={n}>• {n}</li>)}
            </ul>
          </div>
          {company.footer && <p className="pt-2 text-center text-[12px] italic text-slate-500">{company.footer}</p>}
        </section>
      </article>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-[#1f3a5f]">{label}</div>
      <div className="border-b border-slate-200 pb-1 font-medium">{children}</div>
    </div>
  );
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between border-b border-slate-100 px-3 py-1.5">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`tnum ${strong ? "font-bold text-red-700" : ""}`}>{value}</dd>
    </div>
  );
}
