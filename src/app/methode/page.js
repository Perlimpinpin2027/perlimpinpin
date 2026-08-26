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

const guardrails = [
  {
    id: "01",
    icon: ICON_SHIELD_CHECK,
    title: "On ne présume jamais qu'une source est pertinente.",
    body: "Nos documents de référence servent de base de travail, pas de réponse toute faite.",
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
          {/* Comment fonctionne une analyse (Bloc C) */}
          <Tag>/ Méthode</Tag>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Comment fonctionne une analyse
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-500">
            Une chaîne de traitement transparente. Survolez une étape pour
            voir ce qui se passe.
          </p>

          <div className="mt-8">
            <MethodeAnalysisSteps />
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
              Une première analyse est effectuée par IA, qui soulève les
              points les plus importants : chiffres et sources, faisabilité
              juridique, coût, effets attendus, angles morts.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Une contre-analyse est ensuite effectuée par une seconde IA
              indépendante, dont le rôle est justement de challenger la
              première analyse en repérant un chiffre douteux, une
              affirmation juridique trop tranchée, ou un point structurant
              qui aurait été oublié.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-zinc-600">
              Le résumé final est produit par la première IA, qui tranche
              entre les deux analyses et n&apos;intègre que les remarques
              réellement fondées.
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
