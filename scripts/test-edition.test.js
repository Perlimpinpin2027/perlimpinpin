import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHAMPS_EDITABLES,
  appliquerModification,
  normaliserTexte,
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

test("liste blanche : seulement titre_fiche et resume_court, avec leurs limites", () => {
  assert.deepEqual(Object.keys(CHAMPS_EDITABLES).sort(), ["resume_court", "titre_fiche"]);
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
  const corps = source.match(new RegExp(`function ${fonction}\\(text\\) \\{[\\s\\S]*?\\n\\}\\n`))?.[0];
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
