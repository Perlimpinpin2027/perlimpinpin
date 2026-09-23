// Modification de texte d'un brouillon depuis /test/[id] : logique PURE (ni Next,
// ni base de données, aucun import) pour pouvoir la tester avec `node --test`
// (scripts/test-edition.test.js). Utilisable côté serveur ET côté client (le
// formulaire s'en sert pour les limites et le contrôle avant envoi).
// L'action qui écrit vraiment en base est dans src/app/test/actions.js.

// --- Miroir de scripts/analyze.js : à garder identique --------------------
// (scripts/analyze.js est un script CLI : on ne l'importe pas, on en copie
// les deux fonctions de troncature et toText pour dériver Proposition.titre,
// Analyse.teaser, Analyse.verdict et Analyse.sourcesUtilisees EXACTEMENT comme
// à la génération de l'analyse.)

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

// Colonnes texte héritées (Analyse.verdict, Analyse.sourcesUtilisees) : un
// tableau devient une liste à puces, un objet {synthese, texte} son `texte`.
export function toText(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && "texte" in value) {
    return toText(value.texte);
  }
  if (Array.isArray(value)) {
    return value.map((item) => `• ${item}`).join("\n");
  }
  return value;
}

// --- Liste blanche des champs modifiables ----------------------------------
// Seuls ces textes de `contenuComplet` peuvent être modifiés. Aucun score,
// aucune note, aucun titre de critère n'y figure, jamais.
//   libelle        : nom affiché au-dessus du champ
//   chemin         : emplacement dans contenuComplet (« * » = index du critère)
//   multiligne     : false = une seule ligne
//   gras           : true = **mot** permis (la fiche le rend en gras)
//   liste          : true = si la valeur est un tableau de chaînes, on l'édite à
//                    raison d'un élément par ligne et on la réenregistre en tableau
//   v4             : true = modifiable seulement sur une fiche schema_version "v4",
//                    et seulement si la valeur existe déjà sous la forme attendue
//   min/max        : longueur du texte une fois normalisé (maxLigne : par élément)
//   aide           : rappel affiché sous le champ
//   derives(valeur): colonnes de la base à tenir à jour en même temps, calculées
//                    comme scripts/analyze.js à la génération, à partir de la
//                    valeur ENREGISTRÉE (tableau pour des sources en tableau) :
//                      titre_fiche       -> Proposition.titre (truncateTitre)
//                      resume_court      -> Analyse.teaser (truncateTeaser)
//                      verdict_final     -> Analyse.verdict (toText)
//                      sources_utilisees -> Analyse.sourcesUtilisees (toText)
//                    Analyse.resumeAccueil n'en fait JAMAIS partie : elle dérive
//                    de teaser_accueil, qui n'est pas modifiable ici.
const AIDE_PARAGRAPHES =
  "Une ligne vide sépare deux paragraphes. Entourez un mot de deux étoiles pour le mettre en gras : **mot**";
const AIDE_GRAS = "Entourez un mot de deux étoiles pour le mettre en gras : **mot**";

export const CHAMPS_EDITABLES = {
  titre_fiche: {
    libelle: "Titre",
    chemin: ["titre_fiche"],
    multiligne: false,
    gras: false,
    min: 3,
    max: 300,
    derives: (valeur) => ({ titreProposition: truncateTitre(valeur) }),
  },
  resume_court: {
    libelle: "Résumé IA",
    chemin: ["resume_court"],
    multiligne: true,
    gras: true,
    min: 20,
    max: 6000,
    aide: AIDE_PARAGRAPHES,
    derives: (valeur) => ({ teaser: truncateTeaser(valeur) }),
  },
  "mesure_vers_objectif.objectif_court": {
    libelle: "Objectif visé",
    chemin: ["mesure_vers_objectif", "objectif_court"],
    multiligne: false,
    gras: false,
    v4: true,
    min: 3,
    max: 300,
  },
  "analyse_par_criteres.*.texte": {
    libelle: "Texte du critère",
    chemin: ["analyse_par_criteres", "*", "texte"],
    multiligne: true,
    gras: true,
    v4: true,
    min: 20,
    max: 6000,
    aide: AIDE_GRAS,
  },
  verdict_final: {
    libelle: "Verdict final",
    chemin: ["verdict_final"],
    multiligne: true,
    gras: true,
    v4: true,
    min: 20,
    max: 6000,
    aide: AIDE_PARAGRAPHES,
    derives: (valeur) => ({ verdict: toText(valeur) }),
  },
  verdict_conclusion: {
    libelle: "Conclusion du verdict",
    chemin: ["verdict_conclusion"],
    multiligne: false,
    gras: true,
    v4: true,
    min: 10,
    max: 1000,
    aide: AIDE_GRAS,
  },
  sources_utilisees: {
    libelle: "Sources utilisées",
    chemin: ["sources_utilisees"],
    multiligne: true,
    gras: true,
    liste: true,
    v4: true,
    min: 3,
    max: 20000,
    maxLigne: 1000,
    aide: "Une source par ligne (les lignes vides sont ignorées). Pour un lien : « Titre de la source, https://… ».",
    derives: (valeur) => ({ sourcesUtilisees: toText(valeur) }),
  },
};

