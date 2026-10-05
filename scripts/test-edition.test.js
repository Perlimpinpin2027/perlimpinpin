import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHAMPS_EDITABLES,
  appliquerModification,
  lireChamp,
  lirePoints,
  normaliserTexte,
  valeurEnTexte,
  truncateTeaser,
  truncateTitre,
  validerTexte,
} from "../src/lib/test-edition.js";

// Modification de texte d'un brouillon (titre, résumé) : validation, normalisation,
// application sans effet de bord, garde-fou sur le reste du contenu, troncatures
// identiques à scripts/analyze.js. Aucune base de données, aucun Next.

const CONTENU = {
  schema_version: "v3",
  titre_fiche: "Titre d'origine de la fiche",
  resume_court: "Résumé d'origine, assez long pour être valide.\n\nSecond paragraphe.",
  verdict_final: "Verdict inchangé.",
  notation_detaillee: {
    solidite_faits_total: 21,
    operationnalite_moyens_total: 14,
    criteres: [{ cle: "a", note: 3 }, { cle: "b", note: 4 }],
  },
  sources_utilisees: ["Source 1, https://exemple.fr/1", "Source 2"],
  nul: null,
};

test("liste blanche : titre_fiche, resume_court et les champs de la version basique, avec leurs limites", () => {
  assert.deepEqual(Object.keys(CHAMPS_EDITABLES).sort(), [
    "resume_court",
    "titre_fiche",
    "version_basique.analyse",
    "version_basique.contexte",
    "version_basique.faisabilite",
    "version_basique.points_faibles",
    "version_basique.points_forts",
    "version_basique.resume",
  ]);
  for (const sousCle of ["resume", "contexte", "analyse", "faisabilite"]) {
    const regles = CHAMPS_EDITABLES[`version_basique.${sousCle}`];
    assert.deepEqual([regles.chemin, regles.type, regles.multiligne, regles.min, regles.max, regles.sansGras], [
      ["version_basique", sousCle],
      "texte",
      true,
      20,
      1500,
      true,
    ]);
  }
  for (const sousCle of ["points_forts", "points_faibles"]) {
    const regles = CHAMPS_EDITABLES[`version_basique.${sousCle}`];
    assert.deepEqual([regles.chemin, regles.type, regles.minPoints, regles.maxPoints, regles.maxParPoint], [
      ["version_basique", sousCle],
      "liste",
      2,
      5,
      160,
    ]);
  }
  // Aucune colonne dérivée pour la version basique.
  for (const [champ, regles] of Object.entries(CHAMPS_EDITABLES)) {
    if (regles.chemin) assert.deepEqual(regles.derives("x"), {}, champ);
  }
  // Les champs existants n'ont pas de chemin : ils restent à la racine.
  assert.equal(CHAMPS_EDITABLES.titre_fiche.chemin, undefined);
  assert.equal(CHAMPS_EDITABLES.resume_court.chemin, undefined);
  assert.deepEqual(
    [CHAMPS_EDITABLES.titre_fiche.multiligne, CHAMPS_EDITABLES.titre_fiche.min, CHAMPS_EDITABLES.titre_fiche.max],
    [false, 3, 300],
  );
  assert.deepEqual(
    [CHAMPS_EDITABLES.resume_court.multiligne, CHAMPS_EDITABLES.resume_court.min, CHAMPS_EDITABLES.resume_court.max],
    [true, 20, 6000],
  );
});

test("titre valide : accepté, espaces de début et de fin retirés", () => {
  assert.deepEqual(validerTexte("titre_fiche", "  Un titre correct  "), { ok: true, valeur: "Un titre correct" });
  assert.equal(validerTexte("titre_fiche", "a".repeat(300)).ok, true);
});

test("titre : saut de ligne refusé (\\n, \\r\\n et \\r seul)", () => {
  for (const texte of ["Ligne un\nLigne deux", "Ligne un\r\nLigne deux", "Ligne un\rLigne deux"]) {
    const resultat = validerTexte("titre_fiche", texte);
    assert.equal(resultat.ok, false, JSON.stringify(texte));
    assert.match(resultat.message, /seule ligne/);
  }
});

