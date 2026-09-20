import { getScoreBadge } from "@/lib/score";

// Détail d'une mesure analysée : score, verdict, « établi / discutable », détail
// par critère du barème et points à vérifier. Partagé entre la page d'une
// analyse (« Lire l'analyse complète ») et l'affichage sur place quand une
// analyse n'a pas de page.

const PILIERS = { juridique: "juridique", budgetaire: "budgétaire", moyens_humains: "moyens humains" };

// Critères du barème (mêmes libellés et maximums que les fiches publiées).
function criteres(notation) {
  return [
    { label: "Opérationnalité & moyens", note: notation.operationnalite_moyens_total, max: 30 },
    { label: "Efficacité", note: notation.efficacite, max: 30 },
    { label: "Effets rebonds & externalités", note: notation.effets_rebonds_externalites, max: 20 },
    { label: "Degré de préparation", note: notation.degre_preparation, max: 10 },
    { label: "Alignement & logique", note: notation.alignement_logique, max: 10 },
  ];
}

export function MesureCard({ mesure, index }) {
  const notation = mesure.notation_detaillee;
  const badge = getScoreBadge(notation.score_total);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-zinc-400">Mesure {index + 1}</p>
          <h3 className="mt-1 text-lg font-bold leading-snug text-zinc-900">{mesure.mesure_reformulee}</h3>
          <p className="mt-2 text-sm italic text-zinc-500">« {mesure.passage} »</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-3xl font-bold ${badge.scoreClass}`}>
            {notation.score_total}
            <span className="text-base font-normal text-zinc-400">/100</span>
          </p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.badgeClass}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-zinc-800">{mesure.verdict_court}</p>

      <dl className="mt-4 grid gap-3 text-sm leading-relaxed text-zinc-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-zinc-800">Ce qui est établi</dt>
          <dd className="mt-0.5">{mesure.ce_qui_est_etabli}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-800">Ce qui est discutable</dt>
          <dd className="mt-0.5">{mesure.ce_qui_est_discutable}</dd>
        </div>
      </dl>

      <ul className="mt-5 flex flex-col gap-1.5">
        {criteres(notation).map((critere) => (
          <li key={critere.label} className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="w-52 shrink-0">{critere.label}</span>
            <span className="h-1.5 flex-1 rounded-full bg-zinc-100">
              <span
                className="block h-1.5 rounded-full bg-indigo-400"
                style={{ width: `${(critere.note / critere.max) * 100}%` }}
              />
            </span>
            <span className="w-10 shrink-0 text-right font-mono">
              {critere.note}/{critere.max}
            </span>
          </li>
        ))}
      </ul>
      {notation.plafond_applique && (
        <p className="mt-2 text-xs text-amber-700">
          Plafond appliqué à l&apos;opérationnalité (pilier {PILIERS[notation.plafond_declencheur]} fragile).
        </p>
      )}

      {mesure.points_a_verifier.length > 0 && (
        <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">À vérifier avant diffusion</p>
          <ul className="mt-1.5 list-disc pl-4 text-sm text-amber-900">
            {mesure.points_a_verifier.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
