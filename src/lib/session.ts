// Sessão assinada (JWT em cookie). Funciona no middleware (edge) e no servidor.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "locacao_sessao";
const MAX_AGE_DAYS = 30;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET não configurado (mínimo 16 caracteres).");
  return new TextEncoder().encode(s);
}

export interface SessionData {
  userId: string;
  name: string;
}

export async function signSession(data: SessionData): Promise<string> {
  return new SignJWT({ name: data.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(data.userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    return { userId: payload.sub, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_DAYS * 86400;