test("titre : trop court, trop long et ** refusés", () => {
  assert.match(validerTexte("titre_fiche", "ab").message, /trop court : 2 caractères, minimum 3/);
  assert.match(validerTexte("titre_fiche", "a".repeat(301)).message, /trop long : 301 caractères, maximum 300/);
  // Le titre s'affiche sans gras : même des ** équilibrés y resteraient visibles.
  assert.match(validerTexte("titre_fiche", "Un **titre** en gras").message, /\*\*/);
});

test("résumé : nombre impair de ** refusé, gras équilibré accepté", () => {
  const impair = validerTexte("resume_court", "Un résumé avec un **mot en gras mal fermé, assez long.");
  assert.equal(impair.ok, false);
  assert.match(impair.message, /\*\*/);
  assert.equal(validerTexte("resume_court", "Un résumé avec **un mot** et **deux mots** en gras, ok.").ok, true);
  assert.equal(validerTexte("resume_court", "Un résumé sans aucun gras du tout, simplement long.").ok, true);
});

test("résumé : ** vides ou à cheval sur deux paragraphes refusés (ils s'afficheraient tels quels)", () => {
  // Nombre PAIR de **, mais la fiche ne les rend pas en gras : renderRichText exige
  // du contenu sans étoile entre les **, et découpe d'abord en paragraphes.
  for (const texte of [
    "Un résumé avec **** vide au milieu, assez long.",
    "Premier paragraphe avec **début de gras\n\nSecond paragraphe avec fin de gras** ici.",
    "Un résumé avec **a*b** une étoile dedans, assez long.",
    "Un résumé avec *** trois étoiles, assez long.",
  ]) {
    assert.equal(validerTexte("resume_court", texte).ok, false, texte);
  }
});

test("résumé : trop court (< 20) et trop long (> 6000) refusés", () => {
  assert.match(validerTexte("resume_court", "Trop court.").message, /trop court/);
  assert.equal(validerTexte("resume_court", "a".repeat(20)).ok, true);
  assert.equal(validerTexte("resume_court", "a".repeat(6000)).ok, true);
  assert.match(validerTexte("resume_court", "a".repeat(6001)).message, /trop long : 6001 caractères, maximum 6000/);
});

test("champ hors liste blanche refusé (notes, scores, verdict, noms hérités de Object)", () => {
  for (const champ of [
    "notation_detaillee",
    "score_global",
    "verdict_final",
    "scoreFaisabilite",
    "constructor",
    "__proto__",
    "toString",
    "version_basique",
    "version_basique.sources_principales",
    "version_basique.__proto__",
    "notation_detaillee.solidite_faits_total",
    "",
    undefined,
    null,
    42,
    ["titre_fiche"],
  ]) {
    const resultat = validerTexte(champ, "Un texte parfaitement valide et assez long.");
    assert.equal(resultat.ok, false, String(champ));
    assert.match(resultat.message, /ne peut pas être modifié/);
  }
});

test("texte vide, blanc ou non textuel refusé", () => {
  for (const texte of ["", "   ", "\n\n  \r\n"]) {
    assert.match(validerTexte("resume_court", texte).message, /vide/, JSON.stringify(texte));
  }
  for (const texte of [undefined, null, 12, {}, ["a"]]) {
    assert.equal(validerTexte("resume_court", texte).ok, false, String(texte));
  }
});

test("caractères de contrôle refusés (dont le caractère nul, refusé par PostgreSQL)", () => {
  assert.equal(validerTexte("titre_fiche", `Titre avec${String.fromCharCode(0)}nul`).ok, false);
  assert.equal(validerTexte("resume_court", `Un résumé avec${String.fromCharCode(7)}une cloche, assez long.`).ok, false);
  // La tabulation et le saut de ligne restent permis dans le résumé.
  assert.equal(validerTexte("resume_court", "Un résumé\tavec tabulation\net saut de ligne.").ok, true);
});

