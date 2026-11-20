import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type SessionData } from "./session";

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}

/** Use no começo de toda server action. */
export async function requireUser(): Promise<SessionData> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
