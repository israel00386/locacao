import Link from "next/link";
import { Icon } from "@/components/nav";
import { PageHeader } from "@/components/ui";

const items = [
  { href: "/clientes", label: "Clientes", icon: "users" as const, desc: "Cadastro, obras e histórico" },
  { href: "/financeiro", label: "Financeiro", icon: "money" as const, desc: "A receber e pagamentos" },
  { href: "/config", label: "Configurações", icon: "gear" as const, desc: "Empresa, orçamento, usuários e importação" },
];

export default function MaisPage() {
  return (
    <>
      <PageHeader title="Mais" />
      <div className="card stagger divide-y divide-slate-100 overflow-hidden">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="tap flex min-h-16 items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-900 text-accent-400">
              <Icon name={i.icon} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{i.label}</span>
              <span className="block text-xs text-slate-500">{i.desc}</span>
            </span>
          </Link>
        ))}
      </div>
      <form action="/login/sair" method="post" className="mt-4">
        <button className="btn-secondary w-full">Sair</button>
      </form>
    </>
  );
}
