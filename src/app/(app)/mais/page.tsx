import { Boxes, ClipboardList, FileSpreadsheet, LogOut, Settings, Users, Wallet } from "lucide-react";
import { Avatar, IconBox, ListRow, type IconTone } from "@/components/ui";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Mais" };

const groups: { label: string; items: { href: string; label: string; desc: string; icon: React.ReactNode; tone: IconTone }[] }[] = [
  {
    label: "Cadastros",
    items: [
      { href: "/clientes", label: "Clientes", desc: "Cadastro, obras e histórico", icon: <Users />, tone: "brand" },
      { href: "/estoque", label: "Estoque", desc: "Equipamentos, disponível e manutenção", icon: <Boxes />, tone: "sky" },
      { href: "/locacoes", label: "Locações", desc: "Na obra, orçamentos e encerradas", icon: <ClipboardList />, tone: "accent" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/financeiro", label: "Financeiro", desc: "A receber, pagamentos e despesas", icon: <Wallet />, tone: "green" },
      { href: "/config", label: "Configurações", desc: "Empresa, orçamento, usuários e senha", icon: <Settings />, tone: "slate" },
      { href: "/config/importar", label: "Importar planilha", desc: "Trazer dados do Google Sheets", icon: <FileSpreadsheet />, tone: "slate" },
    ],
  },
];

export default async function MaisPage() {
  const session = await getSession();
  const name = session?.name ?? "Usuário";
  return (
    <>
      <h1 className="sr-only">Mais</h1>
      <div className="card mb-6 flex items-center gap-4 p-5">
        <Avatar name={name} size="lg" tone="navy" />
        <div className="min-w-0 flex-1">
          <div className="micro text-slate-400">Conectado como</div>
          <div className="truncate text-lg font-bold tracking-[-0.01em] text-brand-950">{name}</div>
          <div className="text-[13px] text-slate-500">LOCAR Equipamentos</div>
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <section key={g.label}>
            <h2 className="micro mb-2.5 px-1 text-slate-500">{g.label}</h2>
            <div className="card stagger divide-y divide-slate-100 overflow-hidden">
              {g.items.map((i) => (
                <ListRow key={i.href} href={i.href} leading={<IconBox tone={i.tone}>{i.icon}</IconBox>} title={i.label} subtitle={i.desc} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <form action="/login/sair" method="post" className="mt-6">
        <button className="btn-danger w-full">
          <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden /> Sair da conta
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-400">LOCAR Equipamentos · Pacatuba-CE</p>
    </>
  );
}
