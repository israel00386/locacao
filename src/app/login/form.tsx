"use client";
import { useActionState, useState } from "react";
import { ArrowRight, CircleAlert, Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { login, setupFirstUser, type LoginState } from "./actions";

const iconCls = "pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-slate-400";

export function LoginForm({ setup }: { setup: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(setup ? setupFirstUser : login, {});
  const [show, setShow] = useState(false);
  return (
    <form action={action} className="space-y-4">
      {setup && (
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <div className="relative">
            <User className={iconCls} strokeWidth={1.9} aria-hidden />
            <input id="name" name="name" className="input pl-11" required autoComplete="name" />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <div className="relative">
          <Mail className={iconCls} strokeWidth={1.9} aria-hidden />
          <input id="email" name="email" type="email" className="input pl-11" required autoComplete="email" inputMode="email" placeholder="voce@empresa.com" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <div className="relative">
          <Lock className={iconCls} strokeWidth={1.9} aria-hidden />
          <input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            className="input pr-12 pl-11"
            required
            autoComplete={setup ? "new-password" : "current-password"}
            minLength={setup ? 6 : undefined}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute top-1/2 right-1.5 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={show ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />}
          </button>
        </div>
      </div>
      {state.error && (
        <p className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800 ring-1 ring-red-200 ring-inset" role="alert">
          <CircleAlert className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden /> {state.error}
        </p>
      )}
      <button className="btn-accent btn-lg mt-2 w-full" disabled={pending}>
        {pending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : null}
        {pending ? "Entrando…" : setup ? "Criar acesso e entrar" : "Entrar"}
        {!pending && <ArrowRight className="h-5 w-5" strokeWidth={2.2} aria-hidden />}
      </button>
    </form>
  );
}
