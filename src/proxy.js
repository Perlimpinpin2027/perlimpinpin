import { NextResponse } from "next/server";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";

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
    return NextResponse.redirect(new URL("/live/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/live", "/live/:path*"],
};
