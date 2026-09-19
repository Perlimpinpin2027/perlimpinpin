import FavoriteButton from "./FavoriteButton";
import { Avatar, ScoreBadge } from "./ui";

// Cartes d'analyses enregistrées (table LiveAnalyse). Sert aux analyses
// récentes, au filtrage par dossier et à la vue Favoris.
export default function RecentAnalyses({
  analyses,
  titre = "Analyses récentes",
  vide = "Aucune analyse pour le moment. Lancez-en une ci-dessus : elle apparaîtra ici.",
  action = null,
}) {
  return (
    <section aria-labelledby="live-recentes" className="mt-10">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="live-recentes" className="text-lg font-bold text-zinc-900">
          {titre}
        </h2>
        {action}
      </div>

      {analyses.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
          {vide}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {analyses.map((analyse) => (
            <li key={analyse.id} className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar nom={analyse.candidatNom} photoUrl={analyse.candidatPhotoUrl} size={32} />
                  <p className="truncate text-sm font-medium text-zinc-700">
                    {analyse.candidatNom ?? "Candidat non précisé"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <ScoreBadge score={analyse.score} />
                  <FavoriteButton id={analyse.id} favori={analyse.favori} />
                </div>
              </div>
              <p className="line-clamp-3 text-sm font-medium leading-snug text-zinc-900">{analyse.titre}</p>
              <p className="mt-auto text-xs text-zinc-400">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium text-zinc-500">
                  {analyse.themeLabel}
                </span>{" "}
                {analyse.dateLabel}
                {analyse.nbMesures > 1 ? ` · ${analyse.nbMesures} mesures (score moyen)` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
