// Modification de texte d'un brouillon depuis /test/[id] : logique PURE (ni Next,
// ni base de données, aucun import) pour pouvoir la tester avec `node --test`
// (scripts/test-edition.test.js). Utilisable côté serveur ET côté client (le
// formulaire s'en sert pour les limites et le contrôle avant envoi).
// L'action qui écrit vraiment en base est dans src/app/test/actions.js.

// --- Miroir de scripts/analyze.js : à garder identique --------------------
// (scripts/analyze.js est un script CLI : on ne l'importe pas, on en copie
// les deux fonctions de troncature pour dériver Proposition.titre et
// Analyse.teaser EXACTEMENT comme à la génération de l'analyse.)

const TITRE_MAX_LENGTH = 80;

// Coupe au dernier espace avant la limite pour éviter de tronquer en plein
// milieu d'un mot.
export function truncateTitre(text) {
  if (text.length <= TITRE_MAX_LENGTH) return text;
  const truncated = text.slice(0, TITRE_MAX_LENGTH);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}

const TEASER_MAX_LENGTH = 500;

// Coupe à la dernière phrase complète avant la limite plutôt qu'en plein
// milieu d'un mot.
export function truncateTeaser(text) {
  if (text.length <= TEASER_MAX_LENGTH) return text;
  const truncated = text.slice(0, TEASER_MAX_LENGTH);
  const lastSentenceEnd = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("! "),
  );
  if (lastSentenceEnd > 200) return truncated.slice(0, lastSentenceEnd + 1);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 200 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}

// --- Liste blanche des champs modifiables ----------------------------------
// Seuls ces champs de `contenuComplet` peuvent être modifiés. Aucun score ni
// aucune note n'y figure, jamais.
//   min/max        : longueur du texte une fois normalisé
//   multiligne     : false = une seule ligne (titre)
//   derives(valeur): colonnes de la base à tenir à jour en même temps, comme le
//                    fait scripts/analyze.js à la génération
//                    (titreProposition -> Proposition.titre, teaser -> Analyse.teaser)
// Champs de la version basique (contenuComplet.version_basique, voir
// src/components/VueBasique.js) : désignés par un chemin [clé racine, sous-clé].
//   type "liste" : un point par ligne, enregistré en tableau de chaînes
//                  (minPoints à maxPoints points de maxParPoint caractères au plus)
//   sansGras     : la version basique s'affiche sans gras, ** refusé
function champVersionBasique(sousCle, libelle, type) {
  const limites =
    type === "liste" ? { minPoints: 2, maxPoints: 5, maxParPoint: 160 } : { min: 20, max: 1500 };
  return {
    libelle,
    chemin: ["version_basique", sousCle],
    type,
    multiligne: true,
    sansGras: true,
    ...limites,
    derives: () => ({}),
  };
}

export const CHAMPS_EDITABLES = {
  titre_fiche: {
    libelle: "Titre",
    multiligne: false,
    min: 3,
    max: 300,
    derives: (valeur) => ({ titreProposition: truncateTitre(valeur) }),
  },
  resume_court: {
    libelle: "Résumé IA",
    multiligne: true,
    min: 20,
    max: 6000,
    derives: (valeur) => ({ teaser: truncateTeaser(valeur) }),
  },
  "version_basique.resume": champVersionBasique("resume", "Résumé (version basique)", "texte"),
  "version_basique.contexte": champVersionBasique("contexte", "Contexte", "texte"),
  "version_basique.analyse": champVersionBasique("analyse", "Analyse de la proposition", "texte"),
  "version_basique.faisabilite": champVersionBasique("faisabilite", "Faisabilité et mise en œuvre", "texte"),
  "version_basique.points_forts": champVersionBasique("points_forts", "Points forts", "liste"),
  "version_basique.points_faibles": champVersionBasique("points_faibles", "Points faibles", "liste"),
};

function champConnu(champ) {
  // Object.hasOwn : « constructor », « __proto__ »… ne passent pas pour des champs.
  return typeof champ === "string" && Object.hasOwn(CHAMPS_EDITABLES, champ);
}

function estObjet(valeur) {
  return valeur !== null && typeof valeur === "object" && !Array.isArray(valeur);
}

// Valeur actuelle d'un champ dans `contenu` (en suivant son chemin s'il en a un).
export function lireChamp(contenu, champ) {
  if (!champConnu(champ)) return undefined;
  const chemin = CHAMPS_EDITABLES[champ].chemin ?? [champ];
  return chemin.reduce((objet, cle) => (estObjet(objet) ? objet[cle] : undefined), contenu);
}

