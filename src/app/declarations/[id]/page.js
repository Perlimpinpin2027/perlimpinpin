import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import FeedbackWidget from "@/components/FeedbackWidget";
import VoteMesureWidget from "@/components/VoteMesureWidget";
import StickyScoreCard from "@/components/StickyScoreCard";
import { getDeclarationDetail } from "@/lib/queries";
import { getScoreBadge } from "@/lib/score";

export const dynamic = "force-dynamic";

// Icônes réutilisées à la fois par l'ancien et le nouveau barème (mêmes
// pictogrammes, juste réattribués différemment selon le schéma détecté).
const ICON_FACTUEL = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
  />
);
const ICON_JURIDIQUE = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 3v17.25m0-17.25c-1.472 0-2.882.265-4.185.75M12 3c1.472 0 2.882.265 4.185.75M18.75 21H5.25M4.5 8.25h4.5m6 0h4.5M3 8.25l2.25-4.5h3l-2.25 4.5H3Zm12 0 2.25-4.5h3l-2.25 4.5h-3Z"
  />
);
const ICON_EFFICACITE = (
  <>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.558-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </>
);
const ICON_COUT = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
  />
);
const ICON_OPERATIONNEL = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
  />
);
// Icônes du barème 2026 (5 critères sans malus, voir data/prompt-
// methodologie.md) : ICON_FACTUEL/ICON_JURIDIQUE/ICON_EFFICACITE/ICON_COUT/
// ICON_OPERATIONNEL restent utilisées par les schémas antérieurs
// (notationLabels/notationLabelsV2) ; ces trois-ci sont propres aux
// critères qui n'existaient pas avant (Effets rebonds & Externalités,
// Degré de préparation, Alignement & Logique globale). Formes simples
// dessinées à la main plutôt qu'un tracé Heroicons recopié de mémoire.
const ICON_REBONDS = (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0 3 2 4.5 0" />
  </>
);
const ICON_PREPARATION = (
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
const ICON_ALIGNEMENT = (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v16.5M8 3h8" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8l-2.5 5a2.5 2.5 0 0 0 5 0L5 8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 8l-2.5 5a2.5 2.5 0 0 0 5 0L19 8Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14" />
  </>
);
const ICON_SHIELD = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
  />
);
const ICON_WARNING = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
  />
);

// Ancien barème (5 critères à poids différents 20/20/25/20/15, addition
// simple) : encore utilisé par les fiches produites avant le nouveau
// barème à garde-fou juridique (voir plus bas). Les clés correspondent
// directement à contenu.notation_detaillee.
const notationLabels = [
  { key: "factuel", label: "Solidité factuelle et documentaire", max: 20, icon: ICON_FACTUEL },
  { key: "juridique", label: "Faisabilité juridique et réglementaire", max: 25, icon: ICON_JURIDIQUE },
  { key: "efficacite", label: "Efficacité attendue", max: 20, icon: ICON_EFFICACITE },
  { key: "cout", label: "Coût et soutenabilité budgétaire", max: 20, icon: ICON_COUT },
  { key: "operationnel", label: "Faisabilité opérationnelle", max: 15, icon: ICON_OPERATIONNEL },
];

// Nouveau barème (4 critères de 25 points additionnés + un critère
// juridique évalué séparément comme garde-fou, non additionné — voir
// data/prompt-methodologie.md). Détecté par la présence de
// score_juridique_garde_fou dans notation_detaillee (absent de l'ancien
// schéma), pour ne pas casser l'affichage des fiches déjà publiées.
const notationLabelsV2 = [
  { key: "factuel", label: "Solidité factuelle et documentaire", max: 25, icon: ICON_FACTUEL },
  { key: "efficacite", label: "Efficacité attendue", max: 25, icon: ICON_EFFICACITE },
  { key: "operationnel", label: "Faisabilité opérationnelle", max: 25, icon: ICON_OPERATIONNEL },
  { key: "cout", label: "Coût et soutenabilité budgétaire", max: 25, icon: ICON_COUT },
];