test("\\r\\n normalisé en \\n ; lignes vides multiples conservées", () => {
  assert.equal(normaliserTexte("a\r\nb\r\n\r\nc"), "a\nb\n\nc");
  assert.equal(normaliserTexte("a\rb"), "a\nb");
  assert.equal(normaliserTexte("  \n a\n\n\n\nb \n "), "a\n\n\n\nb");
  assert.equal(
    validerTexte("resume_court", "Paragraphe un, assez long.\r\n\r\n\r\nParagraphe deux.").valeur,
    "Paragraphe un, assez long.\n\n\nParagraphe deux.",
  );
  assert.throws(() => normaliserTexte(42), TypeError);
  assert.throws(() => normaliserTexte(null), TypeError);
});

test("appliquerModification : l'objet d'origine n'est pas modifié", () => {
  const copie = structuredClone(CONTENU);
  const { contenu } = appliquerModification(CONTENU, "resume_court", "Nouveau résumé, assez long pour passer.");
  assert.deepEqual(CONTENU, copie);
  assert.notEqual(contenu, CONTENU);
  // Pas de partage de références avec l'original.
  assert.notEqual(contenu.notation_detaillee, CONTENU.notation_detaillee);
  assert.notEqual(contenu.notation_detaillee.criteres, CONTENU.notation_detaillee.criteres);
});

test("appliquerModification : seule la clé visée change, aucune clé ajoutée ou retirée", () => {
  for (const champ of ["titre_fiche", "resume_court"]) {
    const { contenu } = appliquerModification(CONTENU, champ, "Nouvelle valeur de test, assez longue.");
    assert.equal(contenu[champ], "Nouvelle valeur de test, assez longue.");
    assert.deepEqual(Object.keys(contenu), Object.keys(CONTENU));
    for (const cle of Object.keys(CONTENU)) {
      if (cle !== champ) assert.deepEqual(contenu[cle], CONTENU[cle], cle);
    }
  }
});

test("appliquerModification : notation_detaillee strictement intacte", () => {
  const { contenu } = appliquerModification(CONTENU, "titre_fiche", "Un autre titre");
  assert.deepEqual(contenu.notation_detaillee, CONTENU.notation_detaillee);
  assert.equal(JSON.stringify(contenu.notation_detaillee), JSON.stringify(CONTENU.notation_detaillee));
});

test("appliquerModification : clé absente à l'origine → seule cette clé est ajoutée", () => {
  const { titre_fiche: _retire, ...sansTitre } = CONTENU;
  const { contenu } = appliquerModification(sansTitre, "titre_fiche", "Titre ajouté");
  assert.deepEqual(Object.keys(contenu).sort(), [...Object.keys(sansTitre), "titre_fiche"].sort());
  assert.equal(contenu.titre_fiche, "Titre ajouté");
});

test("appliquerModification : dérivés (teaser et titre de la proposition)", () => {
  const long = `${"Une phrase d'un peu plus de trente caractères. ".repeat(20)}`.trim();
  const resume = appliquerModification(CONTENU, "resume_court", long);
  assert.deepEqual(Object.keys(resume.derives), ["teaser"]);
  assert.equal(resume.derives.teaser, truncateTeaser(long));

  const titre = appliquerModification(CONTENU, "titre_fiche", "Un titre court");
  assert.deepEqual(titre.derives, { titreProposition: "Un titre court" });
});

test("appliquerModification : champ interdit, valeur non textuelle ou contenu illisible → erreur", () => {
  assert.throws(() => appliquerModification(CONTENU, "notation_detaillee", "x"), /non modifiable/);
  assert.throws(() => appliquerModification(CONTENU, "__proto__", "x"), /non modifiable/);
  assert.throws(() => appliquerModification(CONTENU, "titre_fiche", 42), TypeError);
  for (const illisible of [null, undefined, "texte", 12, [1, 2]]) {
    assert.throws(() => appliquerModification(illisible, "titre_fiche", "Titre valide"), /illisible/);
  }
});

// --- Troncatures : identiques à scripts/analyze.js ------------------------

