import Header from "@/components/Header";
import { getScoreBands } from "@/lib/score";

export const metadata = {
  title: "Méthode — Perlimpinpin",
  description:
    "Comment Perlimpinpin analyse et note les promesses politiques.",
};

const steps = [
  {
    title: "La déclaration est reformulée simplement.",
    body: "On résume la promesse en une phrase claire, sans l'interprétation du candidat ni la nôtre.",
  },
  {
    title: "On rassemble les sources.",
    body: "Nos analyses s'appuient d'abord sur des données publiques : Légifrance, INSEE, Cour des comptes, Banque de France, rapports parlementaires, institutions européennes. Les sources militantes ou partisanes ne sont jamais utilisées comme preuve d'un fait.",
  },
  {
    title: "On situe la mesure dans son contexte.",
    body: "Dans le programme du candidat (cohérence avec ses autres engagements), dans la réalité française actuelle (contraintes budgétaires, cadre juridique, précédents), et dans le contexte international si pertinent (droit européen, comparaisons avec d'autres pays).",
  },
  {
    title: "On évalue selon cinq critères indépendants, chacun noté sur 20 :",
    body: null,
  },
  {
    title: "On distingue explicitement",
    body: "ce qui est établi, ce qui est probable, ce qui est discutable, et ce qui reste inconnu. Quand une source manque, on l'écrit noir sur blanc : « sources insuffisantes » — plutôt que de deviner.",
  },
];

const criteria = [
  {
    name: "Solidité factuelle",
    question: "les chiffres et affirmations sont-ils exacts et à jour ?",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
      />
    ),
  },
  {
    name: "Faisabilité juridique",
    question:
      "la mesure est-elle compatible avec la Constitution, le droit français et européen ?",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v17.25m0-17.25c-1.472 0-2.882.265-4.185.75M12 3c1.472 0 2.882.265 4.185.75M18.75 21H5.25M4.5 8.25h4.5m6 0h4.5M3 8.25l2.25-4.5h3l-2.25 4.5H3Zm12 0 2.25-4.5h3l-2.25 4.5h-3Z"
      />
    ),
  },
  {
    name: "Faisabilité opérationnelle",
    question: "peut-elle être mise en œuvre dans les délais annoncés ?",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 0 1 0 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281Z"
      />
    ),
  },
  {
    name: "Soutenabilité budgétaire",
    question: "le financement est-il crédible et documenté ?",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182.553-.44 1.278-.659 2.003-.659.725 0 1.45.22 2.003.659l.659.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    ),
  },
  {
    name: "Pertinence",
    question: "répond-elle réellement au problème qu'elle prétend résoudre ?",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
      />
    ),
  },
];

const scoreRows = getScoreBands()
  .slice()
  .reverse()
  .map((band) => ({
    range: `${band.min} – ${band.max}`,
    verdict: band.label,
    badgeClass: band.badge,
  }));

const guardrails = [
  {
    lead: "On ne présume jamais qu'une source est pertinente",
    rest: " : nos documents de référence servent de base de travail, pas de réponse toute faite. Si une source n'a rien à voir avec la mesure analysée, on le dit.",
  },
  {
    lead: "On ne cite jamais une source qu'on n'a pas réellement consultée.",
    rest: "",
  },
  {
    lead: "On signale les désaccords entre sources",
    rest: " plutôt que de trancher arbitrairement en leur faveur.",
  },
  {
    lead: "Chaque analyse assistée par IA est relue par un humain",
    rest: " avant publication.",
  },
];

export default function MethodePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto w-full max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600">
            Méthodologie
          </span>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
            Notre méthode
          </h1>

          <p className="mt-6 text-base leading-relaxed text-zinc-600">
            Perlimpinpin évalue les promesses politiques avec la même
            rigueur qu&apos;on attendrait d&apos;un bon journaliste
            économique : sourcer, distinguer les faits des opinions, et ne
            jamais prétendre savoir ce qu&apos;on ne sait pas.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-zinc-900">
            Comment fonctionne une analyse
          </h2>

          <ol className="mt-6 flex flex-col gap-6">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm leading-relaxed text-zinc-600">
                    <span className="font-semibold text-zinc-900">
                      {step.title}
                    </span>
                    {step.body ? ` ${step.body}` : null}
                  </p>

                  {index === 3 ? (
                    <ul className="mt-4 flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-5">
                      {criteria.map((criterion) => (
                        <li
                          key={criterion.name}
                          className="flex items-start gap-2.5"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.5}
                            className="mt-0.5 h-5 w-5 shrink-0 text-blue-600"
                            aria-hidden="true"
                          >
                            {criterion.icon}
                          </svg>
                          <p className="text-sm leading-relaxed text-zinc-600">
                            <span className="font-semibold text-zinc-900">
                              {criterion.name}
                            </span>{" "}
                            — {criterion.question}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          <h2 className="mt-12 text-2xl font-bold text-zinc-900">
            La note finale
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Les cinq critères s&apos;additionnent pour donner un score sur
            100 :
          </p>

          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <th className="px-5 py-3">Score</th>
                  <th className="px-5 py-3">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {scoreRows.map((row, index) => (
                  <tr
                    key={row.range}
                    className={
                      index !== scoreRows.length - 1
                        ? "border-b border-zinc-100"
                        : ""
                    }
                  >
                    <td className="px-5 py-3 font-semibold text-zinc-900">
                      {row.range}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.badgeClass}`}
                      >
                        {row.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="mt-12 text-2xl font-bold text-zinc-900">
            Nos garde-fous
          </h2>

          <ul className="mt-6 flex flex-col gap-4">
            {guardrails.map((item) => (
              <li key={item.lead} className="flex items-start gap-3">
                <span
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400"
                  aria-hidden="true"
                />
                <p className="text-sm leading-relaxed text-zinc-600">
                  <span className="font-semibold text-zinc-900">
                    {item.lead}
                  </span>
                  {item.rest}
                </p>
              </li>
            ))}
          </ul>

          <h2 className="mt-12 text-2xl font-bold text-zinc-900">
            Ce que Perlimpinpin n&apos;est pas
          </h2>

          <p className="mt-4 mb-16 text-sm leading-relaxed text-zinc-600">
            Perlimpinpin ne dit pas si une mesure est souhaitable
            politiquement — ça reste un choix de valeurs, propre à chacun.
            On évalue si une promesse est réaliste, chiffrée et cohérente
            avec les contraintes du pays. Le reste, c&apos;est à vous de le
            décider dans les urnes.
          </p>
        </article>
      </main>
    </div>
  );
}
