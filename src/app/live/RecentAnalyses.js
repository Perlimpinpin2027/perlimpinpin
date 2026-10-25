import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import { Avatar, GO_CARD, ScorePill } from "./ui";

// Cartes d'analyses enregistrées (table LiveAnalyse) : analyses récentes de
// l'accueil (une ligne de 4), vues filtrées (dossier, candidat), favoris et
// résultats de recherche (grille).
//   - titre, action : en-tête de la section (action = lien ou bouton à droite) ;
//   - outils : élément placé avant l'action (ex. choix Mes analyses / Toutes) ;
//   - titreClass : taille du titre (plus grand sur l'accueil).
export default function RecentAnalyses({
  analyses,
  titre = "Analyses récentes",
  vide = "Aucune analyse pour le moment. Lancez-en une ci-dessus : elle apparaîtra ici.",
  action = null,
  outils = null,
  showAuthor = false,
  titreClass = "text-2xl",
}) {
  return (
    <section aria-labelledby="live-recentes" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="live-recentes" className={`font-bold tracking-tight text-zinc-900 ${titreClass}`}>
          {titre}
        </h2>
        {(outils || action) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {outils}
            {action}
          </div>
        )}
      </div>

      {analyses.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500">
          {vide}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {analyses.map((analyse) => (
            <AnalyseCard key={analyse.id} analyse={analyse} showAuthor={showAuthor} />
          ))}
        </ul>
      )}
    </section>
  );
}

function AnalyseCard({ analyse, showAuthor }) {
  return (
    <li className={`${GO_CARD} relative flex min-w-0 gap-3.5 p-4 transition-colors hover:border-zinc-300 hover:bg-white`}>
      <Avatar nom={analyse.candidatNom} photoUrl={analyse.candidatPhotoUrl} size={48} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          {/* Lien étendu à toute la carte (after:inset-0) ; l'étoile reste cliquable (z-10) */}
          <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-zinc-900">
            <Link href={`/live/analyses/${analyse.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
              {analyse.titre}
            </Link>
          </p>
          <span className="relative z-10 -mr-1.5 -mt-1 shrink-0">
            <FavoriteButton id={analyse.id} favori={analyse.favori} />
          </span>
        </div>
        <p className="mt-1 truncate text-sm text-zinc-500">{analyse.candidatNom ?? "Candidat non précisé"}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1">
          <p className="min-w-0 text-sm text-zinc-500">
            {analyse.dateLabel}
            {showAuthor && <span className="block truncate text-xs text-zinc-400">Par {analyse.auteurLabel}</span>}
          </p>
          <ScorePill score={analyse.score} />
        </div>
      </div>
    </li>
  );
}
