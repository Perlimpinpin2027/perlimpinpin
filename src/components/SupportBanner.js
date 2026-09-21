const HELLOASSO_URL = "https://www.helloasso.com/associations/perlimpinpin-ai";

// Chemins d'icônes (Heroicons outline, même jeu que les SVG inline du reste
// du site : pas de librairie d'icônes dans le projet).
const BADGES = [
  {
    label: "Indépendant",
    d: "M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z",
  },
  {
    label: "Sans publicité",
    d: "M9.143 17.082a24.248 24.248 0 0 0 3.844.148m-3.844-.148a23.856 23.856 0 0 1-5.455-1.31 8.964 8.964 0 0 0 2.3-5.542m3.155 6.852a3 3 0 0 0 5.667 1.97m1.965-2.277L21 21m-4.225-4.225a23.81 23.81 0 0 0 3.536-1.003A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6.53 6.53m10.245 10.245L6.53 6.53M3 3l3.53 3.53",
  },
  {
    label: "Pour tous",
    d: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  },
];

// Le "/" du logo Perlimpinpin (tracé repris de app/sources/icon-monogram.svg,
// sans le "P"), affiché dans la pastille grise à gauche du bandeau.
const SLASH_PATH =
  "M517 647C517 672 494 695 467 695C443 695 432 684 416 651L95 -27C86 -45 83 -55 83 -65C83 -90 107 -113 133 -113C158 -113 169 -103 185 -69L505 610C514 630 517 636 517 647Z";

export default function SupportBanner() {
  return (
    <section className="w-full px-6 pb-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4 rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm lg:flex-row lg:items-center lg:gap-6 lg:px-6">
        {/* Pastille "/" + titre */}
        <div className="flex items-center gap-4 lg:gap-5">
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="70 -705 460 830"
              className="h-6 w-auto"
              fill="currentColor"
            >
              <g transform="scale(1,-1)">
                <path d={SLASH_PATH} />
              </g>
            </svg>
          </div>
          <div
            aria-hidden="true"
            className="hidden h-12 w-px shrink-0 bg-zinc-200 lg:block"
          />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-400">
              Soutenir Perlimpinpin
            </p>
            <h2 className="mt-0.5 text-xl font-semibold leading-tight tracking-tight text-zinc-900">
              Faites la différence<span className="text-red-600">.</span>
            </h2>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="hidden h-12 w-px shrink-0 bg-zinc-200 lg:block"
        />

        {/* Texte d'accompagnement + badges */}
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-xs leading-relaxed text-zinc-500">
            Une association indépendante, pour une information plus claire.
          </p>
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {BADGES.map(({ label, d }) => (
              <li
                key={label}
                className="flex items-center gap-1.5 text-xs font-medium text-zinc-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-3.5 w-3.5 shrink-0 text-red-600"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d={d} />
                </svg>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <a
          href={HELLOASSO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 sm:self-start lg:self-auto whitespace-nowrap rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
        >
          Soutenir sur HelloAsso →
        </a>
      </div>
    </section>
  );
}
