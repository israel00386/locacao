"use client";
import { useActionState } from "react";
import { login, setupFirstUser, type LoginState } from "./actions";

export function LoginForm({ setup }: { setup: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(setup ? setupFirstUser : login, {});
  return (
    <form action={action} className="space-y-3">
      {setup && (
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <input id="name" name="name" className="input" required autoComplete="name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">E-mail</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" inputMode="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" className="input" required autoComplete={setup ? "new-password" : "current-password"} minLength={setup ? 6 : undefined} />
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Entrando…" : setup ? "Criar acesso e entrar" : "Entrar"}
      </button>
    </form>
  );
}
