// PerlimpinPOINTS et rangs du Club Perlimpinpin, sans Next ni Prisma (testé
// avec `node --test`, scripts/club-points.test.js).
//
// Les points sont recalculés à chaque fois depuis les commentaires en base :
// pas de compteur stocké, donc un commentaire supprimé fait perdre ses points.

export const POINTS_PAR_COMMENTAIRE = 10;
// Au-delà de 5 commentaires sur une même fiche, les commentaires sont acceptés
// mais ne rapportent plus rien.
export const MAX_COMMENTAIRES_PAR_FICHE = 5;
// Commentaire retenu dans la version suivante de la fiche : bonus hors plafond.
export const BONUS_RETENU = 20;

// Du plus bas au plus haut : un palier tous les 150 points, Diamant = rang maximal.
export const RANGS = [
  { rang: "Bronze", palier: 0 },
  { rang: "Silver", palier: 150 },
  { rang: "Gold", palier: 300 },
  { rang: "Platine", palier: 450 },
  { rang: "Diamant", palier: 600 },
];

// commentaires : [{ ficheSlug, retenu }] d'un même adhérent (commentaires de
// section et annotations confondus).
export function calculerPoints(commentaires) {
  const parFiche = new Map();
  let retenus = 0;
  for (const c of commentaires) {
    parFiche.set(c.ficheSlug, (parFiche.get(c.ficheSlug) ?? 0) + 1);
    if (c.retenu === true) retenus += 1;
  }
  let comptes = 0;
  for (const n of parFiche.values()) comptes += Math.min(n, MAX_COMMENTAIRES_PAR_FICHE);
  return comptes * POINTS_PAR_COMMENTAIRE + retenus * BONUS_RETENU;
}

// { rang, palier, prochainRang, pointsAvantProchain } ; au rang maximal,
// prochainRang et pointsAvantProchain valent null.
export function rangPour(points) {
  const p = Number.isFinite(points) && points > 0 ? points : 0;
  let i = 0;
  while (i + 1 < RANGS.length && p >= RANGS[i + 1].palier) i += 1;
  const prochain = RANGS[i + 1] ?? null;
  return {
    rang: RANGS[i].rang,
    palier: RANGS[i].palier,
    prochainRang: prochain?.rang ?? null,
    pointsAvantProchain: prochain ? prochain.palier - p : null,
  };
}

// Tout ce qu'affiche le panneau « Mon compte » (GET /api/relectures/moi).
export function bilanAdherent(commentaires) {
  const points = calculerPoints(commentaires);
  return {
    points,
    ...rangPour(points),
    nbCommentaires: commentaires.length,
    nbRetenus: commentaires.filter((c) => c.retenu === true).length,
    nbFichesCommentees: new Set(commentaires.map((c) => c.ficheSlug)).size,
  };
}
