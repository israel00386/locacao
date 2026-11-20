import { db } from "@/lib/db";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const setup = (await db.user.count()) === 0;
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-black text-white shadow">L</div>
          <h1 className="text-xl font-bold">Locação de Equipamentos</h1>
          <p className="text-sm text-slate-500">{setup ? "Primeiro acesso: crie o usuário do dono" : "Entre para continuar"}</p>
        </div>
        <div className="card p-5">
          <LoginForm setup={setup} />
        </div>
      </div>
    </div>
  );
}
