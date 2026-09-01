import Header from "@/components/Header";
import { getScoreBands } from "@/lib/score";
import MethodeAnalysisSteps from "@/components/MethodeAnalysisSteps";

export const metadata = {
  title: "Méthode — Perlimpinpin",
  description:
    "Comment Perlimpinpin analyse et note les promesses politiques.",
};

// Icônes dessinées à la main (formes simples), voir la même remarque dans
// MethodeAnalysisSteps.js : plus sûr qu'un tracé Heroicons recopié de
// mémoire pour une icône purement décorative.
const ICON_FLAG = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
  />
);
const ICON_SHIELD_CHECK = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
  />
);
const ICON_DOCUMENT_CHECK = (
  <>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 3.75h6l4 4V19a1.25 1.25 0 0 1-1.25 1.25H7A1.25 1.25 0 0 1 5.75 19V5A1.25 1.25 0 0 1 7 3.75Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 3.75V8h4.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.25 11 15.25 15 11" />
  </>
);
const ICON_CHAT_BUBBLES = (
  <>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 5.5h11a2 2 0 0 1 2 2V13a2 2 0 0 1-2 2H9l-3.5 3V15H4a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20 9.5a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2h-.5v2.5L17 18h-1"
    />
  </>
);
const ICON_CALCULATOR = (
  <>
    <rect x="5" y="3.75" width="14" height="16.5" rx="1.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7.5h8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.008M12 12h.008M16 12h.008M8 15.5h.008M12 15.5h.008M16 15.5h.008" />
  </>
);

// Icônes des 5 critères : mêmes tracés qu'ICON_OPERATIONNEL/EFFICACITE/
// REBONDS/PREPARATION/ALIGNEMENT sur la fiche déclaration (voir
// src/app/declarations/[id]/page.js) — repris tels quels, même langage
// visuel que le reste du site pour ces 5 mêmes concepts.
const ICON_CRITERE_OPERATIONNEL = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
  />
);
const ICON_CRITERE_EFFICACITE = (
  <>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.558-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </>
);
const ICON_CRITERE_REBONDS = (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
  </>
);
const ICON_CRITERE_PREPARATION = (
  <>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 3.75h6l1.5 1.5v13.5A1.25 1.25 0 0 1 14.25 20.5H8A1.25 1.25 0 0 1 6.75 19.25V5A1.25 1.25 0 0 1 8 3.75Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.5 8.5h4M9.5 11.5h4" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.25 15.25l1.5 1.5L14 13.5" />
  </>
);
const ICON_CRITERE_ALIGNEMENT = (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v16.5M8 3h8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l-2.5 5a2.5 2.5 0 0 0 5 0L5 8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 8l-2.5 5a2.5 2.5 0 0 0 5 0L19 8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14" />
  </>
);

const criteria = [
  {
    id: "01",
    icon: ICON_CRITERE_OPERATIONNEL,
    title: "« Est-ce que c'est possible ? » — Opérationnalité & Moyens (30 points)",
    body: "Trois piliers notés séparément (juridique, budgétaire, moyens humains, 10 points chacun). Si l'un est vraiment défaillant, le sous-total plafonne à 10/30, même si les deux autres sont solides.",
  },
  {
    id: "02",
    icon: ICON_CRITERE_EFFICACITE,
    title: "« Est-ce que ça marche ? » — Efficacité (30 points)",
    body: "Le lien de cause à effet est-il direct, indirect, ou quasiment absent ? Et une preuve concrète confirme-t-elle que ça fonctionne pour ce cas précis ?",
  },
  {
    id: "03",
    icon: ICON_CRITERE_REBONDS,
    title: "« Quels sont les risques de dérive ? » — Effets rebonds & Externalités (20 points)",
    body: "La mesure risque-t-elle de créer un problème aussi grave que celui qu'elle prétend résoudre ? Reports de coûts, impacts économiques, sociaux ou environnementaux non voulus.",
  },
  {
    id: "04",
    icon: ICON_CRITERE_PREPARATION,
    title: "« Est-ce que c'est mature ? » — Degré de préparation (10 points)",
    body: "Un projet détaillé et chiffré, ou un simple slogan de campagne ? Et si des chiffres sont avancés, sont-ils exacts au regard des sources officielles ?",
  },
  {
    id: "05",
    icon: ICON_CRITERE_ALIGNEMENT,
    title: "« Est-ce que c'est cohérent ? » — Alignement & Logique globale (10 points)",
    body: "Cohérente avec le reste du programme du candidat, et avec ses votes passés sur des textes comparables. Sans mandat antérieur, seule la cohérence du programme compte.",
  },
];

