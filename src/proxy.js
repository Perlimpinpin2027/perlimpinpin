import { NextResponse } from "next/server";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import { loginUrl } from "@/lib/live-redirect";

// Next 16 : la convention `middleware` est renommée `proxy` (Node.js runtime
// par défaut, donc node:crypto disponible dans live-session.js).
// Protège tout /live sauf /live/login ; la page /live revérifie elle-même la
// session (défense en profondeur).
export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/live/login" || pathname.startsWith("/live/login/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) {
    // Mémorise la page demandée pour y revenir après connexion (voir
    // src/lib/live-redirect.js : seules les pages internes de /live sont suivies).
    const wanted = new URL(request.nextUrl);
    wanted.searchParams.delete("_rsc"); // paramètre interne des navigations client
    return NextResponse.redirect(new URL(loginUrl(wanted.pathname + wanted.search), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/live", "/live/:path*"],
};
