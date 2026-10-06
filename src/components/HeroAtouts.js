import { textesParDefaut } from "@/lib/textes-site";

// Les 3 atouts sous le bandeau d'accueil — version minimaliste (oct. 2026) :
// petite icône sans tuile, titre, sous-titre sur une ligne (desktop).
// Textes modifiables depuis /test/textes/accueil (groupe « Les 3 atouts »).
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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-0">
      {ICONES.map((icone, index) => (
        <div
          key={index}
          className={`flex items-start gap-3 ${
            index > 0 ? "md:border-l md:border-zinc-200 md:pl-6 lg:pl-8" : ""
          } ${index < ICONES.length - 1 ? "md:pr-6 lg:pr-8" : ""}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500"
            aria-hidden="true"
          >
            {icone}
          </svg>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug text-zinc-900">
              {t[`hero.atout${index + 1}.titre`]}
            </p>
            <p className="mt-0.5 text-sm leading-snug text-zinc-500 lg:whitespace-nowrap">
              {t[`hero.atout${index + 1}.texte`]}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
