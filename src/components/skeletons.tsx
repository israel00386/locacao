// Esqueletos (shimmer) usados pelos loading.tsx enquanto a tela carrega.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div className="space-y-2">
        <Bar className="h-7 w-40" />
        <Bar className="h-4 w-56 max-w-[60vw]" />
      </div>
      {action && <Bar className="h-11 w-32 rounded-xl" />}
    </div>
  );
}

export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={`mb-6 grid gap-3 ${count === 3 ? "grid-cols-3" : "grid-cols-2"} ${count === 4 ? "lg:grid-cols-4" : ""}`}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card space-y-2.5 p-4">
          <Bar className="h-3 w-2/3" />
          <Bar className="h-6 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5, title = false }: { rows?: number; title?: boolean }) {
  return (
    <div className="card overflow-hidden">
      {title && (
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3.5">
          <Bar className="h-4 w-40" />
        </div>
      )}
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="space-y-2.5 px-4 py-3.5">
            <div className="flex justify-between gap-4">
              <Bar className="h-4 w-1/2" />
              <Bar className="h-4 w-20" />
            </div>
            <Bar className="h-3 w-3/4" />
            <div className="flex gap-2">
              <Bar className="h-5 w-16 rounded-full" />
              <Bar className="h-5 w-14 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TabsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="mb-3 flex gap-1.5 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <Bar key={i} className="h-9 w-24 shrink-0 rounded-full" />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card space-y-3 p-4">
            <Bar className="h-4 w-1/3" />
            <Bar className="h-3 w-2/3" />
            <Bar className="h-3 w-1/2" />
          </div>
          <ListSkeleton rows={3} title />
        </div>
        <div className="space-y-4">
          <div className="card space-y-3 p-4">
            <Bar className="h-4 w-1/2" />
            <Bar className="h-8 w-2/3" />
            <Bar className="h-11 w-full rounded-xl" />
          </div>
          <ListSkeleton rows={2} title />
        </div>
      </div>
    </>
  );
}

export function Loading({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Carregando…</span>
      {children}
    </div>
  );
}
