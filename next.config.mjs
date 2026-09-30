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
  // Adresse courte du Club Perlimpinpin (espace adhérents). Les redirections
  // passent avant le proxy : /club n'est pas protégé en soi, c'est la
  // destination /relectures qui l'est (src/proxy.js).
  async redirects() {
    return [{ source: "/club", destination: "/relectures", permanent: true }];
  },
  async rewrites() {
    return [{ source: "/relectures", destination: "/relectures/index.html" }];
  },
};

export default nextConfig;
