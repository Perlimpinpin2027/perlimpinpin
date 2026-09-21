import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { LIVE_COOKIE_NAME } from "@/lib/live-auth-config";
import { loginUrl } from "@/lib/live-redirect";

// Next 16 : la convention `middleware` est renommée `proxy` (Node.js runtime par défaut).
// Protège tout /live sauf /live/login. Contrôle « optimiste » : on vérifie seulement que
// le cookie de session Auth.js est valide (signature, chiffrement, expiration), sans
// requête en base. Le vrai contrôle (compte toujours existant) est fait au plus près du
// contenu, par getLiveUser() dans chaque page et chaque route API.
export async function proxy(request) {
  const { pathname } = request.nextUrl;

  if (pathname === "/live/login" || pathname.startsWith("/live/login/")) {
    return NextResponse.next();
  }

  let token = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      cookieName: LIVE_COOKIE_NAME,
      salt: LIVE_COOKIE_NAME,
    });
  } catch (error) {
    // Ex. AUTH_SECRET absent : fail closed, personne n'est connecté
    console.error("[live] lecture de la session (proxy) impossible :", error);
  }

  if (!token?.sub) {
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
