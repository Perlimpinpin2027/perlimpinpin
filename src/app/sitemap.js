import { getPublishedPropositionsForSitemap } from "@/lib/queries";

export const dynamic = "force-dynamic";

const BASE_URL = "https://perlimpinpin.ai";

// Pages statiques importantes du site public (hors fiches déclarations,
// ajoutées dynamiquement ci-dessous). /declarations, /prix-perlimpinpin,
// /objectifs et /sources ne sont pas dans la liste explicite de la demande
// d'origine ; on s'en tient à ce qui a été demandé.
const STATIC_ROUTES = ["", "/candidats", "/themes", "/methode", "/a-propos"];

export default async function sitemap() {
  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${BASE_URL}${route}`,
  }));

  const propositions = await getPublishedPropositionsForSitemap();
  const declarationEntries = propositions.map(({ id, lastModified }) => ({
    url: `${BASE_URL}/declarations/${id}`,
    ...(lastModified ? { lastModified } : {}),
  }));

  return [...staticEntries, ...declarationEntries];
}
