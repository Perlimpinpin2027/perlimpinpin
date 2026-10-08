import DONNEES from "../../data/candidats-parcours.json" with { type: "json" };
import CONDAMNATIONS from "../../data/condamnations.json" with { type: "json" };
import REMUNERATIONS from "../../data/remunerations-moyens.json" with { type: "json" };

const SANS_CONDAMNATION = { definitives: [], non_definitives: [], note: null, sources: [] };

// Date de dernière vérification des condamnations (AAAA-MM-JJ).
export const DATE_VERIFICATION_CONDAMNATIONS = CONDAMNATIONS._meta.date_verification;

// Rémunérations et moyens (data/remunerations-moyens.json) : avertissement et
// date de dernière vérification (AAAA-MM-JJ), affichés sous la grille.
export const AVERTISSEMENT_REMUNERATIONS = REMUNERATIONS._meta.avertissement;
export const DATE_VERIFICATION_REMUNERATIONS = REMUNERATIONS._meta.derniere_verification;

// Un montant pas encore renseigné n'est jamais affiché.
const aCompleter = (montant) => String(montant).includes("À COMPLÉTER");

// Rémunérations d'un candidat, sans les montants « À COMPLÉTER ». Les
// montants HATVP par année ({ "2023": "…" }) deviennent une liste triée.
function remunerationsPubliques(slug) {
  const donnees = REMUNERATIONS.candidats[slug];
  if (!donnees) return null;
  const sansACompleter = (lignes = []) => lignes.filter(({ montant }) => !aCompleter(montant));
  const hatvp = donnees.hatvp ?? null;

  return {
    sans_mandat: donnees.sans_mandat === true,
    remuneration_personnelle: sansACompleter(donnees.remuneration_personnelle),
    moyens_du_mandat: sansACompleter(donnees.moyens_du_mandat),
    hatvp: hatvp && {
      statut: hatvp.statut ?? null,
      declaration: hatvp.declaration ?? null,
      url: hatvp.url ?? null,
      lignes: (hatvp.lignes ?? [])
        .map(({ libelle, montants = {} }) => ({
          libelle,
          montants: Object.entries(montants)
            .filter(([, montant]) => !aCompleter(montant))
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([annee, montant]) => ({ annee, montant })),
        }))
        .filter((ligne) => ligne.montants.length),
    },
  };
}

// Parcours des candidats (data/candidats-parcours.json, validé
// éditorialement). Les champs `_meta` et `points_a_verifier` ne doivent
// jamais être affichés : on ne renvoie que les champs publics.
function versPublic(candidat) {
  return {
    slug: candidat.slug,
    prenom: candidat.prenom,
    nom: candidat.nom,
    parti: candidat.parti,
    mandat_actuel: candidat.mandat_actuel ?? [],
    experience_politique: candidat.experience_politique ?? [],
    hors_mandat_electif: candidat.hors_mandat_electif ?? [],
    etudes: candidat.etudes ?? [],
    note_contexte: candidat.note_contexte ?? null,
    sources: candidat.sources ?? [],
    indemnites_elu: candidat.indemnites_elu ?? null,
    frais_mandat: candidat.frais_mandat ?? null,
    revenus_declares_hatvp: candidat.revenus_declares_hatvp ?? null,
    hatvp_url: candidat.hatvp_url ?? null,
    // data/condamnations.json, rattaché par le slug.
    condamnations: CONDAMNATIONS.candidats[candidat.slug] ?? SANS_CONDAMNATION,
    // data/remunerations-moyens.json, rattaché par le slug.
    remunerations: remunerationsPubliques(candidat.slug),
  };
}

export function getAllParcours() {
  return DONNEES.candidats.map(versPublic);
}

export function getParcours(slug) {
  const candidat = DONNEES.candidats.find((entry) => entry.slug === slug);
  return candidat ? versPublic(candidat) : null;
}
