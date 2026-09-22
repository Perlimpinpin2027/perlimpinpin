/** @type {import('next').NextConfig} */
const nextConfig = {
  // /api/live/analyze lit data/prompt-methodologie.md à l'exécution (barème
  // et doctrine, source unique) : sans cette inclusion, le fichier peut être
  // absent du bundle serverless déployé.
  outputFileTracingIncludes: {
    "/api/live/analyze": ["./data/prompt-methodologie.md"],
  },
  // Next.js ne résout pas automatiquement /relectures vers
  // public/relectures/index.html (pas de fallback "clean URL" sur les
  // fichiers statiques) : réécriture explicite pour que le lien partagé en
  // relecture fonctionne sans /index.html.
  async rewrites() {
    return [{ source: "/relectures", destination: "/relectures/index.html" }];
  },
};

export default nextConfig;
