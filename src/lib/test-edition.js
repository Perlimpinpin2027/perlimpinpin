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
// Seuls ces champs de `contenuComplet` (à la racine) peuvent être modifiés. À
// étendre à l'étape 5. Aucun score ni aucune note n'y figure, jamais.
//   min/max        : longueur du texte une fois normalisé
//   multiligne     : false = une seule ligne (titre)
//   derives(valeur): colonnes de la base à tenir à jour en même temps, comme le
//                    fait scripts/analyze.js à la génération
//                    (titreProposition -> Proposition.titre, teaser -> Analyse.teaser)
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
};

function champConnu(champ) {
  // Object.hasOwn : « constructor », « __proto__ »… ne passent pas pour des champs.
  return typeof champ === "string" && Object.hasOwn(CHAMPS_EDITABLES, champ);
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
// normalisée) ou { ok: false, message } avec une explication en français simple.
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
  if (!regles.multiligne) {
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

// Applique UNE modification à `contenu` (le JSON contenuComplet) sans toucher à
// l'objet reçu. Renvoie { contenu: nouveauContenu, derives } où `derives` liste
// les colonnes à mettre à jour en parallèle (titreProposition, teaser).
// La valeur doit avoir été validée avant (validerTexte).
export function appliquerModification(contenu, champ, valeur) {
  if (!champConnu(champ)) {
    throw new Error(`Champ non modifiable : ${String(champ)}`);
  }
  if (typeof valeur !== "string") {
    throw new TypeError("La valeur à enregistrer doit être une chaîne de caractères.");
  }
  if (contenu === null || typeof contenu !== "object" || Array.isArray(contenu)) {
    throw new Error("Le contenu de l'analyse est illisible : modification refusée.");
  }

  const nouveauContenu = structuredClone(contenu);
  nouveauContenu[champ] = valeur;

  // Garde-fou : à part la clé visée, RIEN ne doit avoir changé (ni valeur, ni clé
  // ajoutée ou retirée) — en particulier pas notation_detaillee (les notes).
  for (const cle of Object.keys(contenu)) {
    if (cle === champ) continue;
    if (!Object.hasOwn(nouveauContenu, cle) || !egalProfond(contenu[cle], nouveauContenu[cle])) {
      throw new Error(`Garde-fou : la clé « ${cle} » a été modifiée par erreur.`);
    }
  }
  for (const cle of Object.keys(nouveauContenu)) {
    if (cle !== champ && !Object.hasOwn(contenu, cle)) {
      throw new Error(`Garde-fou : la clé « ${cle} » a été ajoutée par erreur.`);
    }
  }
  if (!egalProfond(contenu.notation_detaillee, nouveauContenu.notation_detaillee)) {
    throw new Error("Garde-fou : notation_detaillee a été modifiée par erreur.");
  }

  return { contenu: nouveauContenu, derives: CHAMPS_EDITABLES[champ].derives(valeur) };
}
