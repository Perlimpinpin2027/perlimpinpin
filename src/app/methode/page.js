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
    title: "On évalue selon cinq critères indépendants, pour un total de 100 points :",
    body: null,
  },
  {
    title: "On distingue explicitement",
    body: "ce qui est établi, ce qui est probable, ce qui est discutable, et ce qui reste inconnu. Quand une source manque, on l'écrit noir sur blanc : « sources insuffisantes », plutôt que de deviner.",
  },
];

const criteria = [
  {
    name: "Solidité factuelle et documentaire",
    points: 20,
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
    name: "Efficacité attendue",
    points: 20,
    question:
      "la mesure atteint-elle l'objectif annoncé, et y a-t-il des risques d'effets rebond documentés qui annuleraient le bénéfice ?",
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.558-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </>
    ),
  },
  {
    name: "Faisabilité juridique et réglementaire",
    points: 25,
    question:
      "compatible avec la Constitution, le droit français et européen, y compris les engagements climatiques de l'État français ?",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v17.25m0-17.25c-1.472 0-2.882.265-4.185.75M12 3c1.472 0 2.882.265 4.185.75M18.75 21H5.25M4.5 8.25h4.5m6 0h4.5M3 8.25l2.25-4.5h3l-2.25 4.5H3Zm12 0 2.25-4.5h3l-2.25 4.5h-3Z"
      />
    ),
  },
  {
    name: "Coût et soutenabilité budgétaire",
    points: 20,
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
    name: "Faisabilité opérationnelle",
    points: 15,
    question:
      "la mesure est-elle concrètement réalisable dans les délais annoncés, et tient-elle sur la durée même si le contexte change ?",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
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
                            <span className="text-xs font-medium text-zinc-400">
                              ({criterion.points} pts)
                            </span>{" "}
                            : {criterion.question}
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
            D&apos;où vient notre grille
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            On n&apos;a pas inventé ces cinq critères dans notre coin. Ils
            s&apos;inspirent de plusieurs décennies de recherche, en France
            et à l&apos;international, sur la manière de juger sérieusement
            une politique publique, notamment les travaux d&apos;Eugene
            Bardach (Berkeley), l&apos;un des fondateurs de l&apos;analyse
            des politiques publiques aux États-Unis, et d&apos;Elinor
            Ostrom, première femme à avoir reçu le prix Nobel
            d&apos;économie (2009), qui a montré qu&apos;une réforme peut
            être parfaitement légale sur le papier et pourtant échouer dans
            les faits parce que le vrai pouvoir de décision appartient à
            d&apos;autres acteurs que ceux visés par la promesse.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            En France, Pierre Muller, Yves Surel et Patrice Duran ont posé
            les bases de l&apos;analyse des politiques publiques. Et
            l&apos;universitaire italien Giandomenico Majone nous rappelle
            qu&apos;aucune évaluation n&apos;est jamais totalement neutre :
            c&apos;est pour ça qu&apos;on rend notre grille et nos sources
            publiques.
          </p>

          <h2 className="mt-12 text-2xl font-bold text-zinc-900">
            Notre processus de vérification
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Chaque analyse passe par plusieurs étapes avant publication,
            pour limiter les erreurs et les angles morts d&apos;un seul
            modèle.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Une première analyse est effectuée avec Claude, qui soulève les
            points les plus importants : chiffres et sources, faisabilité
            juridique, coût, effets attendus, angles morts.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Une contre-analyse est ensuite effectuée avec Mistral, un
            second modèle indépendant, dont le rôle est justement de
            challenger la première analyse en repérant un chiffre douteux,
            une affirmation juridique trop tranchée, ou un point
            structurant qui aurait été oublié.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Le résumé final est produit par Claude, qui tranche entre les
            deux analyses et n&apos;intègre que les remarques réellement
            fondées.
          </p>

          <p className="mt-4 text-sm leading-relaxed text-zinc-600">
            Cette double vérification par IA est ensuite relue par des
            experts vérificateurs avant toute publication.
          </p>

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
            politiquement : ça reste un choix de valeurs, propre à chacun.
            On évalue si une promesse est réaliste, chiffrée et cohérente
            avec les contraintes du pays. Le reste, c&apos;est à vous de le
            décider dans les urnes.
          </p>
        </article>
      </main>
    </div>
  );
}
