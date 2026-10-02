import { textesParDefaut } from "@/lib/textes-site";

// Les 3 atouts sous le bandeau d'accueil (maquette oct. 2026) : icône dans
// une tuile claire, titre, sous-titre en police mono. Textes modifiables
// depuis /test/textes/accueil (groupe « Les 3 atouts »).
const ICONES = [
  // Étincelle (IA)
  <path
    key="0"
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 3.5c.6 4.6 3.9 7.9 8.5 8.5-4.6.6-7.9 3.9-8.5 8.5-.6-4.6-3.9-7.9-8.5-8.5 4.6-.6 7.9-3.9 8.5-8.5Z"
  />,
  // Bulle de commentaire
  <path
    key="1"
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 1.6.5 3.1 1.37 4.37L3.75 20.25l3.97-.98A9.9 9.9 0 0 0 12 20.25Z"
  />,
  // Barres de progression
  <path
    key="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M4 20h16M6.5 20v-7h4v7M13.5 20V5.5h4V20"
  />,
];

export default function HeroAtouts({ textes }) {
  const t = { ...textesParDefaut("accueil"), ...textes };

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-0">
      {ICONES.map((icone, index) => (
        <div
          key={index}
          className={`flex items-center gap-5 ${
            index > 0 ? "md:border-l md:border-zinc-200 md:pl-10" : ""
          } ${index < ICONES.length - 1 ? "md:pr-10" : ""}`}
        >
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-indigo-50/80 text-zinc-900">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              className="h-7 w-7"
              aria-hidden="true"
            >
              {icone}
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-blue-950">
              {t[`hero.atout${index + 1}.titre`]}
            </p>
            <p className="mt-1 font-mono text-sm text-slate-400">
              {t[`hero.atout${index + 1}.texte`]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
