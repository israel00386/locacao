import Link from "next/link";
import { Boxes, ChevronRight, ClipboardList, FileSpreadsheet, LogOut, Settings, Users, Wallet } from "lucide-react";
import { Avatar, SectionTitle, TopBar } from "@/components/ui";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Mais" };

type Item = { href: string; label: string; desc: string; icon: React.ReactNode; grad: string };

// Ícones com degradê vivo (estilo "Explore" da referência).
const groups: { label: string; items: Item[] }[] = [
  {
    label: "Explorar",
    items: [
      { href: "/clientes", label: "Clientes", desc: "Cadastro, obras e histórico", icon: <Users />, grad: "from-indigo-400 to-brand-600" },
      { href: "/financeiro", label: "Financeiro", desc: "A receber, pagamentos e despesas", icon: <Wallet />, grad: "from-emerald-400 to-teal-600" },
      { href: "/locacoes", label: "Locações", desc: "Na obra, orçamentos e encerradas", icon: <ClipboardList />, grad: "from-accent-300 to-orange-500" },
      { href: "/estoque", label: "Estoque", desc: "Equipamentos, disponível e manutenção", icon: <Boxes />, grad: "from-sky-400 to-blue-600" },
    ],
  },
  {
    label: "Conta e dados",
    items: [
      { href: "/config", label: "Configurações", desc: "Empresa, orçamento, usuários e senha", icon: <Settings />, grad: "from-slate-400 to-slate-600" },
      { href: "/config/importar", label: "Importar planilha", desc: "Trazer dados do Google Sheets", icon: <FileSpreadsheet />, grad: "from-green-400 to-emerald-600" },
    ],
  },
];

function ExploreRow({ item }: { item: Item }) {
  return (
    <Link href={item.href} className="card tap group flex min-h-[4.5rem] min-w-0 items-center gap-4 px-4 py-3.5 hover:bg-slate-50/60 sm:px-5">
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgb(255_255_255/.35)] [&>svg]:h-[22px] [&>svg]:w-[22px] [&>svg]:stroke-[2] ${item.grad}`}
        aria-hidden
      >
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-brand-950">{item.label}</span>
        <span className="mt-0.5 block truncate text-[13px] text-slate-500">{item.desc}</span>
      </span>
      <ChevronRight className="tap-chevron h-5 w-5 shrink-0 text-slate-300" strokeWidth={2} aria-hidden />
    </Link>
  );
}

export default async function MaisPage() {
  const session = await getSession();
  const name = session?.name ?? "Usuário";
  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="Mais" />

      <section className="card-navy on-navy relative isolate mb-7 flex items-center gap-4 overflow-hidden p-5 sm:p-6">
        <span className="pointer-events-none absolute -top-16 -right-10 -z-10 h-44 w-44 rounded-full border-[26px] border-white/[.05]" aria-hidden />
        <Avatar name={name} size="lg" tone="accent" className="ring-4 ring-white/10" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-white/60">Conectado como</div>
          <div className="truncate text-xl font-bold tracking-[-0.01em]">{name}</div>
          <div className="text-[13px] text-white/60">LOCAR Equipamentos</div>
        </div>
      </section>

      <div className="space-y-7">
        {groups.map((g) => (
          <section key={g.label}>
            <SectionTitle title={g.label} />
            <div className="stagger grid gap-2.5 md:grid-cols-2">
              {g.items.map((i) => (
                <ExploreRow key={i.href} item={i} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <form action="/login/sair" method="post" className="mt-8">
        <button className="btn-danger w-full">
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden /> Sair da conta
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-400">LOCAR Equipamentos · Pacatuba-CE</p>
    </div>
  );
}
