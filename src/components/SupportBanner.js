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

// Motif de points rouge de marque, estompé vers le blanc (masque dégradé) :
// vertical en mobile (bandeau en haut de carte), horizontal dès md.
const dotsStyle = (direction) => ({
  backgroundImage:
    "radial-gradient(circle, #dc2626 1.6px, transparent 1.9px)",
  backgroundSize: "11px 11px",
  maskImage: `linear-gradient(to ${direction}, #000, transparent)`,
  WebkitMaskImage: `linear-gradient(to ${direction}, #000, transparent)`,
});

export default function SupportBanner() {
  return (
    <section className="w-full px-6 pb-6 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm md:flex-row">
        <div
          aria-hidden="true"
          className="h-16 shrink-0 md:hidden"
          style={dotsStyle("bottom")}
        />
        <div
          aria-hidden="true"
          className="hidden shrink-0 md:block md:w-[18%]"
          style={dotsStyle("right")}
        />

        <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between md:gap-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-600">
              Soutenir Perlimpinpin
            </p>
            <h2 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
              Faites la différence<span className="text-red-600">.</span>
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500">
              Une association indépendante, pour une information plus claire.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-4 md:items-end">
            <a
              href={HELLOASSO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
            >
              Soutenir sur HelloAsso →
            </a>
            <ul className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:gap-4 md:justify-end">
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
                    className="h-4 w-4 shrink-0 text-red-600"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
                  </svg>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
