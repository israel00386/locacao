"use server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession } from "@/lib/session";

export interface LoginState {
  error?: string;
}

async function startSession(userId: string, name: string) {
  const token = await signSession({ userId, name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }
  await startSession(user.id, user.name);
  redirect("/");
}

/** Só funciona enquanto não existe nenhum usuário (primeiro acesso). */
export async function setupFirstUser(_: LoginState, form: FormData): Promise<LoginState> {
  if ((await db.user.count()) > 0) return { error: "O primeiro acesso já foi criado. Faça login." };
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email.includes("@")) return { error: "Preencha nome e e-mail." };
  if (password.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };
  const user = await db.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10) } });
  await startSession(user.id, user.name);
  redirect("/");
}