// Texte saisi -> points d'une liste : un point par ligne, lignes vides ignorées.
export function lirePoints(texte) {
  return normaliserTexte(texte)
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter((ligne) => ligne.length > 0);
}

// Valeur enregistrée -> texte brut affiché dans le champ de saisie.
export function valeurEnTexte(champ, valeur) {
  if (champConnu(champ) && CHAMPS_EDITABLES[champ].type === "liste") {
    return Array.isArray(valeur) ? valeur.join("\n") : "";
  }
  return typeof valeur === "string" ? valeur : "";
}

const MESSAGE_SANS_GRAS = "La version basique s'affiche sans gras : retirez les **.";

function validerListe(regles, texte) {
  const points = lirePoints(texte);
  if (points.length < regles.minPoints) {
    return {
      ok: false,
      message: `Il faut au moins ${regles.minPoints} points (un par ligne) : ${points.length} saisi${points.length > 1 ? "s" : ""}.`,
    };
  }
  if (points.length > regles.maxPoints) {
    return {
      ok: false,
      message: `${regles.maxPoints} points au maximum (un par ligne) : ${points.length} saisis.`,
    };
  }
  const tropLong = points.findIndex((point) => point.length > regles.maxParPoint);
  if (tropLong !== -1) {
    return {
      ok: false,
      message: `Le point ${tropLong + 1} est trop long : ${points[tropLong].length} caractères, maximum ${regles.maxParPoint}.`,
    };
  }
  if (points.some((point) => point.includes("**"))) {
    return { ok: false, message: MESSAGE_SANS_GRAS };
  }
  return { ok: true, valeur: points };
}

// Texte saisi -> texte à enregistrer : retours à la ligne Windows/Mac ramenés à
// « \n », espaces de début et de fin retirés. Les lignes vides multiples au
// milieu restent telles quelles (elles séparent les paragraphes du résumé).
export function normaliserTexte(valeur) {
  if (typeof valeur !== "string") {
    throw new TypeError("Le texte doit être une chaîne de caractères.");
  }
  return valeur.replace(/\r\n?/g, "\n").trim();
}

// Même motif que renderRichText (src/app/declarations/[id]/page.js) : un mot en
// gras s'écrit **mot**, sans étoile à l'intérieur.
const GRAS = /\*\*[^*]+\*\*/g;

// Le résumé est découpé en paragraphes sur les lignes vides AVANT le rendu du
// gras : chaque paragraphe doit donc être équilibré à lui seul. Un ** qui reste
// une fois les mots en gras valides retirés (ex. nombre impair de **, ****
// vide, gras à cheval sur deux paragraphes) s'afficherait tel quel sur la fiche.
function aGrasMalAppaire(texte) {
  return texte.split(/\n{2,}/).some((paragraphe) => paragraphe.replace(GRAS, "").includes("**"));
}

// Caractères de contrôle (sauf saut de ligne et tabulation) : le caractère nul
// fait échouer l'enregistrement dans PostgreSQL, les autres n'ont rien à faire
// dans un texte éditorial.
function aCaractereDeControle(texte) {
  for (let position = 0; position < texte.length; position++) {
    const code = texte.charCodeAt(position);
    // Codes 0 à 31 sauf tabulation (9) et saut de ligne (10), et 127 (DEL).
    if ((code < 32 && code !== 9 && code !== 10) || code === 127) return true;
  }
  return false;
}

// Contrôle un texte avant enregistrement. Renvoie { ok: true, valeur } (valeur
// normalisée ; tableau de points pour une liste) ou { ok: false, message } avec
// une explication en français simple.
export function validerTexte(champ, valeur) {
  if (!champConnu(champ)) {
    return { ok: false, message: "Ce champ ne peut pas être modifié." };
  }
  if (typeof valeur !== "string") {
    return { ok: false, message: "Le texte est invalide." };
  }

  const regles = CHAMPS_EDITABLES[champ];
  const texte = normaliserTexte(valeur);

  if (aCaractereDeControle(texte)) {
    return { ok: false, message: "Le texte contient des caractères invisibles non autorisés." };
  }
  if (texte.length === 0) {
    return { ok: false, message: "Le texte est vide." };
  }
  if (regles.type === "liste") return validerListe(regles, texte);
  if (texte.length < regles.min) {
    return {
      ok: false,
      message: `Le texte est trop court : ${texte.length} caractères, minimum ${regles.min}.`,
    };
  }
  if (texte.length > regles.max) {
    return {
      ok: false,
      message: `Le texte est trop long : ${texte.length} caractères, maximum ${regles.max}.`,
    };
  }
  if (!regles.multiligne && texte.includes("\n")) {
    return { ok: false, message: "Ce champ tient sur une seule ligne : retirez les retours à la ligne." };
  }
  if (regles.sansGras) {
    if (texte.includes("**")) return { ok: false, message: MESSAGE_SANS_GRAS };
  } else if (!regles.multiligne) {
    // Le titre s'affiche tel quel (pas de gras) : des ** y resteraient visibles.
    if (texte.includes("**")) {
      return { ok: false, message: "Le titre ne peut pas contenir de ** : le gras n'existe pas dans un titre." };
    }
  } else if (aGrasMalAppaire(texte)) {
    return {
      ok: false,
      message:
        "Il reste des ** mal appariés : un mot en gras s'écrit **mot** (deux étoiles de chaque côté, dans le même paragraphe).",
    };
  }

  return { ok: true, valeur: texte };
}

