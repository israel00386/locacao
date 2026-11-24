"use client";
import { usePathname } from "next/navigation";

/**
 * Anima a entrada de cada tela (fade + leve subida, .page-enter em globals.css).
 * Obs.: não usar loading.tsx nas rotas (app): com ele, a tela às vezes ficava presa em
 * "Aguarde…" depois de ações do servidor (ex.: Confirmar locação). A barra de progresso
 * do topo (NavProgress) já indica o carregamento.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