test("truncateTitre : court, long avec espaces, long sans espace", () => {
  // Court : inchangé.
  assert.equal(truncateTitre("Retraites : le débat"), "Retraites : le débat");
  // Exactement 80 : inchangé.
  assert.equal(truncateTitre("a".repeat(80)), "a".repeat(80));
  // Long : coupé au dernier espace avant 80 caractères, puis « … ».
  const long = "Une mesure très ambitieuse pour la fiscalité des grandes successions en France depuis toujours";
  const coupe = truncateTitre(long);
  assert.ok(coupe.endsWith("…") && coupe.length <= 81, coupe);
  assert.equal(coupe, "Une mesure très ambitieuse pour la fiscalité des grandes successions en France…");
  // Long sans espace exploitable : coupe franche à 80.
  assert.equal(truncateTitre("b".repeat(120)), `${"b".repeat(80)}…`);
});

test("truncateTeaser : court, long avec fin de phrase, long sans ponctuation", () => {
  assert.equal(truncateTeaser("Un résumé court."), "Un résumé court.");
  assert.equal(truncateTeaser("c".repeat(500)), "c".repeat(500));

  // Long avec fin de phrase : coupé après la dernière phrase complète avant 500.
  const phrases = "Ceci est une phrase de test assez longue pour remplir. ".repeat(12).trim();
  const avecPhrase = truncateTeaser(phrases);
  assert.ok(avecPhrase.length <= 500 && avecPhrase.endsWith("."), avecPhrase.slice(-40));
  assert.ok(!avecPhrase.endsWith("…"));

  // Long sans ponctuation : coupé au dernier espace, puis « … ».
  const sansPonctuation = "mot ".repeat(200).trim();
  const coupe = truncateTeaser(sansPonctuation);
  assert.ok(coupe.endsWith("…") && coupe.length <= 501, coupe.slice(-20));
});

// Garde-fou de dérive : les copies doivent rester IDENTIQUES à celles de
// scripts/analyze.js. Le test lit le vrai fichier, en extrait les deux fonctions
// et compare leurs résultats aux nôtres sur de nombreux textes.
function extraire(source, constante, fonction) {
  const declaration = source.match(new RegExp(`const ${constante} = \\d+;`))?.[0];
  // \r? : le fichier peut être extrait avec des fins de ligne Windows (CRLF).
  const corps = source.match(new RegExp(`function ${fonction}\\(text\\) \\{[\\s\\S]*?\\r?\\n\\}\\r?\\n`))?.[0];
  assert.ok(declaration && corps, `${fonction} introuvable dans scripts/analyze.js`);
  return new Function(`${declaration}\n${corps}\nreturn ${fonction};`)();
}

test("truncateTitre et truncateTeaser donnent les mêmes résultats que dans scripts/analyze.js", () => {
  const source = readFileSync(new URL("../scripts/analyze.js", import.meta.url), "utf8");
  const titreOriginal = extraire(source, "TITRE_MAX_LENGTH", "truncateTitre");
  const teaserOriginal = extraire(source, "TEASER_MAX_LENGTH", "truncateTeaser");

  const echantillons = [
    "",
    "Court.",
    "a".repeat(79),
    "a".repeat(80),
    "a".repeat(81),
    "b".repeat(500),
    "b".repeat(501),
    "b".repeat(1200),
    "Une mesure très ambitieuse pour la fiscalité des grandes successions en France depuis toujours",
    "mot ".repeat(30),
    "mot ".repeat(200).trim(),
    "Phrase un. ".repeat(60).trim(),
    "Est-ce sérieux ? ".repeat(40).trim(),
    "Quelle surprise ! ".repeat(40).trim(),
    `${"x".repeat(210)}. ${"y ".repeat(200)}`,
    `${"x".repeat(150)}. ${"y ".repeat(200)}`,
    `${"z ".repeat(30)}${"w".repeat(100)}`,
    "Ligne un.\n\nLigne deux. ".repeat(40),
  ];
  for (const echantillon of echantillons) {
    assert.equal(truncateTitre(echantillon), titreOriginal(echantillon), `titre : ${echantillon.slice(0, 30)}…`);
    assert.equal(truncateTeaser(echantillon), teaserOriginal(echantillon), `teaser : ${echantillon.slice(0, 30)}…`);
  }
});