// Barème 2026 (5 critères SANS malus, voir data/prompt-methodologie.md) :
// remplace entièrement l'ajustement juridique bonus-malus par une RÈGLE DE
// PLAFOND interne à Opérationnalité & Moyens (voir plafond_applique /
// plafond_declencheur, gérés par CriteriaCard/ScoreBar directement, pas par
// ce tableau de labels). Détecté par la présence de
// operationnalite_moyens_total dans notation_detaillee (absent de tous les
// schémas antérieurs), pour ne pas casser l'affichage des fiches déjà
// publiées sous un ancien barème.
const notationLabelsV5 = [
  { key: "operationnalite_moyens_total", label: "Opérationnalité & Moyens", max: 30, icon: ICON_OPERATIONNEL },
  { key: "efficacite", label: "Efficacité", max: 30, icon: ICON_EFFICACITE },
  { key: "effets_rebonds_externalites", label: "Effets rebonds & Externalités", max: 20, icon: ICON_REBONDS },
  { key: "degre_preparation", label: "Degré de préparation", max: 10, icon: ICON_PREPARATION },
  { key: "alignement_logique", label: "Alignement & Logique globale", max: 10, icon: ICON_ALIGNEMENT },
];

// Libellés lisibles pour plafond_declencheur ("juridique" | "budgetaire" |
// "moyens_humains"), utilisés par le badge de plafond sur la carte
// "Opérationnalité & Moyens".
const PLAFOND_DECLENCHEUR_LABELS = {
  juridique: "faisabilité juridique",
  budgetaire: "faisabilité budgétaire",
  moyens_humains: "moyens humains",
};

// Icônes pour le tableau structuré analyse_par_criteres (étape 3) : les
// valeurs de `critere` n'utilisent pas toujours les mêmes clés que
// notation_detaillee (ex. "solidite_factuelle" au lieu de "factuel",
// schémas antérieurs). "operationnalite_moyens", "effets_rebonds_
// externalites", "degre_preparation" et "alignement_logique" sont les clés
// du barème 2026 ; "efficacite" est inchangée entre les deux.
const CRITERE_ICONS = {
  solidite_factuelle: ICON_FACTUEL,
  efficacite: ICON_EFFICACITE,
  operationnel: ICON_OPERATIONNEL,
  cout: ICON_COUT,
  juridique_garde_fou: ICON_JURIDIQUE,
  operationnalite_moyens: ICON_OPERATIONNEL,
  effets_rebonds_externalites: ICON_REBONDS,
  degre_preparation: ICON_PREPARATION,
  alignement_logique: ICON_ALIGNEMENT,
};

// Traitement "verre dépoli" des deux points d'entrée clés d'une fiche
// déclaration (résumé IA en haut, verdict final en bas du raisonnement) :
// fond semi-transparent légèrement teinté + flou d'arrière-plan, qui laisse
// deviner le dégradé de la page (.bg-page-gradient) en transparence.
// backdrop-filter posé en style inline plutôt qu'en classe CSS/Tailwind :
// une fois passé par l'autoprefixer du build (Lightning CSS, voir
// postcss.config.mjs), la propriété ne survit pas de façon fiable dans une
// classe globale — même problème déjà rencontré sur le header sticky, voir
// le commentaire dans Header.js. L'inline style pose la valeur finale
// directement dans le DOM, sans passer par cette étape.
const GLASS_STYLE = {
  backgroundColor: "rgba(239, 246, 255, 0.55)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "1px solid rgba(191, 219, 254, 0.5)",
};

// Sections ciblées par le mini-sommaire de navigation de la sidebar sticky
// (voir StickyScoreCard) : chaque id doit correspondre à un ancrage posé
// plus bas dans "Le raisonnement complet".
const TOC_SECTIONS = [
  { id: "contexte", label: "Contexte" },
  { id: "analyse-criteres", label: "Analyse par critères" },
  { id: "angles-morts", label: "Angles morts" },
  { id: "verdict", label: "Verdict" },
];

function Section({ title, id, children }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
      <div className="mt-3 max-w-[68ch] text-sm leading-7 text-zinc-600">
        {children}
      </div>
    </section>
  );
}

// Convertit un marquage minimal **gras** en JSX, sans dépendance markdown
// complète — le contenu vient de fiches où seuls quelques mots-clés (chiffre,
// source, date, qualificatif) sont mis en avant, jamais des phrases entières.
function renderRichText(text) {
  if (typeof text !== "string") return text;
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    return match ? (
      <strong key={index} className="font-semibold text-zinc-900">
        {match[1]}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    );
  });
}

