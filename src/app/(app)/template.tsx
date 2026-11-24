/** Recriado a cada troca de tela: anima a entrada (fade + leve subida) via CSS (.page-enter em globals.css). */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
