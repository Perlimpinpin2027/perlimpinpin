// Mode corrections de l'étape 3 (révision avec commentaires du Club) : au lieu
// de réécrire la fiche entière, le modèle renvoie la liste de ses corrections,
// que le code applique à la fiche relue (format étape 1), puis il recalcule
// la notation et assemble la sortie habituelle de l'étape 3 ({ fiche_complete,
// titre_fiche, resume_court… }), pour que la suite du pipeline ne change pas.
// Fonctions PURES (ni réseau, ni base, ni fichiers), testées dans
// scripts/corrections-etape3.test.js.

import {
  CHAMPS_DERIVES_NOTATION,
  CRITERE_ETAPE3_KEYS,
  CRITERE_NOTE_MAX,
  checkNotationCoherence,
  recalculerNotation,
  validateEtape1Structure,
  validateFicheCompleteStructure,
  validateRevisionRelecture,
} from "./scoring.js";
import { cleanContenu } from "./clean-text.js";

export const MODE_CORRECTIONS = "corrections";
export const MODE_REPLI = "repli_fiche_complete";

// Phrase que la règle 9 de l'étape 3 fait ajouter à la fin de `limites`.
export const PHRASE_REVISION = "Version révisée après relecture du Club";

const TITRES_CRITERES = {
  operationnalite_moyens: "Opérationnalité & Moyens",
  efficacite: "Efficacité",
  effets_rebonds_externalites: "Effets rebonds & Externalités",
  degre_preparation: "Degré de préparation",
  alignement_logique: "Alignement & Logique globale",
};

// Note de chaque critère dans notation_detaillee.
const NOTE_DU_CRITERE = { operationnalite_moyens: "operationnalite_moyens_total" };

// « criteres.texte[2] » ou « criteres.texte.2 » → ["criteres", "texte", 2].
export function lireChemin(chemin) {
  if (typeof chemin !== "string" || !chemin.trim()) return null;
  const segments = [];
  for (const morceau of chemin.trim().split(".")) {
    const m = morceau.match(/^([^[\]]*)((?:\[\d+\])*)$/);
    if (!m) return null;
    if (m[1]) segments.push(/^\d+$/.test(m[1]) ? Number(m[1]) : m[1]);
    for (const [, index] of m[2].matchAll(/\[(\d+)\]/g)) segments.push(Number(index));
  }
  return segments.length && typeof segments[0] === "string" ? segments : null;
}