function TextOrList({ value }) {
  if (!value) {
    return <p className="text-zinc-400">Non renseigné.</p>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="flex flex-col gap-2">
        {value.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400"
              aria-hidden="true"
            />
            <span>{renderRichText(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p>{renderRichText(value)}</p>;
}

// Contexte national/international arrivent souvent comme un seul long
// paragraphe mélangeant plusieurs idées (ex. 4-6 phrases enchaînées), dur à
// parcourir. Découpe naïve en phrases puis regroupement par lots de 3 pour
// aérer en plusieurs paragraphes, sans toucher au texte lui-même — repérage
// simple par ponctuation de fin de phrase, accepté comme imparfait (ex. sur
// une abréviation ou un nombre décimal en fin de segment).
function splitSentences(text) {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const matches = trimmed.match(/[^.!?]+[.!?]+(?:["'"»)\]]*)(?:\s+|$)/g);
  return matches ? matches.map((sentence) => sentence.trim()).filter(Boolean) : [trimmed];
}

function ContextText({ value }) {
  if (!value) return <p className="text-zinc-400">Non renseigné.</p>;
  if (Array.isArray(value) || typeof value !== "string") {
    return <TextOrList value={value} />;
  }

  const sentences = splitSentences(value);
  if (sentences.length <= 3) return <p>{renderRichText(value)}</p>;

  const paragraphs = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(" "));
  }

  return (
    <div className="flex flex-col gap-3">
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{renderRichText(paragraph)}</p>
      ))}
    </div>
  );
}