test("test-edition.js reste autonome : aucun import (ni Next, ni base, ni analyze.js)", () => {
  const source = readFileSync(new URL("../src/lib/test-edition.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /require\(/);
});

// --- Version basique (contenuComplet.version_basique) ------------------------

const VERSION_BASIQUE = {
  resume: "Résumé simple d'origine, assez long pour être valide.",
  contexte: "Contexte d'origine, assez long pour être valide.",
  analyse: "Analyse d'origine, assez long pour être valide.",
  faisabilite: "Faisabilité d'origine, assez long pour être valide.",
  points_forts: ["Premier point fort", "Second point fort"],
  points_faibles: ["Premier point faible", "Second point faible", "Troisième point faible"],
  sources_principales: [0, 1],
};
const CONTENU_BASIQUE = { ...CONTENU, version_basique: VERSION_BASIQUE };

test("version basique : texte valide accepté (multiligne), limites 20 à 1500", () => {
  for (const sousCle of ["resume", "contexte", "analyse", "faisabilite"]) {
    const champ = `version_basique.${sousCle}`;
    assert.deepEqual(validerTexte(champ, "  Un texte simple\r\nsur deux lignes.  "), {
      ok: true,
      valeur: "Un texte simple\nsur deux lignes.",
    });
    assert.match(validerTexte(champ, "Trop court.").message, /trop court/);
    assert.equal(validerTexte(champ, "a".repeat(20)).ok, true);
    assert.equal(validerTexte(champ, "a".repeat(1500)).ok, true);
    assert.match(validerTexte(champ, "a".repeat(1501)).message, /trop long : 1501 caractères, maximum 1500/);
  }
});

test("version basique : ** refusé dans les textes et les listes, même équilibré", () => {
  for (const sousCle of ["resume", "contexte", "analyse", "faisabilite"]) {
    const resultat = validerTexte(`version_basique.${sousCle}`, "Un texte avec un **mot** en gras, assez long.");
    assert.equal(resultat.ok, false);
    assert.equal(resultat.message, "La version basique s'affiche sans gras : retirez les **.");
  }
  for (const sousCle of ["points_forts", "points_faibles"]) {
    const resultat = validerTexte(`version_basique.${sousCle}`, "Un point\nUn **autre** point");
    assert.equal(resultat.ok, false);
    assert.equal(resultat.message, "La version basique s'affiche sans gras : retirez les **.");
  }
});

test("version basique : liste valide → tableau de chaînes, lignes vides et espaces ignorés", () => {
  assert.deepEqual(validerTexte("version_basique.points_forts", "\n  Un premier point  \r\n\r\n\nUn second point\n\n"), {
    ok: true,
    valeur: ["Un premier point", "Un second point"],
  });
  assert.deepEqual(validerTexte("version_basique.points_faibles", "A\nB\nC\nD\nE"), {
    ok: true,
    valeur: ["A", "B", "C", "D", "E"],
  });
  assert.equal(validerTexte("version_basique.points_forts", `${"a".repeat(160)}\nb`).ok, true);
});

test("version basique : liste de 1 point ou de 6 points refusée, point de plus de 160 caractères refusé", () => {
  const un = validerTexte("version_basique.points_forts", "Un seul point\n\n");
  assert.equal(un.ok, false);
  assert.equal(un.message, "Il faut au moins 2 points (un par ligne) : 1 saisi.");

  const six = validerTexte("version_basique.points_faibles", "A\nB\nC\nD\nE\nF");
  assert.equal(six.ok, false);
  assert.equal(six.message, "5 points au maximum (un par ligne) : 6 saisis.");

  const long = validerTexte("version_basique.points_forts", `Court\n${"a".repeat(161)}`);
  assert.equal(long.ok, false);
  assert.equal(long.message, "Le point 2 est trop long : 161 caractères, maximum 160.");

  assert.match(validerTexte("version_basique.points_forts", "  \n\n ").message, /vide/);
});

test("lirePoints, valeurEnTexte et lireChamp", () => {
  assert.deepEqual(lirePoints(" a \r\n\r\n b \n"), ["a", "b"]);
  assert.equal(valeurEnTexte("version_basique.points_forts", ["Un", "Deux"]), "Un\nDeux");
  assert.equal(valeurEnTexte("version_basique.points_forts", undefined), "");
  assert.equal(valeurEnTexte("resume_court", "Texte"), "Texte");
  assert.equal(lireChamp(CONTENU_BASIQUE, "version_basique.contexte"), VERSION_BASIQUE.contexte);
  assert.equal(lireChamp(CONTENU_BASIQUE, "titre_fiche"), CONTENU.titre_fiche);
  assert.equal(lireChamp(CONTENU, "version_basique.contexte"), undefined);
  assert.equal(lireChamp(CONTENU_BASIQUE, "notation_detaillee"), undefined);
});

test("appliquerModification : texte de la version basique, seule la sous-clé visée change", () => {
  const avant = structuredClone(CONTENU_BASIQUE);
  const { contenu, derives } = appliquerModification(CONTENU_BASIQUE, "version_basique.contexte", "Nouveau contexte.");
  assert.deepEqual(CONTENU_BASIQUE, avant); // objet d'origine intact
  assert.deepEqual(derives, {});
  assert.deepEqual(contenu, {
    ...CONTENU_BASIQUE,
    version_basique: { ...VERSION_BASIQUE, contexte: "Nouveau contexte." },
  });
  assert.deepEqual(contenu.version_basique.sources_principales, [0, 1]);
  assert.deepEqual(contenu.notation_detaillee, CONTENU.notation_detaillee);
});

test("appliquerModification : liste de la version basique enregistrée en tableau", () => {
  const points = ["Un", "Deux", "Trois"];
  const { contenu, derives } = appliquerModification(CONTENU_BASIQUE, "version_basique.points_faibles", points);
  assert.deepEqual(derives, {});
  assert.deepEqual(contenu.version_basique.points_faibles, ["Un", "Deux", "Trois"]);
  assert.notEqual(contenu.version_basique.points_faibles, points); // copie, pas la même référence
  assert.deepEqual(contenu.version_basique.points_forts, VERSION_BASIQUE.points_forts);
  assert.deepEqual(contenu.version_basique.sources_principales, VERSION_BASIQUE.sources_principales);
  assert.deepEqual(contenu.notation_detaillee, CONTENU.notation_detaillee);
  for (const cle of Object.keys(CONTENU)) assert.deepEqual(contenu[cle], CONTENU[cle], cle);
  assert.deepEqual(Object.keys(contenu).sort(), Object.keys(CONTENU_BASIQUE).sort());
});

test("appliquerModification : sous-clé absente de la version basique → seule celle-ci est ajoutée", () => {
  const { contexte: _absent, ...sansContexte } = VERSION_BASIQUE;
  const { contenu } = appliquerModification(
    { ...CONTENU, version_basique: sansContexte },
    "version_basique.contexte",
    "Un contexte ajouté.",
  );
  assert.deepEqual(contenu.version_basique, { ...sansContexte, contexte: "Un contexte ajouté." });
});

test("appliquerModification : fiche sans version_basique (ou illisible) refusée", () => {
  for (const versionBasique of [undefined, null, "texte", ["liste"], 42]) {
    const contenu = versionBasique === undefined ? CONTENU : { ...CONTENU, version_basique: versionBasique };
    assert.throws(
      () => appliquerModification(contenu, "version_basique.resume", "Un résumé valide et assez long."),
      /pas de version basique/,
    );
  }
});

test("appliquerModification : type de valeur vérifié (liste = tableau de chaînes, texte = chaîne)", () => {
  assert.throws(() => appliquerModification(CONTENU_BASIQUE, "version_basique.points_forts", "Un\nDeux"), TypeError);
  assert.throws(() => appliquerModification(CONTENU_BASIQUE, "version_basique.points_forts", ["Un", 2]), TypeError);
  assert.throws(() => appliquerModification(CONTENU_BASIQUE, "version_basique.resume", ["Un", "Deux"]), TypeError);
});

test("appliquerModification : les champs racine n'altèrent pas la version basique", () => {
  const { contenu } = appliquerModification(CONTENU_BASIQUE, "resume_court", "Un nouveau résumé IA, assez long.");
  assert.deepEqual(contenu.version_basique, VERSION_BASIQUE);
  assert.equal(contenu.resume_court, "Un nouveau résumé IA, assez long.");
});