// Index d'un critère : 0 à 99, sans zéro en tête (« 01 » refusé).
const CHAMP_CRITERE = /^analyse_par_criteres\.(0|[1-9]\d?)\.texte$/;

// Nom de champ envoyé par la page pour le texte du critère n° `index`.
export function champCritere(index) {
  return `analyse_par_criteres.${index}.texte`;
}

// Nom de champ (venu du navigateur, donc suspect) -> { regles, chemin } ou null.
// Le motif « analyse_par_criteres.*.texte » lui-même n'est pas un champ valide.
export function resoudreChamp(champ) {
  if (typeof champ !== "string") return null;
  const critere = champ.match(CHAMP_CRITERE);
  if (critere) {
    const regles = CHAMPS_EDITABLES["analyse_par_criteres.*.texte"];
    return { regles, chemin: ["analyse_par_criteres", Number(critere[1]), "texte"] };
  }
  // Object.hasOwn : « constructor », « __proto__ »… ne passent pas pour des champs.
  if (champ.includes("*") || !Object.hasOwn(CHAMPS_EDITABLES, champ)) return null;
  const regles = CHAMPS_EDITABLES[champ];
  return { regles, chemin: regles.chemin };
}

function estObjet(valeur) {
  return valeur !== null && typeof valeur === "object" && !Array.isArray(valeur);
}

// Suit un chemin (clés et index) dans un objet JSON ; undefined dès qu'un maillon manque.
function lireChemin(racine, chemin) {
  let courant = racine;
  for (const cle of chemin) {
    if (courant === null || typeof courant !== "object" || !Object.hasOwn(courant, cle)) return undefined;
    courant = courant[cle];
  }
  return courant;
}

// Valeur actuelle d'un champ dans `contenu` (telle qu'enregistrée : chaîne ou tableau).
export function lireValeur(contenu, champ) {
  const cible = resoudreChamp(champ);
  return cible ? lireChemin(contenu, cible.chemin) : undefined;
}

function estListeDeChaines(valeur) {
  return Array.isArray(valeur) && valeur.every((element) => typeof element === "string");
}

