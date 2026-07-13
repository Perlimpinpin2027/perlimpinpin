const features = [
  {
    title: "Analyses assistées par l'IA",
    description: "Pour traiter plus de données, plus vite.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    ),
  },
  {
    title: "Experts et journalistes",
    description: "Des analyses relues et contextualisées.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    ),
  },
  {
    title: "Sources publiques",
    description: "Toutes nos informations sont vérifiées.",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    ),
  },
];

export default function HeroText() {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-bold uppercase tracking-widest text-red-600">
        Présidentielle 2027
      </span>

      <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
        Ce que valent vraiment les promesses politiques
        <span className="text-blue-600">.</span>
      </h1>

      <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-500">
        Perlimpinpin analyse les déclarations des candidats à l&apos;élection
        présidentielle 2027 avec l&apos;IA et des experts, à partir de
        sources publiques et d&apos;une méthode transparente.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {features.map((feature) => (
          <div key={feature.title} className="flex items-start gap-2.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="mt-0.5 h-5 w-5 shrink-0 text-blue-600"
              aria-hidden="true"
            >
              {feature.icon}
            </svg>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {feature.title}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-zinc-500">
                {feature.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