const guardrails = [
  {
    id: "01",
    icon: ICON_SHIELD_CHECK,
    title: "On ne présume jamais qu'une source est pertinente.",
    body: "Nos documents de référence servent de base de travail, pas de réponse toute faite. Si une source n'a rien à voir avec la mesure analysée, on le dit.",
  },
  {
    id: "02",
    icon: ICON_DOCUMENT_CHECK,
    title: "On ne cite jamais une source qu'on n'a pas réellement consultée.",
    body: null,
  },
  {
    id: "03",
    icon: ICON_CHAT_BUBBLES,
    title: "On signale les désaccords entre sources",
    // Pas d'ancre : aucune section du site ne documente spécifiquement
    // l'arbitrage des désaccords entre sources (voir la demande d'origine —
    // lien seulement "si ça existe"), donc texte simple plutôt qu'un lien
    // vers une cible approximative ou trompeuse.
    body: "plutôt que de trancher arbitrairement en leur faveur.",
  },
  {
    id: "04",
    icon: ICON_CALCULATOR,
    title: "Le calcul du score final n'est jamais fait par une IA.",
    body: "C'est toujours notre code qui additionne les points selon les règles ci-dessus, jamais un modèle qui décide du chiffre final à l'instinct.",
  },
];

// Bloc B : ordre croissant (0-19 → 90-100) pour la barre dégradée et les 6
// colonnes, à l'inverse de getScoreBands() qui renvoie du plus haut score
// au plus bas (voir son commentaire dans src/lib/score.js).
const scoreBandsAsc = getScoreBands().slice().reverse();

function Tag({ children }) {
  return (
    <span className="font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400">
      {children}
    </span>
  );
}

