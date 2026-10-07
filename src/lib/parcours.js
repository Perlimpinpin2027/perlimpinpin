import DONNEES from "../../data/candidats-parcours.json" with { type: "json" };
import CONDAMNATIONS from "../../data/condamnations.json" with { type: "json" };

const SANS_CONDAMNATION = { definitives: [], non_definitives: [], note: null, sources: [] };

// Date de dernière vérification des condamnations (AAAA-MM-JJ).
export const DATE_VERIFICATION_CONDAMNATIONS = CONDAMNATIONS._meta.date_verification;

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
  };
}

export function getAllParcours() {
  return DONNEES.candidats.map(versPublic);
}

export function getParcours(slug) {
  const candidat = DONNEES.candidats.find((entry) => entry.slug === slug);
  return candidat ? versPublic(candidat) : null;
}
