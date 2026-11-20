"use client";
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-primary">
      Salvar PDF / Imprimir
    </button>
  );
}
