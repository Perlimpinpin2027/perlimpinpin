import Header from "@/components/Header";

export const metadata = {
  title: "Nous rejoindre — Perlimpinpin",
  description:
    "De l'intelligence artificielle à l'intelligence collective : rejoignez le Club Perlimpinpin pour challenger et améliorer nos analyses.",
};

const HELLOASSO_URL = "https://www.helloasso.com/associations/perlimpinpin-ai";

// Les 4 étapes du fonctionnement du Club (cartes numérotées).
const STEPS = [
  {
    title: "L’IA analyse",
    lines: [
      "Chaque proposition est examinée selon une méthode commune : faisabilité, coût, financement, moyens, efficacité, calendrier et données disponibles.",
      "Un point de départ, pas une vérité définitive.",
    ],
  },
  {
    title: "Le Club challenge",
    lines: [
      "Les contributeurs peuvent apporter une source, contester un raisonnement, signaler une erreur ou proposer une autre lecture.",
      "La contradiction fait partie du système.",
    ],
  },
  {
    title: "L’IA s’améliore",
    lines: [
      "L’IA confronte ces contributions aux sources, corrige ses erreurs, nuance ses conclusions ou maintient son analyse lorsqu’elle estime les objections insuffisamment étayées.",
    ],
  },
  {
    title: "L’analyse devient collective",
    lines: [
      "Les contributions pertinentes enrichissent le résultat final.",
      "Les sources, incertitudes et désaccords restent visibles.",
    ],
  },
];

// Les 3 sections de texte sous les cartes.
const SECTIONS = [
  {
    title: "Une nouvelle exigence",
    lines: [
      "L’IA rend plus visibles les promesses imprécises, les financements absents ou les contradictions.",
      "À mesure que les outils d’analyse progressent, les propositions politiques peuvent elles aussi être soumises à davantage d’exigence, de précision et de vérification.",
    ],
  },
  {
    title: "Une autre manière d’utiliser l’IA en démocratie",
    lines: [
      "L’intelligence artificielle apporte la vitesse et la capacité d’analyse.",
      "Les humains apportent l’expertise, la contradiction et le jugement.",
      "C’est leur combinaison qui fait Perlimpinpin.",
    ],
  },
  {
    title: "Un outil indépendant",
    lines: [
      "Perlimpinpin est porté par une association indépendante.",
      "Les adhésions et les dons financent :",
      "L’indépendance.",
      "La technologie.",
      "L’accès aux analyses.",
    ],
  },
];

export default function NousRejoindrePage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          {/* Titre + introduction */}
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl">
            De l’intelligence artificielle
            <br className="hidden sm:block" /> à l’intelligence collective
          </h1>

          <div className="mt-6 flex flex-col gap-3 text-base leading-relaxed text-zinc-600">
            <p>
              Perlimpinpin utilise l’intelligence artificielle pour rendre le
              débat public plus lisible, plus vérifiable et plus ouvert.
            </p>
            <p>
              L’IA peut analyser des milliers de données et confronter des
              sources. Mais elle ne peut pas, encore, décider ce qui est
              pertinent ou suffisamment démontré.
            </p>
            <p>L’objectivité ne se décrète pas. Elle se construit.</p>
          </div>

          <hr className="mt-6 border-zinc-200" />

          {/* Les 4 étapes */}
          <ol className="mt-6 flex flex-col gap-4">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex gap-5 rounded-2xl border border-zinc-200 bg-white px-6 py-6 sm:gap-6 sm:px-7"
              >
                <span className="w-8 shrink-0 pt-1 text-2xl font-medium tabular-nums text-zinc-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-7 w-px shrink-0 bg-zinc-300"
                />
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                    {step.title}
                  </h2>
                  <div className="mt-2 flex flex-col gap-0.5 text-sm leading-relaxed text-zinc-600 sm:text-base">
                    {step.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* Sections de texte */}
          <div className="mt-8">
            {SECTIONS.map((section) => (
              <section key={section.title} className="border-t border-zinc-200 py-6">
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
                  {section.title}
                </h2>
                <div className="mt-2 flex flex-col gap-0.5 text-base leading-relaxed text-zinc-600">
                  {section.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Appel à l'action final */}
        <div className="mx-auto mt-4 w-full max-w-[1080px] rounded-3xl border border-zinc-200 bg-gradient-to-br from-slate-100 via-orange-50 to-indigo-100 px-6 py-10 text-center sm:py-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-700">
            Rejoignez le Club
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Entrez dans l’aventure.
          </h2>
          <p className="mt-3 text-sm text-zinc-600 sm:text-base">
            Faites un don de 2 € sur HelloAsso pour rejoindre le Club
            Perlimpinpin.
          </p>
          <a
            href={HELLOASSO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-900 px-12 py-4 text-base font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            Faire un don de 2 €
          </a>
        </div>
      </main>
    </div>
  );
}
