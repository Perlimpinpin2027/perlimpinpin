import { Avatar, ScoreBadge } from "./ui";

// Cartes des dernières analyses enregistrées (table LiveAnalyse).
export default function RecentAnalyses({ analyses }) {
  return (
    <section aria-labelledby="live-recentes" className="mt-10">
      <h2 id="live-recentes" className="text-lg font-bold text-zinc-900">
        Analyses récentes
      </h2>

      {analyses.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
          Aucune analyse pour le moment. Lancez-en une ci-dessus : elle apparaîtra ici.
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
                <ScoreBadge score={analyse.score} />
              </div>
              <p className="line-clamp-3 text-sm font-medium leading-snug text-zinc-900">{analyse.titre}</p>
              <p className="mt-auto text-xs text-zinc-400">
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
