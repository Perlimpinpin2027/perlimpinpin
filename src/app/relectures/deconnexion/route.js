import { fermerSession } from "@/lib/relecture-auth";

// Déconnexion de l'espace adhérents : appelée par le formulaire du bandeau de
// public/relectures/index.html. Supprime le cookie puis renvoie vers la connexion
// (303 : le navigateur suit la redirection en GET).
export async function POST(request) {
  // Un autre site ne peut pas déconnecter un adhérent à son insu
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return new Response("Origine refusée.", { status: 403 });
  }

  await fermerSession();
  return Response.redirect(new URL("/relectures/connexion", request.url), 303);
}