const compter = (texte, extrait) => texte.split(extrait).length - 1;
const estObjet = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Applique les corrections dans l'ordre, sur une copie de la fiche. Chaque
// correction refusée donne une erreur (renvoyée au modèle) et n'est pas
// appliquée ; les autres le sont. Renvoie { fiche, appliquees, erreurs }.
export function appliquerCorrections(fiche, corrections) {
  const copie = structuredClone(fiche);
  const appliquees = [];
  const erreurs = [];
  if (!Array.isArray(corrections)) {
    return { fiche: copie, appliquees, erreurs: ["corrections : une liste est attendue (vide si rien ne change)."] };
  }

  corrections.forEach((correction, i) => {
    const libelle = `corrections[${i}] (${correction?.champ ?? "champ absent"})`;
    const erreur = (message) => erreurs.push(`${libelle} : ${message}`);
    if (!estObjet(correction)) return erreur("objet { champ, avant, apres, raison } attendu.");
    const { champ, avant, apres, raison } = correction;
    if (typeof raison !== "string" || !raison.trim()) return erreur("raison manquante (une phrase).");
    const segments = lireChemin(champ);
    if (!segments) return erreur("chemin illisible (ex. contexte_national.texte, sources_utilisees[2]).");
    if (segments[0] === "notation_detaillee" && CHAMPS_DERIVES_NOTATION.includes(segments[1])) {
      return erreur(`${segments[1]} est recalculé par le code : ne le corrige jamais, corrige seulement les notes et qualifications.`);
    }

    // Parent du champ visé ; le champ doit déjà exister (jamais de nouvelle clé).
    let parent = copie;
    for (const segment of segments.slice(0, -1)) {
      parent = parent?.[segment];
      if (parent === null || typeof parent !== "object") return erreur("champ introuvable dans la fiche relue.");
    }
    const cle = segments.at(-1);
    if (typeof cle === "number" ? !Array.isArray(parent) || cle >= parent.length : !estObjet(parent) || !(cle in parent)) {
      return erreur("champ introuvable dans la fiche relue.");
    }
    const actuel = parent[cle];

    if (typeof actuel === "number") {
      if (avant !== actuel) return erreur(`« avant » (${JSON.stringify(avant)}) ne correspond pas à la valeur actuelle (${actuel}).`);
      if (!Number.isInteger(apres)) return erreur("« apres » doit être un nombre entier.");
      parent[cle] = apres;
    } else if (typeof actuel === "string") {
      if (typeof apres !== "string") return erreur("« apres » doit être un texte.");
      if (avant === null) {
        if (!apres.trim()) return erreur("ajout vide.");
        parent[cle] = actuel.trim() ? `${actuel.replace(/\s+$/, "")}\n\n${apres}` : apres;
      } else {
        if (typeof avant !== "string" || !avant) return erreur("« avant » doit être un extrait du texte actuel, ou null pour un ajout à la fin.");
        const n = compter(actuel, avant);
        if (n === 0) return erreur(`« avant » introuvable dans le texte actuel du champ : « ${avant} ».`);
        if (n > 1) return erreur(`« avant » apparaît ${n} fois dans le champ : allonge l'extrait pour qu'il soit unique.`);
        parent[cle] = actuel.replace(avant, () => apres);
      }
    } else if (Array.isArray(actuel)) {
      if (avant !== null) return erreur("champ de type liste : vise un élément ([n]) ou mets « avant » à null pour ajouter un élément.");
      if (apres === null || apres === undefined || apres === "") return erreur("élément ajouté vide.");
      actuel.push(apres);
    } else {
      return erreur("champ non modifiable (objet entier ou null) : vise un champ texte, une note ou une liste.");
    }
    appliquees.push({ champ, avant: avant ?? null, apres, raison });
  });

  return { fiche: copie, appliquees, erreurs };
}

// Toutes les chaînes d'une valeur JSON, sauf les sources.
function chaines(valeur, acc = []) {
  if (typeof valeur === "string") acc.push(valeur);
  else if (Array.isArray(valeur)) valeur.forEach((v) => chaines(v, acc));
  else if (estObjet(valeur)) Object.entries(valeur).forEach(([k, v]) => k !== "sources_utilisees" && chaines(v, acc));
  return acc;
}

// Score modifié : plus aucune phrase ne doit citer l'ancien score (« 48/100 »),
// sauf `limites` et la phrase « Version révisée après relecture du Club… »,
// qui le citent légitimement (« passe de 39/100 à 36/100 »).
export function erreursAncienScore(fiche, ancien, nouveau) {
  if (ancien === nouveau) return [];
  const motif = new RegExp(`(^|[^\\d])${ancien}\\s?/\\s?100(?!\\d)`);
  const { limites: _limites, ...sansLimites } = fiche;
  const restes = chaines(sansLimites).filter((texte) => motif.test(texte.split(PHRASE_REVISION)[0]));
  return restes.length
    ? [`Le score passe de ${ancien} à ${nouveau}/100, mais ${restes.length} texte(s) citent encore « ${ancien}/100 » : corrige chaque phrase concernée, par exemple « ${restes[0].slice(0, 120)}… ».`]
    : [];
}

// analyse_par_criteres de l'étape 3 : textes du modèle, notes et plafond du code.
function criteresDuModele(criteres, notation, erreurs) {
  if (!Array.isArray(criteres)) {
    erreurs.push("analyse_par_criteres : liste de 5 objets { critere, titre, texte } attendue.");
    return null;
  }
  const parCle = new Map(criteres.filter(estObjet).map((c) => [c.critere, c]));
  const manquants = CRITERE_ETAPE3_KEYS.filter((cle) => typeof parCle.get(cle)?.texte !== "string" || !parCle.get(cle).texte.trim());
  if (manquants.length || criteres.length !== CRITERE_ETAPE3_KEYS.length) {
    erreurs.push(`analyse_par_criteres : il faut exactement les 5 critères (${CRITERE_ETAPE3_KEYS.join(", ")}), chacun avec un texte${manquants.length ? ` ; manquant ou vide : ${manquants.join(", ")}` : ""}.`);
    return null;
  }
  return CRITERE_ETAPE3_KEYS.map((cle) => {
    const { titre, texte } = parCle.get(cle);
    return {
      critere: cle,
      titre: typeof titre === "string" && titre.trim() ? titre : TITRES_CRITERES[cle],
      note: notation[NOTE_DU_CRITERE[cle] ?? cle],
      note_max: CRITERE_NOTE_MAX[cle],
      ...(cle === "operationnalite_moyens"
        ? { plafond_applique: notation.plafond_applique, plafond_declencheur: notation.plafond_declencheur }
        : {}),
      texte,
    };
  });
}

