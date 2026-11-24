// Logo da LOCAR Equipamentos, redesenhado em vetor a partir de public/brand/logo-original.jpg:
// um "R" amarelo cuja haste é um andaime (montantes, travessas e diagonais em X).
// As linhas do andaime são traços (stroke) para poderem ser "montadas" na animação do splash.

const SCAFFOLD_LINES: Array<[number, number, number, number]> = [
  // montantes
  [47, 22, 47, 334],
  [117, 22, 117, 252],
  // travessas
  [20, 46, 176, 46],
  [20, 119, 117, 119],
  [20, 190, 117, 190],
  [20, 259, 108, 259],
  // diagonais em X
  [47, 46, 117, 119],
  [117, 46, 47, 119],
  [47, 119, 117, 190],
  [117, 119, 47, 190],
  [47, 190, 117, 255],
  [117, 190, 47, 255],
  [117, 46, 146, 76],
  [47, 259, 84, 296],
  // perna esquerda do "Λ" que sobe até o R
  [36, 334, 170, 196],
];

/** Contorno do R (barriga + perna), aberto à esquerda: o andaime faz a haste. */
const R_PATH =
  "M118 104 L176 40 H298 C360 40 398 80 398 130 C398 188 374 238 336 266 L392 334 H326 L192 194 L270 212 C308 212 332 190 332 152 C332 116 318 97 298 97 H149 L120 128 Z";
/** Faixa diagonal entre o andaime e a perna do R. */
const BAND_PATH = "M166 194 L180 191 L296 334 L268 334 Z";

export function LogoMark({ className = "h-10 w-auto", title = "LOCAR Equipamentos" }: { className?: string; title?: string | null }) {
  return (
    <svg viewBox="12 14 396 328" className={`logo-mark text-accent-400 ${className}`} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title ?? undefined}>
      <g className="logo-scaffold" stroke="currentColor" strokeWidth={9} strokeLinecap="round" fill="none">
        {SCAFFOLD_LINES.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} style={{ ["--i" as string]: i }} />
        ))}
      </g>
      <g className="logo-r" fill="currentColor">
        <path d={R_PATH} />
        <path d={BAND_PATH} />
      </g>
    </svg>
  );
}

/** Marca + "LOCAR / EQUIPAMENTOS". `stacked` = símbolo em cima (login/splash); `inline` = lado a lado (barra lateral/topo). */
export function Logo({
  variant = "inline",
  className = "",
  markClassName,
  tone = "light",
}: {
  variant?: "inline" | "stacked";
  className?: string;
  markClassName?: string;
  /** light = texto branco (fundo marinho); dark = texto marinho (fundo claro). */
  tone?: "light" | "dark";
}) {
  const text = tone === "light" ? "text-white" : "text-brand-900";
  const sub = tone === "light" ? "text-white/75" : "text-brand-700";
  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center ${className}`} role="img" aria-label="LOCAR Equipamentos">
        <LogoMark className={markClassName ?? "h-24 w-auto"} title={null} />
        <div className={`logo-word mt-3 text-[2.1rem] leading-none font-black tracking-tight ${text}`}>LOCAR</div>
        <div className={`logo-sub mt-1.5 pl-[.42em] text-[.72rem] font-semibold tracking-[.42em] ${sub}`}>EQUIPAMENTOS</div>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-2.5 ${className}`} role="img" aria-label="LOCAR Equipamentos">
      <LogoMark className={markClassName ?? "h-9 w-auto"} title={null} />
      <div className="leading-none">
        <div className={`text-[1.2rem] font-black tracking-tight ${text}`}>LOCAR</div>
        <div className={`mt-1 text-[.56rem] font-semibold tracking-[.3em] ${sub}`}>EQUIPAMENTOS</div>
      </div>
    </div>
  );
}
