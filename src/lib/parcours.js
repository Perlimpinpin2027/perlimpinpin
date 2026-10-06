import DONNEES from "../../data/candidats-parcours.json" with { type: "json" };

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
  };
}

export function getAllParcours() {
  return DONNEES.candidats.map(versPublic);
}

export function getParcours(slug) {
  const candidat = DONNEES.candidats.find((entry) => entry.slug === slug);
  return candidat ? versPublic(candidat) : null;
}
