import MonoTag from "./MonoTag";

const features = [
  {
    title: "Analyses assistées par l'IA",
    description: "Pour traiter plus de données, plus vite.",
    // Fond pastel distinct par icône (bleu déjà utilisé comme accent
    // principal du site, puis deux teintes complémentaires) pour donner du
    // relief à cette rangée, plutôt que trois icônes plates identiques.
    bgClass: "bg-blue-50",
    iconClass: "text-blue-600",
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
    bgClass: "bg-emerald-50",
    iconClass: "text-emerald-600",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    ),
  },
  {
    title: "Sources publiques",
    description: "Toutes nos informations sont vérifiées.",
    bgClass: "bg-violet-50",
    iconClass: "text-violet-600",
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
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
          />
        </svg>
        Présidentielles 2027
      </span>

      <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
        Ce que valent vraiment les promesses politiques{" "}
        <span
          className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600 align-middle"
          aria-hidden="true"
        />
      </h1>

      <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-500">
        Perlimpinpin analyse les déclarations des candidats à l&apos;élection
        présidentielle 2027 avec l&apos;IA et des experts, à partir de
        sources publiques et d&apos;une méthode transparente.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        {features.map((feature, index) => (
          <div key={feature.title} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${feature.bgClass}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className={`h-5 w-5 ${feature.iconClass}`}
                  aria-hidden="true"
                >
                  {feature.icon}
                </svg>
              </span>
              <MonoTag>{String(index + 1).padStart(2, "0")}</MonoTag>
            </div>
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