// Texte à pré-remplir dans le champ d'édition, ou null si ce champ n'est pas
// modifiable sur CETTE fiche : champ inconnu, fiche antérieure au schéma v4
// (pour les champs marqués v4), critère absent, ou valeur d'une autre forme
// (ex. sources structurées en objets : les aplatir en texte les abîmerait).
// Sert à la fois à la page (afficher ou non le crayon) et au serveur (refus).
export function texteEditable(contenu, champ) {
  const cible = resoudreChamp(champ);
  if (!cible || !estObjet(contenu)) return null;
  if (cible.regles.v4 && contenu.schema_version !== "v4") return null;
  if (cible.chemin.length > 1) {
    // Le texte vit dans un objet (critère, mesure_vers_objectif)…
    if (!estObjet(lireChemin(contenu, cible.chemin.slice(0, -1)))) return null;
    // … et un critère se désigne par son index dans un vrai tableau.
    if (typeof cible.chemin[1] === "number" && !Array.isArray(contenu[cible.chemin[0]])) return null;
  }

  const valeur = lireChemin(contenu, cible.chemin);
  if (typeof valeur === "string") return valeur;
  if (cible.regles.liste && estListeDeChaines(valeur)) return valeur.join("\n");
  return null;
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
  const cible = resoudreChamp(champ);
  if (!cible) {
    return { ok: false, message: "Ce champ ne peut pas être modifié." };
  }
  if (typeof valeur !== "string") {
    return { ok: false, message: "Le texte est invalide." };
  }

  const { regles } = cible;
  let texte = normaliserTexte(valeur);
  // Liste (sources) : un élément par ligne, espaces autour et lignes vides retirés.
  const lignes = regles.liste
    ? texte
        .split("\n")
        .map((ligne) => ligne.trim())
        .filter(Boolean)
    : null;
  if (lignes) texte = lignes.join("\n");

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
  if (lignes) {
    const tropLongue = lignes.findIndex((ligne) => ligne.length > regles.maxLigne);
    if (tropLongue !== -1) {
      return {
        ok: false,
        message: `La ligne ${tropLongue + 1} est trop longue : ${lignes[tropLongue].length} caractères, maximum ${regles.maxLigne}.`,
      };
    }
  }
  if (!regles.gras) {
    // Champ affiché tel quel (titre, objectif) : des ** y resteraient visibles.
    if (texte.includes("**")) {
      return { ok: false, message: "Ce champ ne peut pas contenir de ** : le gras n'y est pas affiché." };
    }
  } else if (lignes ? lignes.some(aGrasMalAppaire) : aGrasMalAppaire(texte)) {
    // Pour une liste, chaque élément est rendu à part : le gras doit s'y fermer.
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

// Garde-fou explicite : ce qui porte la note ne bouge JAMAIS, quel que soit le
// champ modifié. Lève une erreur si, entre `avant` et `apres` :
//   - notation_detaillee (toutes les notes et le score) a changé ;
//   - schema_version a changé ;
//   - analyse_par_criteres a changé de forme ou de longueur, ou si, dans un
//     critère, autre chose que `texte` a changé (note, note_max, titre, critere…).
export function verifierIntouchables(avant, apres) {
  if (!egalProfond(avant.notation_detaillee, apres.notation_detaillee)) {
    throw new Error("Garde-fou : notation_detaillee a été modifiée par erreur.");
  }
  if (!egalProfond(avant.schema_version, apres.schema_version)) {
    throw new Error("Garde-fou : schema_version a été modifiée par erreur.");
  }
  const criteresAvant = avant.analyse_par_criteres;
  const criteresApres = apres.analyse_par_criteres;
  if (!Array.isArray(criteresAvant)) {
    if (!egalProfond(criteresAvant, criteresApres)) {
      throw new Error("Garde-fou : analyse_par_criteres a été modifiée par erreur.");
    }
    return;
  }
  if (!Array.isArray(criteresApres) || criteresApres.length !== criteresAvant.length) {
    throw new Error("Garde-fou : la liste des critères a changé de longueur.");
  }
  criteresAvant.forEach((critere, index) => {
    const nouveau = criteresApres[index];
    if (!estObjet(critere) || !estObjet(nouveau)) {
      if (!egalProfond(critere, nouveau)) {
        throw new Error(`Garde-fou : le critère n° ${index + 1} a été modifié par erreur.`);
      }
      return;
    }
    const cles = new Set([...Object.keys(critere), ...Object.keys(nouveau)]);
    for (const cle of cles) {
      if (cle === "texte") continue;
      if (Object.hasOwn(critere, cle) !== Object.hasOwn(nouveau, cle) || !egalProfond(critere[cle], nouveau[cle])) {
        throw new Error(`Garde-fou : « ${cle} » du critère n° ${index + 1} a été modifié par erreur.`);
      }
    }
  });
}

// Applique UNE modification à `contenu` (le JSON contenuComplet) sans toucher à
// l'objet reçu. Renvoie { contenu: nouveauContenu, derives } où `derives` liste
// les colonnes à mettre à jour en parallèle (titreProposition, teaser).
// La valeur doit avoir été validée avant (validerTexte). Pour une liste
// enregistrée en tableau (sources), le texte est recoupé en un élément par ligne.
export function appliquerModification(contenu, champ, valeur) {
  const cible = resoudreChamp(champ);
  if (!cible) {
    throw new Error(`Champ non modifiable : ${String(champ)}`);
  }
  if (typeof valeur !== "string") {
    throw new TypeError("La valeur à enregistrer doit être une chaîne de caractères.");
  }
  if (!estObjet(contenu)) {
    throw new Error("Le contenu de l'analyse est illisible : modification refusée.");
  }
  // Champs v4 : la fiche doit être en v4 et la valeur exister sous la forme attendue.
  if (cible.regles.v4 && texteEditable(contenu, champ) === null) {
    throw new Error(`Champ non modifiable sur cette fiche : ${champ}`);
  }

  const { chemin } = cible;
  const cle = chemin.at(-1);
  const avant = lireChemin(contenu, chemin);
  const nouvelleValeur =
    cible.regles.liste && Array.isArray(avant)
      ? valeur
          .split("\n")
          .map((ligne) => ligne.trim())
          .filter(Boolean)
      : valeur;

  const nouveauContenu = structuredClone(contenu);
  const parent = chemin.length > 1 ? lireChemin(nouveauContenu, chemin.slice(0, -1)) : nouveauContenu;
  parent[cle] = nouvelleValeur;

  // Garde-fou n° 1 : à part l'emplacement visé, RIEN ne doit avoir changé (ni
  // valeur, ni clé ajoutée ou retirée). On remet l'ancienne valeur sur une copie
  // et on compare à l'original.
  const controle = structuredClone(nouveauContenu);
  const parentControle = chemin.length > 1 ? lireChemin(controle, chemin.slice(0, -1)) : controle;
  const parentOriginal = chemin.length > 1 ? lireChemin(contenu, chemin.slice(0, -1)) : contenu;
  if (Object.hasOwn(parentOriginal, cle)) parentControle[cle] = parentOriginal[cle];
  else delete parentControle[cle];
  if (!egalProfond(controle, contenu)) {
    throw new Error(`Garde-fou : autre chose que « ${champ} » a été modifié par erreur.`);
  }

  // Garde-fou n° 2 : notes, score et titres des critères, vérifiés un par un.
  verifierIntouchables(contenu, nouveauContenu);

  return { contenu: nouveauContenu, derives: cible.regles.derives?.(nouvelleValeur) ?? {} };
}
