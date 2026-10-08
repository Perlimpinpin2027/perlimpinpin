import { NUANCES_JAUNE } from "@/lib/couleurs-dossier";

// Barre d'avancement d'un dossier : un segment par fiche, jaune des dossiers
// si publiée, jaune clair si en relecture, gris si à venir. `avancement` vient
// de avancementHorsSerie (src/lib/hors-series.js) ; `texte` est la phrase
// lisible (texteAvancement), qui porte l'information pour les lecteurs
// d'écran (la barre est purement visuelle).
const COULEUR_STATUT = {
  publiee: NUANCES_JAUNE[0],
  relecture: NUANCES_JAUNE[2],
  a_venir: "bg-zinc-200",
};

export default function AvancementDossier({ avancement, texte, className = "" }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div aria-hidden="true" className="flex gap-1">
        {avancement.statuts.map((statut, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${COULEUR_STATUT[statut] ?? "bg-zinc-200"}`}
          />
        ))}
      </div>
      <p className="text-xs text-zinc-500">{texte}</p>
    </div>
  );
}