// sources_utilisees : chaîne simple par élément sur les fiches antérieures
// au schéma V3, objet structuré { id, titre, organisme, url, type, ... }
// depuis (voir data/prompt-methodologie.md, section SOURCES STRUCTURÉES).
// TextOrList/renderRichText ne savent afficher que des chaînes ; ce
// composant dédié gère les deux formes sans faire planter le rendu React
// sur un objet.
function SourcesList({ value }) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return <p className="text-zinc-400">Non renseigné.</p>;
  }
  if (!Array.isArray(value)) {
    return <TextOrList value={value} />;
  }
  if (typeof value[0] !== "object" || value[0] === null) {
    return <TextOrList value={value} />;
  }

  return (
    <ul className="flex flex-col gap-2">
      {value.map((source, index) => (
        <li key={source.id ?? index} className="flex items-start gap-2">
          <span
            className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400"
            aria-hidden="true"
          />
          <span>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 transition-colors hover:text-blue-800"
              >
                {source.titre ?? source.url}
              </a>
            ) : (
              <span className="font-medium text-zinc-900">{source.titre ?? "Source"}</span>
            )}
            {source.organisme ? <span className="text-zinc-500"> — {source.organisme}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

// Une card de critère, partagée par les formats successifs de
// analyse_par_criteres : tableau structuré (barème 2026 ou schémas
// antérieurs, un objet par critère dont éventuellement le juridique de
// garde-fou), ou objet keyé (plus ancien format à 5 clés). Icône + titre +
// note/max + texte, avec un liseré distinct (ambre) pour le critère
// juridique de garde-fou, un badge si le veto s'est déclenché (schémas
// antérieurs), et un badge si la RÈGLE DE PLAFOND du barème 2026 s'est
// déclenchée sur Opérationnalité & Moyens (plafond_applique, voir
// data/prompt-methodologie.md, section RÈGLE DE PLAFOND).
function CriteriaCard({
  icon,
  label,
  note,
  max,
  isGardeFou,
  vetoApplique,
  plafondApplique,
  plafondDeclencheur,
  texte,
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        isGardeFou ? "border-amber-200 bg-amber-50/50" : "border-blue-100 bg-blue-50/40"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isGardeFou ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-4.5 w-4.5"
            aria-hidden="true"
          >
            {icon}
          </svg>
        </span>
        <p className="text-sm font-bold text-zinc-900">
          {label}
          <span className="ml-1.5 font-medium text-zinc-500">
            — {note ?? "—"}/{max}
          </span>
          {isGardeFou ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Garde-fou
            </span>
          ) : null}
          {vetoApplique ? (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
              Veto appliqué
            </span>
          ) : null}
          {plafondApplique ? (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-700">
              Plafonné — {PLAFOND_DECLENCHEUR_LABELS[plafondDeclencheur] ?? plafondDeclencheur ?? "?"}
            </span>
          ) : null}
        </p>
      </div>
      <p className="mt-3 max-w-[68ch] text-sm leading-7 text-zinc-600">{renderRichText(texte)}</p>
    </div>
  );
}

// Bloc "Analyse par critères" : gère trois formes possibles selon la fiche —
// tableau structuré (barème 2026 ou schémas antérieurs, un objet par
// critère), objet keyé (plus ancien format à 5 clés), ou simple chaîne
// (repli générique) pour tout format non reconnu.
function CriteresCards({ criteres, notation }) {
  if (Array.isArray(criteres)) {
    if (criteres.length === 0) return <TextOrList value={null} />;
    return (
      <div className="flex flex-col gap-4">
        {criteres.map((item, index) => (
          <CriteriaCard
            key={item.critere ?? index}
            icon={CRITERE_ICONS[item.critere] ?? ICON_FACTUEL}
            label={item.titre ?? item.critere ?? "Critère"}
            note={item.note}
            max={item.note_max ?? 25}
            isGardeFou={Boolean(item.est_garde_fou)}
            vetoApplique={Boolean(item.veto_applique)}
            plafondApplique={Boolean(item.plafond_applique)}
            plafondDeclencheur={item.plafond_declencheur}
            texte={item.texte}
          />
        ))}
      </div>
    );
  }

  const hasObjectContent =
    criteres && typeof criteres === "object";

  if (!hasObjectContent) {
    return <TextOrList value={criteres} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {notationLabels.map(({ key, label, max, icon }) => (
        <CriteriaCard
          key={key}
          icon={icon}
          label={label}
          note={notation?.[key]}
          max={max}
          isGardeFou={false}
          vetoApplique={false}
          texte={criteres[key]}
        />
      ))}
    </div>
  );
}

// Seuils calés sur la suggestion "rouge < 8/20, orange 8-14/20, vert > 14/20"
// (40 % / 70 %), exprimés en pourcentage pour rester cohérents quel que soit
// le dénominateur réel du critère (/20, /25 ou /100 pour le garde-fou).
function scoreBarColor(pct) {
  if (pct < 40) return "bg-red-500";
  if (pct < 70) return "bg-orange-400";
  return "bg-emerald-500";
}

function ScoreBar({ icon, label, note, max, isGardeFou, vetoApplique, plafondApplique, plafondDeclencheur }) {
  const pct = note != null ? Math.min(100, Math.max(0, (note / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          isGardeFou ? "bg-amber-100 text-amber-700" : "bg-blue-50 text-blue-600"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-4.5 w-4.5"
          aria-hidden="true"
        >
          {icon}
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-zinc-600">
            {label}
            {vetoApplique ? <span className="ml-1.5 font-semibold text-red-600">· veto appliqué</span> : null}
            {plafondApplique ? (
              <span className="ml-1.5 font-semibold text-red-600">
                · plafonné ({PLAFOND_DECLENCHEUR_LABELS[plafondDeclencheur] ?? plafondDeclencheur ?? "?"})
              </span>
            ) : null}
          </p>
          <p className="shrink-0 text-sm font-bold text-zinc-900">
            {note ?? "—"}
            <span className="text-xs font-medium text-zinc-400">/{max}</span>
          </p>
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full transition-[width] ${scoreBarColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// --- Fiabilité de l'analyse (niveau de confiance + limites) ----------------

const CONFIDENCE_LEVELS = {
  faible: { filled: 1, dotClass: "bg-red-500", label: "Faible", badgeClass: "bg-red-50 text-red-700" },
  moyenne: { filled: 2, dotClass: "bg-orange-400", label: "Moyenne", badgeClass: "bg-orange-50 text-orange-700" },
  elevee: { filled: 3, dotClass: "bg-emerald-500", label: "Élevée", badgeClass: "bg-emerald-50 text-emerald-700" },
};

// Bloc B (à venir) : les prochaines analyses porteront un champ structuré
// dédié niveau_confiance_echelle ("faible"|"moyenne"|"élevée"), à préférer
// dès qu'il existe. En attendant — et pour toutes les fiches déjà publiées,
// qui ne l'auront jamais — on déduit le niveau par mots-clés dans le texte
// existant de niveau_de_confiance. C'est une ESTIMATION, pas une nouvelle
// analyse IA : aucune garantie d'exactitude parfaite sur les fiches
// historiques, volontairement acceptée (voir la demande d'origine).
function estimateConfidenceLevel(value) {
  const text = Array.isArray(value) ? value.join(" ") : value;
  if (typeof text !== "string" || text.trim().length === 0) return "moyenne";
  const normalized = text.trim().toLowerCase();

  // En pratique, le texte commence quasi systématiquement par une étiquette
  // explicite ("Faible.", "Moyen.", "Élevé(e)...") avant l'explication en
  // prose libre : on la préfère à un scan de mots-clés sur tout le texte,
  // qui produit trop de faux positifs (ex. "solidement" contient "solide"
  // et ferait basculer à tort un niveau "moyen" vers "élevée").
  const leadingWord = normalized.match(/^[a-zéèêàâîïôûù]+/)?.[0];
  if (leadingWord === "élevé" || leadingWord === "élevée" || leadingWord === "haute") return "elevee";
  if (leadingWord === "moyen" || leadingWord === "moyenne") return "moyenne";
  if (leadingWord === "faible") return "faible";

  if (/(élevé|haute|solide)/.test(normalized)) return "elevee";
  if (/(faible|insuffisant|limité)/.test(normalized)) return "faible";
  return "moyenne";
}

// Structuré (Bloc B, futur) en priorité, sinon estimation par mots-clés.
function resolveConfidenceLevel(contenu) {
  const structured = contenu.niveau_confiance_echelle;
  if (structured === "faible" || structured === "moyenne") return structured;
  if (structured === "élevée" || structured === "elevee") return "elevee";
  return estimateConfidenceLevel(contenu.niveau_de_confiance);
}

function ConfidenceGauge({ level }) {
  const config = CONFIDENCE_LEVELS[level] ?? CONFIDENCE_LEVELS.moyenne;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${i < config.filled ? config.dotClass : "bg-zinc-200"}`}
          />
        ))}
      </div>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${config.badgeClass}`}>
        {config.label}
      </span>
    </div>
  );
}

// Volontairement plus discrète que les autres blocs de la page (fond gris
// clair sans bordure marquée, texte plus petit, pas de carte pleine
// largeur) : "Niveau de confiance"/"Limites identifiées" sont une
// information secondaire/méta sur l'analyse elle-même, pas un point de
// contenu au même niveau que le raisonnement — sinon la page accumule trop
// de blocs identiques, surtout depuis le traitement "verre dépoli" du
// résumé IA et du verdict (voir .card-glass).
function FiabiliteSection({ contenu }) {
  const level = resolveConfidenceLevel(contenu);
  return (
    <div className="rounded-xl bg-zinc-50 px-5 py-4">
      <span className="block text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
        Fiabilité de l&apos;analyse
      </span>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
        <div className="flex items-start gap-2.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
            aria-hidden="true"
          >
            {ICON_SHIELD}
          </svg>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-zinc-600">Niveau de confiance</span>
              <ConfidenceGauge level={level} />
            </div>
            <div className="mt-1 text-xs leading-6 text-zinc-500">
              <TextOrList value={contenu.niveau_de_confiance} />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
            aria-hidden="true"
          >
            {ICON_WARNING}
          </svg>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-zinc-600">Limites identifiées</span>
            <div className="mt-1 text-xs leading-6 text-zinc-500">
              <TextOrList value={contenu.limites} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Première phrase de resumeAccueil, pour le court commentaire sous le
// badge dans la carte score de la sidebar (pas de nouveau champ IA).
function firstSentence(text) {
  if (!text) return null;
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : text;
}

export default async function DeclarationDetailPage({ params }) {
  const { id } = await params;
  const propositionId = Number(id);

  if (!Number.isInteger(propositionId)) {
    notFound();
  }

  const declaration = await getDeclarationDetail(propositionId);

  if (!declaration || !declaration.analyse) {
    notFound();
  }

  const { analyse } = declaration;
  const contenu = analyse.contenuComplet ?? {};
  // TODO(mesure_vers_objectif) : ce bloc (objectif_court, categorie_objectif,
  // objectif_vise, mecanisme_propose, lien_causal — voir prompt-methodologie.md,
  // point 1 bis) est produit et stocké depuis le barème 2026 mais n'a encore
  // aucun affichage public. Prévu : une flèche schématique en tête de fiche
  // reliant le titre de la mesure à objectif_court (voir la description du
  // champ dans le prompt). Décidé comme non prioritaire pour l'instant — à
  // faire plus tard, pas oublié.
  const badge = getScoreBadge(analyse.scoreFaisabilite);
  const notation = contenu.notation_detaillee ?? {};
  const isNouveauBareme = notation.score_juridique_garde_fou !== undefined;
  // Schéma V3 (pipeline "ajustement juridique bonus-malus", data/prompt-
  // methodologie.md) : qualification_juridique remplace score_juridique_
  // garde_fou/veto_juridique_applique. Comme V2, il utilise 4 critères /25
  // (notationLabelsV2), mais l'incidence juridique n'est plus une note
  // affichée comme un 5e score/jauge — seulement, si non nulle, une
  // explication textuelle (voir plus bas). Ne jamais afficher deux scores
  // concurrents pour une même fiche.
  const qualificationJuridique = contenu.qualification_juridique;
  const isNouveauBaremeV3 = !isNouveauBareme && qualificationJuridique !== undefined;
  // Schéma V4 (pipeline à 4 étapes, recherche bornée + rédaction éditoriale
  // séparée, voir scripts/analyze.js) : seul schéma qui porte un
  // discriminant explicite (schema_version) plutôt qu'un sniffing
  // structurel — contenuComplet n'y contient plus que le contenu déjà
  // publiable (contenuPublic + notation_detaillee + sources_utilisees),
  // jamais les notes de travail internes de l'analyste (voir
  // buildContenuCompletV4 dans scripts/analyze.js). La page affiche donc,
  // pour ces fiches, un résumé plus court que pour les versions antérieures.
  const isV4 = contenu.schema_version === "v4";
  // Barème 2026 (5 critères SANS malus, voir data/prompt-methodologie.md) :
  // détecté par operationnalite_moyens_total, absent de tous les schémas
  // antérieurs. Remplace le malus bonus/malus (isNouveauBareme/
  // isNouveauBaremeV3) par une RÈGLE DE PLAFOND interne à Opérationnalité &
  // Moyens (plafond_applique/plafond_declencheur) — affichée directement
  // par ScoreBar/CriteriaCard, pas par un bloc textuel séparé comme V3.
  const isNouveauBaremeV5 = notation.operationnalite_moyens_total !== undefined;
  const scoreComment = firstSentence(analyse.resumeAccueil);
  const tocSections = isV4
    ? TOC_SECTIONS.filter((section) => section.id === "analyse-criteres" || section.id === "verdict")
    : TOC_SECTIONS;

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start lg:gap-x-8">
          {/* Colonne principale : tout le contenu de lecture, empilé dans
              l'ordre. La hauteur de cette colonne détermine la hauteur de
              la cellule de grille de la sidebar sticky à droite, ce qui lui
              permet de rester épinglée sur toute la longueur de la page. */}
          <div className="flex flex-col gap-6">
            {/* En-tête */}
            <div>
              <Link
                href="/declarations"
                className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
              >
                ← Retour
              </Link>

              {/* Bleu sur cette page uniquement (choix délibéré propre à la
                  fiche déclaration) — les labels de thème identiques
                  ailleurs sur le site (accueil, à propos) restent en rouge,
                  ne pas généraliser cette couleur. */}
              <span className="mt-6 block text-xs font-bold uppercase tracking-widest text-blue-600">
                {declaration.theme}
              </span>
              <h1 className="mt-2 text-[clamp(1.5rem,1.05rem+1.7vw,2.25rem)] font-serif font-bold leading-tight tracking-tight text-zinc-900">
                {declaration.titre}
              </h1>

              <div className="mt-6 flex items-center gap-3">
                <img
                  src={declaration.candidat.photoUrl || "/avatar-placeholder.svg"}
                  alt={declaration.candidat.nom}
                  className="h-11 w-11 shrink-0 rounded-lg object-cover object-top"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-zinc-900">
                    {declaration.candidat.nom}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {declaration.candidat.parti} · {declaration.dateLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Le résumé de Perlimpinpin IA : traitement "verre dépoli"
                (GLASS_STYLE), en écho au Verdict final plus bas — les deux
                points d'entrée clés de la lecture, avant/après le
                raisonnement détaillé. */}
            <section className="rounded-2xl p-6 sm:p-8" style={GLASS_STYLE}>
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
                  />
                </svg>
                Le résumé de Perlimpinpin IA
              </h2>
              <p className="mt-3 text-lg leading-relaxed text-zinc-800 sm:text-xl">
                {analyse.teaser ? renderRichText(analyse.teaser) : "Résumé à venir."}
              </p>
              <Link
                href="#raisonnement-complet"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
              >
                Voir le raisonnement complet
                <span aria-hidden="true">→</span>
              </Link>
            </section>

            {/* Sentinelle invisible : observée par StickyScoreCard pour
                savoir quand basculer du bouton vers le mini-sommaire. */}
            <div id="resume-sentinel" aria-hidden="true" />

            {/* Détail du score */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Détail du score
              </span>

              <div className="mt-4 flex flex-col divide-y divide-zinc-100">
                {isNouveauBaremeV5 ? (
                  // Barème 2026 : 5 critères sans malus, note_max propre à
                  // chacun (30/30/20/10/10) — voir notationLabelsV5. La
                  // RÈGLE DE PLAFOND s'affiche directement sur la barre
                  // "Opérationnalité & Moyens" plutôt que via un bloc
                  // textuel séparé comme l'ancienne V3.
                  notationLabelsV5.map(({ key, label, max, icon }) => (
                    <ScoreBar
                      key={key}
                      icon={icon}
                      label={label}
                      note={notation[key]}
                      max={max}
                      isGardeFou={false}
                      vetoApplique={false}
                      plafondApplique={key === "operationnalite_moyens_total" && Boolean(notation.plafond_applique)}
                      plafondDeclencheur={notation.plafond_declencheur}
                    />
                  ))
                ) : (
                  <>
                    {/* score_juridique_garde_fou (V2), qualification_juridique
                        (V3) et schema_version "v4" désignent tous un barème à
                        4 critères /25 ; leur absence signale une fiche à
                        l'ancien format (5 critères additionnés), pour
                        laquelle on garde l'affichage inchangé. */}
                    {(isNouveauBareme || isNouveauBaremeV3 || isV4 ? notationLabelsV2 : notationLabels).map(
                      ({ key, label, max, icon }) => (
                        <ScoreBar
                          key={key}
                          icon={icon}
                          label={label}
                          note={notation[key]}
                          max={max}
                          isGardeFou={false}
                          vetoApplique={false}
                        />
                      ),
                    )}

                    {isNouveauBareme ? (
                      <ScoreBar
                        icon={ICON_JURIDIQUE}
                        label="Faisabilité juridique (garde-fou)"
                        note={notation.score_juridique_garde_fou}
                        max={100}
                        isGardeFou
                        vetoApplique={Boolean(notation.veto_juridique_applique)}
                      />
                    ) : null}
                  </>
                )}
              </div>

              {/* V3 : l'incidence juridique n'est plus un score séparé —
                  seulement un texte explicatif quand l'ajustement n'est pas
                  nul (voir section 31 de la spec : jamais un second score
                  ni deux jauges concurrentes). */}
              {isNouveauBaremeV3 && qualificationJuridique.ajustement_juridique !== 0 ? (
                <div
                  className={`mt-4 rounded-xl border p-4 ${
                    qualificationJuridique.ajustement_juridique > 0
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-amber-200 bg-amber-50/50"
                  }`}
                >
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      qualificationJuridique.ajustement_juridique > 0 ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    Incidence juridique{" "}
                    {qualificationJuridique.ajustement_juridique > 0
                      ? `positive (+${qualificationJuridique.ajustement_juridique})`
                      : `négative (${qualificationJuridique.ajustement_juridique})`}{" "}
                    sur le score
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-700">
                    {qualificationJuridique.justification_juridique}
                  </p>
                </div>
              ) : null}

              <Link
                href="/methode"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
              >
                Voir comment nous notons
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Vote sur la mesure elle-même — premier exemplaire, proche du
                titre et du score, pour capter le lecteur qui ne lit pas
                toute la fiche. Voir aussi le second exemplaire en bas de
                page, à côté de FeedbackWidget. */}
            <VoteMesureWidget
              propositionId={declaration.id}
              initialAccord={declaration.voteMesureCounts.accord}
              initialDesaccord={declaration.voteMesureCounts.desaccord}
            />

            {/* Extrait analysé */}
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-4 w-4 text-zinc-400"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 8.25h9m-9 3.75h4.5m-8.55 5.865c.5.196 1.032.336 1.582.412a10.5 10.5 0 0 0 9.4-4.5.75.75 0 0 0-.05-.87A10.457 10.457 0 0 0 12 3.75c-5.799 0-10.5 4.701-10.5 10.5 0 1.442.291 2.816.818 4.067a.75.75 0 0 1-.06.727l-1.045 1.567a.375.375 0 0 0 .343.564 4.483 4.483 0 0 0 2.694-.914Z"
                    />
                  </svg>
                  Extrait analysé
                </h2>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                    />
                  </svg>
                  Sources publiques
                </span>
              </div>

              <blockquote className="mt-4 text-base leading-relaxed text-zinc-700">
                &ldquo;{declaration.texteOriginal}&rdquo;
              </blockquote>
            </section>

            {/* Raisonnement complet */}
            <div id="raisonnement-complet" className="flex scroll-mt-24 flex-col gap-6">
              <h2 className="font-serif text-2xl font-bold text-zinc-900">
                Le raisonnement complet
              </h2>

              {/* Schéma V4 : contenuComplet ne porte plus les notes de
                  travail internes de l'analyste (mesure_reformulee,
                  contexte_*, ce_qui_est_etabli/probable/discutable/inconnu,
                  angles_morts, niveau_de_confiance, limites) — elles restent
                  dans analyseCanonique, jamais exposée au front-end (voir
                  scripts/analyze.js, buildContenuCompletV4). Ce bloc reste
                  donc réservé aux fiches antérieures au pipeline à 4 étapes. */}
              {!isV4 ? (
                <>
                  <Section title="Mesure reformulée">
                    <TextOrList value={contenu.mesure_reformulee} />
                  </Section>

                  <Section title="Mise en contexte dans le programme">
                    <TextOrList value={contenu.contexte_programme} />
                  </Section>

                  {/* Empilé plutôt qu'en 2 colonnes : la colonne principale
                      de cette page (2fr d'une grille 2fr/1fr, elle-même
                      plafonnée à max-w-6xl) ne laisse qu'environ 360px par
                      sous-colonne une fois divisée en deux — sous la barre
                      des 65-70 caractères/ligne visée plus haut, quelle que
                      soit la largeur d'écran (le plafond max-w-6xl ne bouge
                      pas). Empilées, ces deux sections profitent de toute la
                      largeur de la colonne (jusqu'à max-w-[68ch] du Section
                      générique), donc plus lisibles que côte à côte ici. */}
                  <div id="contexte" className="scroll-mt-24 flex flex-col gap-6">
                    <Section title="Contexte national">
                      <ContextText value={contenu.contexte_national} />
                    </Section>
                    <Section title="Contexte international">
                      <ContextText value={contenu.contexte_international} />
                    </Section>
                  </div>
                </>
              ) : null}

              <Section id="analyse-criteres" title="Analyse par critères">
                <CriteresCards criteres={contenu.analyse_par_criteres} notation={notation} />
              </Section>

              {!isV4 ? (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <Section title="Ce qui est établi">
                      <TextOrList value={contenu.ce_qui_est_etabli} />
                    </Section>
                    <Section title="Ce qui est probable">
                      <TextOrList value={contenu.ce_qui_est_probable} />
                    </Section>
                    <Section title="Ce qui est discutable">
                      <TextOrList value={contenu.ce_qui_est_discutable} />
                    </Section>
                    <Section title="Ce qui est inconnu">
                      <TextOrList value={contenu.ce_qui_est_inconnu} />
                    </Section>
                  </div>

                  <Section id="angles-morts" title="Angles morts et effets de bord">
                    <TextOrList value={contenu.angles_morts} />
                  </Section>
                </>
              ) : null}

              {/* Verdict final : même traitement "verre dépoli" que le
                  résumé IA en haut de page (voir GLASS_STYLE) plutôt que le
                  Section générique blanc utilisé ailleurs. */}
              <section id="verdict" className="scroll-mt-24 rounded-2xl p-6 sm:p-8" style={GLASS_STYLE}>
                <h2 className="text-lg font-bold text-zinc-900">Verdict final</h2>
                <div className="mt-3 max-w-[68ch] text-sm leading-7 text-zinc-600">
                  <TextOrList value={contenu.verdict_final} />
                </div>
              </section>

              <Section title="Sources utilisées">
                <SourcesList value={contenu.sources_utilisees} />
              </Section>

              {!isV4 ? <FiabiliteSection contenu={contenu} /> : null}
            </div>

            {/* Ordre demandé : "Je trouve cette analyse pertinente" (qualité
                de l'analyse) avant "Et vous, qu'en pensez-vous ?" (mesure
                elle-même) — même mise en page et importance visuelle pour
                les deux, juste avant le bandeau de confiance. */}
            <FeedbackWidget
              analyseId={analyse.id}
              initialLikes={declaration.feedbackCounts.likes}
              initialDislikes={declaration.feedbackCounts.dislikes}
            />

            {/* Vote sur la mesure elle-même — second exemplaire, pour le
                lecteur qui a lu toute la fiche (voir le premier exemplaire
                en haut de page). */}
            <VoteMesureWidget
              propositionId={declaration.id}
              initialAccord={declaration.voteMesureCounts.accord}
              initialDesaccord={declaration.voteMesureCounts.desaccord}
            />

            {/* Bandeau de confiance */}
            <div className="grid grid-cols-1 gap-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-3 sm:p-8">
              <Link
                href="/methode"
                className="flex items-start gap-3 transition-colors hover:text-blue-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-bold text-zinc-900">
                    Méthode transparente
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                    Notre méthode de notation est publique.
                  </p>
                </div>
              </Link>

              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-bold text-zinc-900">
                    Sources publiques
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                    Données vérifiées et citables.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-bold text-zinc-900">
                    Analyse relue
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                    Par des experts et journalistes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar sticky : score permanent + bouton, puis mini-sommaire
              une fois le résumé IA dépassé (voir StickyScoreCard). */}
          <aside className="lg:sticky lg:top-24">
            <StickyScoreCard
              score={analyse.scoreFaisabilite}
              badge={badge}
              scoreComment={scoreComment}
              sections={tocSections}
              versionMethodologie={analyse.versionMethodologie}
              generationDateLabel={declaration.generationDateLabel}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}