export default function MethodePage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          {/* Notre méthode */}
          <Tag>/ Méthode</Tag>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Notre méthode
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-500">
            Perlimpinpin évalue les promesses politiques avec la même
            rigueur qu&apos;on attendrait d&apos;un bon journaliste
            économique : sourcer, distinguer les faits des opinions, et ne
            jamais prétendre savoir ce qu&apos;on ne sait pas.
          </p>

          {/* Comment fonctionne une analyse (Bloc C) */}
          <div className="mt-16">
            <Tag>// Pipeline</Tag>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Comment fonctionne une analyse
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-500">
              Une chaîne de traitement transparente. Survolez une étape pour
              voir ce qui se passe.
            </p>

            <div className="mt-8">
              <MethodeAnalysisSteps />
            </div>
          </div>

          {/* Les cinq critères */}
          <div className="mt-16 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-zinc-900">
              Les cinq critères
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {criteria.map((item, index) => (
                <div
                  key={item.id}
                  className={
                    index % 3 !== 0
                      ? "flex flex-col gap-3 sm:border-l sm:border-zinc-200 sm:pl-6"
                      : "flex flex-col gap-3"
                  }
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </svg>
                  </span>

                  <div>
                    <span className="font-mono text-xs font-semibold text-zinc-400">
                      {`// ${item.id}`}
                    </span>
                    <p className="mt-1 text-sm font-bold leading-snug text-zinc-900">
                      {item.title}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* La note finale (Bloc B) */}
          <div className="mt-16">
            <Tag>// Output_score</Tag>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              La note finale
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-500">
              Les cinq critères s&apos;additionnent pour produire un score
              sur 100.
            </p>

            <div
              className="mt-8 flex h-24 w-full overflow-hidden rounded-2xl sm:h-32"
              style={{
                background:
                  "linear-gradient(to right, #7f1d1d, #dc2626, #f97316, #facc15, #22c55e, #15803d)",
              }}
            >
              {scoreBandsAsc.map((band, index) => (
                <div
                  key={band.label}
                  className={`flex flex-1 items-center justify-center ${
                    index !== 0 ? "border-l border-white/20" : ""
                  }`}
                >
                  <span className="px-1 text-center text-sm font-bold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.35)] sm:text-lg">
                    {band.min}–{band.max}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
              {scoreBandsAsc.map((band) => (
                <div key={band.label}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    className={`h-5 w-5 ${band.flag}`}
                    aria-hidden="true"
                  >
                    {ICON_FLAG}
                  </svg>
                  <p className="mt-2 text-sm font-semibold text-zinc-900">
                    {band.min} – {band.max}
                  </p>
                  <p className={`text-sm font-bold ${band.score}`}>{band.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                    {band.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* D'où vient notre grille — contenu existant, non couvert par
              les blocs de la refonte, conservé tel quel. */}
          <div className="mt-16 max-w-2xl">
            <h2 className="text-2xl font-bold text-zinc-900">
              D&apos;où vient notre grille
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              On n&apos;a pas inventé ces cinq critères dans notre coin. Ils
              s&apos;inspirent de plusieurs décennies de recherche, en
              France et à l&apos;international, sur la manière de juger
              sérieusement une politique publique, notamment les travaux
              d&apos;Eugene Bardach (Berkeley), l&apos;un des fondateurs de
              l&apos;analyse des politiques publiques aux États-Unis, et
              d&apos;Elinor Ostrom, première femme à avoir reçu le prix
              Nobel d&apos;économie (2009), qui a montré qu&apos;une
              réforme peut être parfaitement légale sur le papier et
              pourtant échouer dans les faits parce que le vrai pouvoir de
              décision appartient à d&apos;autres acteurs que ceux visés
              par la promesse.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              En France, Pierre Muller, Yves Surel et Patrice Duran ont
              posé les bases de l&apos;analyse des politiques publiques. Et
              l&apos;universitaire italien Giandomenico Majone nous
              rappelle qu&apos;aucune évaluation n&apos;est jamais
              totalement neutre : c&apos;est pour ça qu&apos;on rend notre
              grille et nos sources publiques.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Le principe de comparer chaque mesure à un objectif de
              référence, plutôt qu&apos;à l&apos;objectif tel que le
              candidat le formule, s&apos;appuie lui aussi sur des cadres
              reconnus : les critères d&apos;évaluation du Comité d&apos;aide
              au développement de l&apos;OCDE, la distinction entre
              réalisation et résultat popularisée par le chercheur français
              Patrick Gibert, et le Green Book du Trésor britannique,
              référence en matière d&apos;évaluation des politiques
              publiques.
            </p>
          </div>

          {/* Notre processus de vérification (Bloc E) */}
          <div className="mt-16 max-w-2xl">
            <h2 className="text-2xl font-bold text-zinc-900">
              Notre processus de vérification
            </h2>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Chaque analyse passe par plusieurs étapes avant publication,
              pour limiter les erreurs et les angles morts d&apos;un seul
              modèle.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Une première analyse est effectuée avec Claude, qui soulève
              les points les plus importants : chiffres et sources,
              faisabilité juridique, coût, effets attendus, angles morts.
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
          </div>

          {/* Nos garde-fous (Bloc D) */}
          <div className="mt-16 rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-zinc-900">
              Nos garde-fous
            </h2>

            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {guardrails.map((item, index) => (
                <div
                  key={item.id}
                  className={
                    index > 0
                      ? "flex flex-col gap-3 sm:border-l sm:border-zinc-200 sm:pl-6"
                      : "flex flex-col gap-3"
                  }
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      className="h-6 w-6"
                      aria-hidden="true"
                    >
                      {item.icon}
                    </svg>
                  </span>

                  <div>
                    <span className="font-mono text-xs font-semibold text-zinc-400">
                      {`// ${item.id}`}
                    </span>
                    <p className="mt-1 text-sm font-bold leading-snug text-zinc-900">
                      {item.title}
                    </p>
                    {item.body ? (
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">
                        {item.body}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ce que Perlimpinpin n'est pas (Bloc F) */}
          <div className="mt-16 mb-16 max-w-2xl">
            <h2 className="text-2xl font-bold text-zinc-900">
              Ce que Perlimpinpin n&apos;est pas
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Perlimpinpin ne dit pas si une mesure est souhaitable
              politiquement : ça reste un choix de valeurs, propre à
              chacun. On évalue si une promesse est réaliste, chiffrée et
              cohérente avec les contraintes du pays. Le reste,
              c&apos;est à vous de le décider dans les urnes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
