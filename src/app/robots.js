const BASE_URL = "https://perlimpinpin.ai";

// /test : espace de relecture des brouillons (voir src/app/test/page.js, déjà
// en noindex via son metadata) — jamais destiné au public.
// /live : outil éditorial interne PerlimpinpinGo, derrière connexion (voir
// src/app/live/analyses/[id]/page.js, déjà en noindex) — pas du contenu du
// site public.
// /api : routes de données, pas des pages à indexer.
// Aucune route /admin n'existe dans ce projet.
export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/test", "/live", "/api"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
