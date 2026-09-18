/** @type {import('next').NextConfig} */
const nextConfig = {
  // /api/live/analyze lit data/prompt-methodologie.md à l'exécution (barème
  // et doctrine, source unique) : sans cette inclusion, le fichier peut être
  // absent du bundle serverless déployé.
  outputFileTracingIncludes: {
    "/api/live/analyze": ["./data/prompt-methodologie.md"],
  },
};

export default nextConfig;
