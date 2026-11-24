import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fmtDate, today } from "@/lib/dates";
import { reaisPorExtenso } from "@/lib/extenso";
import { money, periodLabel, rentalCode, unitMoney } from "@/lib/format";
import { getCompany, rentalInclude, withCalc } from "@/lib/rentals";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

/** Tipo do documento conforme a situação da locação. */
function docTitle(stage: string, paid: number) {
  if (stage === "ORCAMENTO") return "Orçamento de Locação";
  return paid > 0 ? "Recibo de Locação" : "Comprovante de Locação";
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await db.rental.findUnique({ where: { quoteToken: token }, select: { number: true, stage: true, payments: { select: { id: true } } } });
  if (!r) return { title: "Documento", robots: { index: false } };
  return { title: `${docTitle(r.stage, r.payments.length)} ${rentalCode(r.number)}`, robots: { index: false } };
}

// Documento formal em A4: preto e cinza, sem fundos coloridos; só a logo tem cor.
const PRINT_CSS = `
@page { size: A4; margin: 14mm 14mm 16mm; }
@media print {
  html, body { background: #fff !important; }
  .doc, .doc * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc tr, .doc .avoid-break { break-inside: avoid; }
}
`;

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const porExtensoData = (d: Date) => `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;

export default async function DocumentoLocacao({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = await db.rental.findUnique({ where: { quoteToken: token }, include: rentalInclude });
  if (!raw || raw.stage === "CANCELADA") notFound();
  const r = withCalc(raw);
  const company = await getCompany();
  const c = r.calc;
  const isQuote = r.stage === "ORCAMENTO";
  const title = docTitle(r.stage, c.paid);
  const emitted = today();
  const notes = company.quoteNotes.split("\n").map((s) => s.trim()).filter(Boolean);
  const hasPix = !!(company.pixKey || company.pixName || company.pixBank);
  const city = company.location || "";
  const contacts = [company.location, company.phone, company.instagram].filter(Boolean);

  return (
    <div className="min-h-dvh bg-neutral-200/70 px-3 py-4 sm:px-6 sm:py-8 print:bg-white print:p-0">
      <style>{PRINT_CSS}</style>
      <div className="no-print mx-auto mb-3 flex max-w-[210mm] items-center justify-between gap-2">
        <span className="text-xs font-medium text-neutral-500">
          {title} · {rentalCode(r.number)}
        </span>
        <PrintButton />
      </div>

      <article className="doc mx-auto max-w-[210mm] bg-white px-5 py-7 text-[12.5px] leading-relaxed text-neutral-800 shadow-[0_2px_24px_rgb(0_0_0/.12)] sm:px-12 sm:py-12 print:max-w-none print:p-0 print:shadow-none">
        {/* CABEÇALHO */}
        <header className="flex flex-col gap-5 border-b-2 border-neutral-900 pb-5 sm:flex-row sm:items-start sm:justify-between print:flex-row print:items-start print:justify-between">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-doc.jpg" alt={company.name} width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-md object-cover" />
            <div className="min-w-0">
              <div className="text-[17px] leading-tight font-bold tracking-tight text-neutral-950 uppercase">{company.name}</div>
              {company.subtitle && <div className="mt-0.5 text-[11.5px] text-neutral-600">{company.subtitle}</div>}
              {contacts.length > 0 && <div className="mt-1 text-[11.5px] text-neutral-600">{contacts.join(" · ")}</div>}
            </div>
          </div>
          <div className="shrink-0 sm:text-right print:text-right">
            <div className="text-[15px] font-bold tracking-wide text-neutral-950 uppercase">{title}</div>
            <table className="mt-1.5 text-[11.5px] sm:ml-auto print:ml-auto">
              <tbody>
                <tr>
                  <td className="pr-3 text-neutral-500">Nº</td>
                  <td className="tnum text-right font-semibold text-neutral-900">{rentalCode(r.number)}</td>
                </tr>
                <tr>
                  <td className="pr-3 text-neutral-500">Emissão</td>
                  <td className="tnum text-right text-neutral-900">{fmtDate(emitted)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </header>

        {/* LOCATÁRIO */}
        <section className="avoid-break mt-6">
          <SectionTitle>{isQuote ? "Dados do cliente" : "Dados do locatário"}</SectionTitle>
          <table className="w-full border-collapse border border-neutral-300 text-[12px]">
            <tbody>
              <InfoRow cells={[["Nome / Razão social", r.customer.name]]} />
              <InfoRow cells={[["Telefone", r.customer.phone || "—"], ...(r.customer.responsible ? [["Responsável", r.customer.responsible] as [string, string]] : [])]} />
              <InfoRow cells={[["Endereço da obra", r.siteAddress || "—"]]} />
              <InfoRow cells={[["Retirada", fmtDate(r.startDate)], ["Previsão de devolução", r.expectedEndDate ? fmtDate(r.expectedEndDate) : "—"]]} />
            </tbody>
          </table>
        </section>

        {/* EQUIPAMENTOS */}
        <section className="mt-6">
          <SectionTitle>{isQuote ? "Equipamentos orçados" : "Equipamentos locados"}</SectionTitle>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[560px] border-collapse text-[11.5px] print:min-w-0">
              <thead>
                <tr className="border-y border-neutral-900 text-left text-[10.5px] font-semibold tracking-wide text-neutral-700 uppercase">
                  <th className="py-2 pr-2 font-semibold">Item</th>
                  <th className="px-2 py-2 font-semibold">Descrição</th>
                  <th className="px-2 py-2 text-right font-semibold">Qtd.</th>
                  <th className="px-2 py-2 text-right font-semibold">Valor/dia</th>
                  <th className="px-2 py-2 text-center font-semibold">Retirada</th>
                  <th className="px-2 py-2 text-center font-semibold">{isQuote ? "Término" : "Devolução"}</th>
                  <th className="px-2 py-2 text-right font-semibold">Dias</th>
                  <th className="py-2 pl-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {r.items.map((it, idx) => {
                  const ic = c.items[idx];
                  const allDays = [...ic.returnDays, ...(ic.outstandingQty > 0 ? [ic.outstandingDays] : [])];
                  const daysText = allDays.length && allDays.every((d) => d === allDays[0]) ? String(allDays[0]) : allDays.join(" / ");
                  const lastReturn = it.returns.at(-1)?.date;
                  const end = ic.outstandingQty > 0 ? ic.expectedEndDate : (lastReturn ?? ic.expectedEndDate);
                  const pending = !isQuote && ic.outstandingQty > 0;
                  return (
                    <tr key={it.id} className="border-b border-neutral-200 align-top">
                      <td className="py-2 pr-2 text-neutral-500">{String(idx + 1).padStart(2, "0")}</td>
                      <td className="px-2 py-2 text-neutral-900">
                        <span className="font-medium">{it.equipment.name}</span>
                        <span className="block text-[10.5px] text-neutral-500">
                          {periodLabel(it.period)}
                          {ic.addition ? " · acréscimo" : ""}
                          {pending ? ` · ${ic.outstandingQty} na obra` : ""}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">{it.qty}</td>
                      <td className="px-2 py-2 text-right">{unitMoney(Number(it.unitPrice))}</td>
                      <td className="px-2 py-2 text-center">{fmtDate(ic.startDate)}</td>
                      <td className="px-2 py-2 text-center">
                        {fmtDate(end)}
                        {pending && <span className="block text-[10px] text-neutral-500">previsão</span>}
                      </td>
                      <td className="px-2 py-2 text-right">{daysText}</td>
                      <td className="py-2 pl-2 text-right font-medium text-neutral-900">{money(ic.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* TOTAIS */}
          <div className="avoid-break mt-3 flex justify-end">
            <table className="tnum w-full max-w-[300px] text-[12px]">
              <tbody>
                <TotalRow label="Subtotal dos equipamentos" value={money(c.itemsTotal)} />
                {r.extras.map((e) => (
                  <TotalRow key={e.id} label={e.description} value={money(Number(e.amount))} />
                ))}
                {c.discount > 0 && <TotalRow label="Desconto" value={`− ${money(c.discount)}`} />}
                <tr className="border-t-2 border-neutral-900">
                  <td className="py-2 font-bold text-neutral-950 uppercase">Total</td>
                  <td className="py-2 text-right text-[14px] font-bold text-neutral-950">{money(c.total)}</td>
                </tr>
                {!isQuote && c.paid > 0 && (
                  <>
                    <TotalRow label="Valor pago" value={money(c.paid)} />
                    <TotalRow label="Saldo a pagar" value={money(Math.max(0, c.open))} bold />
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* PAGAMENTOS RECEBIDOS */}
        {!isQuote && r.payments.length > 0 && (
          <section className="avoid-break mt-6">
            <SectionTitle>Pagamentos recebidos</SectionTitle>
            <table className="tnum w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="border-y border-neutral-900 text-left text-[10.5px] tracking-wide text-neutral-700 uppercase">
                  <th className="py-1.5 pr-2 font-semibold">Data</th>
                  <th className="px-2 py-1.5 font-semibold">Forma</th>
                  <th className="px-2 py-1.5 font-semibold">Observação</th>
                  <th className="py-1.5 pl-2 text-right font-semibold">Valor</th>
                </tr>
              </thead>
              <tbody>
                {r.payments.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-200">
                    <td className="py-1.5 pr-2">{fmtDate(p.date)}</td>
                    <td className="px-2 py-1.5">{p.method || "—"}</td>
                    <td className="px-2 py-1.5 text-neutral-600">{p.note || ""}</td>
                    <td className="py-1.5 pl-2 text-right font-medium text-neutral-900">{money(Number(p.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* DECLARAÇÃO */}
        <section className="avoid-break mt-6 border border-neutral-300 px-4 py-3.5 text-[12.5px] leading-relaxed text-neutral-800">
          {isQuote ? (
            <p>
              Apresentamos o orçamento para locação dos equipamentos acima relacionados, no valor total de{" "}
              <strong className="tnum">{money(c.total)}</strong> ({reaisPorExtenso(c.total)}), conforme as condições abaixo.
            </p>
          ) : c.paid > 0 ? (
            <p>
              Recebemos de <strong>{r.customer.name}</strong> a importância de <strong className="tnum">{money(c.paid)}</strong> ({reaisPorExtenso(c.paid)}),
              referente à locação dos equipamentos acima relacionados{r.siteAddress ? `, para a obra situada em ${r.siteAddress}` : ""}.
              {c.open > 0.009 ? (
                <>
                  {" "}
                  Resta o saldo de <strong className="tnum">{money(c.open)}</strong> ({reaisPorExtenso(c.open)}).
                </>
              ) : (
                " Dando plena e geral quitação do valor acima."
              )}
            </p>
          ) : (
            <p>
              Declaramos a locação a <strong>{r.customer.name}</strong> dos equipamentos acima relacionados
              {r.siteAddress ? `, para a obra situada em ${r.siteAddress}` : ""}, no valor de <strong className="tnum">{money(c.total)}</strong> (
              {reaisPorExtenso(c.total)}), até a data desta emissão.
            </p>
          )}
        </section>

        {/* CONDIÇÕES E PAGAMENTO */}
        {(notes.length > 0 || hasPix) && (
          <section className="avoid-break mt-6 grid gap-6 sm:grid-cols-[1fr_auto] print:grid-cols-[1fr_auto]">
            {notes.length > 0 && (
              <div>
                <SectionTitle>Condições gerais</SectionTitle>
                <ol className="list-decimal space-y-1 pl-5 text-[11.5px] text-neutral-700 marker:text-neutral-500">
                  {notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ol>
              </div>
            )}
            {hasPix && (
              <div className="min-w-[210px]">
                <SectionTitle>Dados para pagamento</SectionTitle>
                <dl className="space-y-0.5 text-[11.5px]">
                  {company.pixKey && (
                    <div>
                      <dt className="inline text-neutral-500">Chave Pix: </dt>
                      <dd className="tnum inline font-medium break-all text-neutral-900">{company.pixKey}</dd>
                    </div>
                  )}
                  {company.pixName && (
                    <div>
                      <dt className="inline text-neutral-500">Favorecido: </dt>
                      <dd className="inline text-neutral-900">{company.pixName}</dd>
                    </div>
                  )}
                  {company.pixBank && (
                    <div>
                      <dt className="inline text-neutral-500">Banco: </dt>
                      <dd className="inline text-neutral-900">{company.pixBank}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </section>
        )}

        {/* LOCAL, DATA E ASSINATURAS */}
        <section className="avoid-break mt-10">
          <p className="text-[12.5px] text-neutral-800">
            {city ? `${city}, ` : ""}
            {porExtensoData(emitted)}.
          </p>
          <div className="mt-14 grid gap-12 sm:grid-cols-2 print:grid-cols-2">
            <Signature name={company.name} role={isQuote ? "Locadora" : "Locadora (emitente)"} />
            <Signature name={r.customer.name} role={isQuote ? "Cliente — de acordo" : "Locatário"} />
          </div>
        </section>

        {company.footer && <p className="mt-10 border-t border-neutral-200 pt-3 text-center text-[10.5px] text-neutral-400 italic">{company.footer}</p>}
      </article>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-[11px] font-bold tracking-[0.12em] text-neutral-900 uppercase">{children}</h2>;
}

/** Linha do quadro de dados: 1 célula ocupa a largura toda; 2 células dividem ao meio. */
function InfoRow({ cells }: { cells: [string, string][] }) {
  return (
    <tr className="border-b border-neutral-300 last:border-b-0">
      {cells.map(([label, value], i) => (
        <td key={label} colSpan={cells.length === 1 ? 2 : 1} className={`w-1/2 px-3 py-1.5 align-top ${i > 0 ? "border-l border-neutral-300" : ""}`}>
          <div className="text-[10px] font-semibold tracking-wide text-neutral-500 uppercase">{label}</div>
          <div className="font-medium break-words text-neutral-900">{value}</div>
        </td>
      ))}
    </tr>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <tr className="border-b border-neutral-200">
      <td className={`py-1.5 pr-3 ${bold ? "font-bold text-neutral-950" : "text-neutral-600"}`}>{label}</td>
      <td className={`py-1.5 text-right ${bold ? "font-bold text-neutral-950" : "text-neutral-900"}`}>{value}</td>
    </tr>
  );
}

function Signature({ name, role }: { name: string; role: string }) {
  return (
    <div className="text-center">
      <div className="border-t border-neutral-900 pt-1.5 text-[12px] font-semibold text-neutral-900">{name}</div>
      <div className="text-[10.5px] text-neutral-500">{role}</div>
    </div>
  );
}