const CHAMPS_A_REDIGER = ["titre_fiche", "teaser_accueil", "verdict_conclusion"];

// Contrôle complet d'une réponse en mode corrections. Renvoie
// { valid, errors, arbitrage3, appliquees, revision } : arbitrage3 a la forme
// d'une sortie d'étape 3 en fiche complète (voir runPipeline, analyze.js).
export function validerSortieCorrections(reponse, etape1, commentaireIds) {
  const errors = [];
  if (!estObjet(reponse)) return { valid: false, errors: ["Réponse JSON attendue (objet)."], arbitrage3: null, appliquees: [] };

  const { fiche, appliquees, erreurs: erreursCorrections } = appliquerCorrections(etape1, reponse.corrections);
  errors.push(...erreursCorrections);

  for (const champ of CHAMPS_A_REDIGER) {
    if (typeof reponse[champ] !== "string" || !reponse[champ].trim()) errors.push(`${champ} : texte attendu (à rédiger, absent de la fiche relue).`);
  }

  const revision = validateRevisionRelecture(reponse.revision_relecture, commentaireIds);
  if (!revision.valid) errors.push(...revision.errors.map((e) => `revision_relecture : ${e}`));

  // Structure de la fiche corrigée (notes dans leurs bornes, qualifications…),
  // avant le recalcul qui suppose des nombres.
  const structure = validateEtape1Structure(fiche);
  if (!structure.valid) {
    errors.push(...structure.errors.map((e) => `fiche corrigée : ${e}`));
    return { valid: false, errors, arbitrage3: null, appliquees };
  }

  const ancienne = etape1.notation_detaillee;
  const notation = recalculerNotation(fiche.notation_detaillee);
  const corrigee = { ...fiche, notation_detaillee: notation };
  errors.push(...checkNotationCoherence(notation).map((e) => `notation recalculée : ${e}`));
  errors.push(...erreursAncienScore(corrigee, ancienne.score_total, notation.score_total));
  // Liste vide : la fiche relue est reprise telle quelle, sans cette phrase.
  const limites = chaines(corrigee.limites).join("\n");
  if (Array.isArray(reponse.corrections) && reponse.corrections.length > 0 && !limites.includes(PHRASE_REVISION)) {
    errors.push(`limites.texte : ajoute à la fin la phrase « ${PHRASE_REVISION} : … » (correction avec « avant » à null), même si aucune note ne change.`);
  }

  const criteres = criteresDuModele(reponse.analyse_par_criteres, notation, errors);
  if (errors.length || !criteres) return { valid: false, errors, arbitrage3: null, appliquees };

  const { resume_court: resumeCourt, phrase_teasing: _teasing, analyse_par_criteres: _texteCriteres, ...reste } = corrigee;
  const arbitrage3 = {
    auditArbitrage: Array.isArray(reponse.auditArbitrage) ? reponse.auditArbitrage : [],
    fiche_complete: { ...reste, analyse_par_criteres: criteres, verdict_conclusion: reponse.verdict_conclusion },
    titre_fiche: reponse.titre_fiche,
    resume_court: resumeCourt,
    teaser_accueil: reponse.teaser_accueil,
    verdict_final: corrigee.verdict_final,
    verdict_conclusion: reponse.verdict_conclusion,
    revision_relecture: reponse.revision_relecture,
  };

  // Mêmes contrôles que la fiche complète (après le nettoyage de runPipeline).
  const finale = validateFicheCompleteStructure(cleanContenu(arbitrage3.fiche_complete));
  if (!finale.valid) {
    errors.push(...finale.errors.map((e) => `fiche finale : ${e}`));
    return { valid: false, errors, arbitrage3: null, appliquees };
  }
  return { valid: true, errors: [], arbitrage3, appliquees, revision: revision.revision };
}