// Comparaison profonde de valeurs issues de JSON (null, booléens, nombres,
// chaînes, tableaux, objets simples). Volontairement sans dépendance.
function egalProfond(a, b) {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const clesA = Object.keys(a);
  const clesB = Object.keys(b);
  if (clesA.length !== clesB.length) return false;
  return clesA.every((cle) => Object.hasOwn(b, cle) && egalProfond(a[cle], b[cle]));
}

// Garde-fou : entre `avant` et `apres`, à part `cleVisee`, RIEN ne doit avoir
// changé (ni valeur, ni clé ajoutée ou retirée).
function verifierSeuleCleModifiee(avant, apres, cleVisee, prefixe = "") {
  for (const cle of Object.keys(avant)) {
    if (cle === cleVisee) continue;
    if (!Object.hasOwn(apres, cle) || !egalProfond(avant[cle], apres[cle])) {
      throw new Error(`Garde-fou : la clé « ${prefixe}${cle} » a été modifiée par erreur.`);
    }
  }
  for (const cle of Object.keys(apres)) {
    if (cle !== cleVisee && !Object.hasOwn(avant, cle)) {
      throw new Error(`Garde-fou : la clé « ${prefixe}${cle} » a été ajoutée par erreur.`);
    }
  }
}

// Applique UNE modification à `contenu` (le JSON contenuComplet) sans toucher à
// l'objet reçu. Renvoie { contenu: nouveauContenu, derives } où `derives` liste
// les colonnes à mettre à jour en parallèle (titreProposition, teaser).
// La valeur doit avoir été validée avant (validerTexte) : une chaîne, ou un
// tableau de chaînes pour une liste.
export function appliquerModification(contenu, champ, valeur) {
  if (!champConnu(champ)) {
    throw new Error(`Champ non modifiable : ${String(champ)}`);
  }
  const regles = CHAMPS_EDITABLES[champ];
  if (regles.type === "liste") {
    if (!Array.isArray(valeur) || !valeur.every((point) => typeof point === "string")) {
      throw new TypeError("La valeur à enregistrer doit être une liste de chaînes de caractères.");
    }
  } else if (typeof valeur !== "string") {
    throw new TypeError("La valeur à enregistrer doit être une chaîne de caractères.");
  }
  if (!estObjet(contenu)) {
    throw new Error("Le contenu de l'analyse est illisible : modification refusée.");
  }

  const nouveauContenu = structuredClone(contenu);

  if (regles.chemin) {
    const [racine, sousCle] = regles.chemin;
    if (!estObjet(contenu[racine])) {
      throw new Error("Cette fiche n'a pas de version basique : modification refusée.");
    }
    nouveauContenu[racine][sousCle] = structuredClone(valeur);
    // Garde-fou à deux niveaux : seule la clé racine visée change, et en son
    // sein seule la sous-clé visée (sources_principales reste intacte, etc.).
    verifierSeuleCleModifiee(contenu, nouveauContenu, racine);
    verifierSeuleCleModifiee(contenu[racine], nouveauContenu[racine], sousCle, `${racine}.`);
  } else {
    nouveauContenu[champ] = valeur;
    // En particulier, pas notation_detaillee (les notes).
    verifierSeuleCleModifiee(contenu, nouveauContenu, champ);
  }

  if (!egalProfond(contenu.notation_detaillee, nouveauContenu.notation_detaillee)) {
    throw new Error("Garde-fou : notation_detaillee a été modifiée par erreur.");
  }

  return { contenu: nouveauContenu, derives: regles.derives(valeur) };
}
