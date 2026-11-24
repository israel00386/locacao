import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Rotas abertas: login e a página pública do orçamento enviada ao cliente.
const PUBLIC = [/^\/login/, /^\/o\//];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Não roda em arquivos estáticos (qualquer caminho com extensão: .png, .jpg, .js, .webmanifest…) nem em /_next.
  matcher: ["/((?!_next/|.*\\.[a-zA-Z0-9]+$).*)"],
};
