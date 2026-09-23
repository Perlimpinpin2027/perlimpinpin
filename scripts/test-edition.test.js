import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHAMPS_EDITABLES,
  appliquerModification,
  champCritere,
  lireValeur,
  normaliserTexte,
  resoudreChamp,
  texteEditable,
  toText,
  verifierIntouchables,
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

test("liste blanche : titre, résumé et les textes v4 de l'analyse détaillée, avec leurs limites", () => {
  assert.deepEqual(Object.keys(CHAMPS_EDITABLES).sort(), [
    "analyse_par_criteres.*.texte",
    "mesure_vers_objectif.objectif_court",
    "resume_court",
    "sources_utilisees",
    "titre_fiche",
    "verdict_conclusion",
    "verdict_final",
  ]);
  // Titre et résumé : toutes fiches ; les autres : fiches v4 seulement.
  for (const [champ, regles] of Object.entries(CHAMPS_EDITABLES)) {
    assert.equal(Boolean(regles.v4), !["titre_fiche", "resume_court"].includes(champ), champ);
  }
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

test("champ hors liste blanche refusé (notes, scores, titres de critères, noms hérités de Object)", () => {
  for (const champ of [
    "notation_detaillee",
    "notation_detaillee.score_total",
    "score_global",
    "scoreFaisabilite",
    "analyse_par_criteres",
    "analyse_par_criteres.*.texte",
    "analyse_par_criteres.0.note",
    "analyse_par_criteres.0.note_max",
    "analyse_par_criteres.0.titre",
    "analyse_par_criteres.-1.texte",
    "analyse_par_criteres.01.texte",
    "analyse_par_criteres.100.texte",
    "analyse_par_criteres.0.texte.x",
    "mesure_vers_objectif.categorie_objectif",
    "mesure_vers_objectif",
    "schema_version",
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

// --- Champs de l'analyse détaillée (fiches v4) ----------------------------

const CONTENU_V4 = {
  schema_version: "v4",
  titre_fiche: "Titre v4",
  resume_court: "Résumé v4 d'origine, assez long pour être valide.",
  mesure_vers_objectif: { categorie_objectif: "pouvoir_achat", objectif_court: "Objectif d'origine" },
  analyse_par_criteres: [
    { critere: "solidite_faits", titre: "Solidité des faits", note: 18, note_max: 25, texte: "Texte du critère un, d'origine." },
    { critere: "efficacite", titre: "Efficacité", note: 9, note_max: 20, est_garde_fou: false, texte: "Texte du critère deux, d'origine." },
  ],
  verdict_final: "Premier paragraphe du verdict.\n\nSecond paragraphe du verdict.",
  verdict_conclusion: "Conclusion d'origine.",
  sources_utilisees: ["Source A, https://exemple.fr/a", "Source B"],
  notation_detaillee: { score_total: 57, operationnalite_moyens_total: 14 },
};

test("resoudreChamp : chemin exact pour chaque champ, index du critère en nombre", () => {
  assert.deepEqual(resoudreChamp("verdict_final").chemin, ["verdict_final"]);
  assert.deepEqual(resoudreChamp("mesure_vers_objectif.objectif_court").chemin, ["mesure_vers_objectif", "objectif_court"]);
  assert.deepEqual(resoudreChamp(champCritere(1)).chemin, ["analyse_par_criteres", 1, "texte"]);
  assert.equal(champCritere(3), "analyse_par_criteres.3.texte");
  assert.equal(resoudreChamp("analyse_par_criteres.*.texte"), null);
});

test("texteEditable : pré-remplissage des champs v4, sources en une ligne par élément", () => {
  assert.equal(texteEditable(CONTENU_V4, "verdict_final"), CONTENU_V4.verdict_final);
  assert.equal(texteEditable(CONTENU_V4, "verdict_conclusion"), "Conclusion d'origine.");
  assert.equal(texteEditable(CONTENU_V4, "mesure_vers_objectif.objectif_court"), "Objectif d'origine");
  assert.equal(texteEditable(CONTENU_V4, champCritere(1)), "Texte du critère deux, d'origine.");
  assert.equal(texteEditable(CONTENU_V4, "sources_utilisees"), "Source A, https://exemple.fr/a\nSource B");
  assert.equal(texteEditable({ ...CONTENU_V4, sources_utilisees: "Sources en texte." }, "sources_utilisees"), "Sources en texte.");
});

test("texteEditable : pas de crayon hors v4, critère absent, ou valeur d'une forme inattendue", () => {
  const v3 = { ...CONTENU_V4, schema_version: "v3" };
  for (const champ of ["verdict_final", "verdict_conclusion", "sources_utilisees", "mesure_vers_objectif.objectif_court", champCritere(0)]) {
    assert.equal(texteEditable(v3, champ), null, champ);
  }
  // Titre et résumé restent modifiables sur une fiche antérieure.
  assert.equal(texteEditable(v3, "resume_court"), CONTENU_V4.resume_court);

  assert.equal(texteEditable(CONTENU_V4, champCritere(2)), null);
  assert.equal(texteEditable({ ...CONTENU_V4, verdict_conclusion: undefined }, "verdict_conclusion"), null);
  assert.equal(texteEditable({ ...CONTENU_V4, verdict_final: ["a", "b"] }, "verdict_final"), null);
  assert.equal(texteEditable({ ...CONTENU_V4, mesure_vers_objectif: null }, "mesure_vers_objectif.objectif_court"), null);
  // Critères en objet keyé (et non en tableau) : pas d'accès par index.
  assert.equal(texteEditable({ ...CONTENU_V4, analyse_par_criteres: { 0: { texte: "x" } } }, champCritere(0)), null);
  // Sources structurées en objets : les aplatir en texte les abîmerait.
  assert.equal(
    texteEditable({ ...CONTENU_V4, sources_utilisees: [{ titre: "S", url: "https://x.fr" }] }, "sources_utilisees"),
    null,
  );
  assert.equal(texteEditable(null, "verdict_final"), null);
});

test("appliquerModification : texte d'un critère modifié, note, note_max et titre intacts", () => {
  const { contenu, derives } = appliquerModification(CONTENU_V4, champCritere(1), "Nouveau texte du deuxième critère.");
  assert.equal(contenu.analyse_par_criteres[1].texte, "Nouveau texte du deuxième critère.");
  assert.deepEqual(derives, {});
  const { texte: _a, ...resteAvant } = CONTENU_V4.analyse_par_criteres[1];
  const { texte: _b, ...resteApres } = contenu.analyse_par_criteres[1];
  assert.deepEqual(resteApres, resteAvant);
  assert.deepEqual(contenu.analyse_par_criteres[0], CONTENU_V4.analyse_par_criteres[0]);
  assert.deepEqual(contenu.notation_detaillee, CONTENU_V4.notation_detaillee);
  assert.equal(lireValeur(contenu, champCritere(1)), "Nouveau texte du deuxième critère.");
  // L'original n'a pas bougé.
  assert.equal(CONTENU_V4.analyse_par_criteres[1].texte, "Texte du critère deux, d'origine.");
});

test("appliquerModification : objectif, verdict et conclusion modifiés au bon endroit seulement", () => {
  const objectif = appliquerModification(CONTENU_V4, "mesure_vers_objectif.objectif_court", "Nouvel objectif");
  assert.deepEqual(objectif.contenu.mesure_vers_objectif, { categorie_objectif: "pouvoir_achat", objectif_court: "Nouvel objectif" });
  for (const champ of ["verdict_final", "verdict_conclusion"]) {
    const { contenu } = appliquerModification(CONTENU_V4, champ, "Nouveau texte, assez long pour passer.");
    assert.equal(contenu[champ], "Nouveau texte, assez long pour passer.");
    assert.deepEqual({ ...contenu, [champ]: CONTENU_V4[champ] }, CONTENU_V4);
  }
});

test("appliquerModification : sources en tableau reconverties en tableau, en texte restent en texte", () => {
  const { contenu } = appliquerModification(CONTENU_V4, "sources_utilisees", "  Source A, https://exemple.fr/a \n\n Source C  \n");
  assert.deepEqual(contenu.sources_utilisees, ["Source A, https://exemple.fr/a", "Source C"]);
  const enTexte = appliquerModification({ ...CONTENU_V4, sources_utilisees: "Ancien texte" }, "sources_utilisees", "Nouveau texte");
  assert.equal(enTexte.contenu.sources_utilisees, "Nouveau texte");
});

test("appliquerModification : champ v4 refusé sur une fiche antérieure ou de forme inattendue", () => {
  const v3 = { ...CONTENU_V4, schema_version: "v3" };
  assert.throws(() => appliquerModification(v3, "verdict_final", "Texte valide et assez long."), /non modifiable sur cette fiche/);
  assert.throws(
    () => appliquerModification(CONTENU_V4, champCritere(5), "Texte valide et assez long."),
    /non modifiable sur cette fiche/,
  );
  const sourcesObjets = { ...CONTENU_V4, sources_utilisees: [{ titre: "S" }] };
  assert.throws(() => appliquerModification(sourcesObjets, "sources_utilisees", "Une source"), /non modifiable sur cette fiche/);
  const sansConclusion = { ...CONTENU_V4 };
  delete sansConclusion.verdict_conclusion;
  assert.throws(
    () => appliquerModification(sansConclusion, "verdict_conclusion", "Conclusion ajoutée."),
    /non modifiable sur cette fiche/,
  );
});

test("garde-fou verifierIntouchables : note, note_max, titre, notation et schéma protégés explicitement", () => {
  const modifie = (changer) => {
    const copie = structuredClone(CONTENU_V4);
    changer(copie);
    return copie;
  };
  // Changer seulement le texte d'un critère : accepté.
  assert.doesNotThrow(() => verifierIntouchables(CONTENU_V4, modifie((c) => (c.analyse_par_criteres[0].texte = "autre"))));
  const refus = [
    [(c) => (c.analyse_par_criteres[0].note = 25), /« note » du critère n° 1/],
    [(c) => (c.analyse_par_criteres[1].note_max = 25), /« note_max » du critère n° 2/],
    [(c) => (c.analyse_par_criteres[0].titre = "Autre"), /« titre » du critère n° 1/],
    [(c) => delete c.analyse_par_criteres[1].est_garde_fou, /« est_garde_fou »/],
    [(c) => (c.analyse_par_criteres[0].note_bonus = 1), /« note_bonus »/],
    [(c) => c.analyse_par_criteres.pop(), /longueur/],
    [(c) => (c.notation_detaillee.score_total = 90), /notation_detaillee/],
    [(c) => (c.schema_version = "v3"), /schema_version/],
  ];
  for (const [changer, message] of refus) {
    assert.throws(() => verifierIntouchables(CONTENU_V4, modifie(changer)), message);
  }
});

test("validerTexte : règles propres aux nouveaux champs", () => {
  // Objectif : une ligne, sans gras (affiché tel quel).
  assert.equal(validerTexte("mesure_vers_objectif.objectif_court", "Un objectif").ok, true);
  assert.match(validerTexte("mesure_vers_objectif.objectif_court", "Un **objectif**").message, /\*\*/);
  assert.match(validerTexte("mesure_vers_objectif.objectif_court", "Ligne\nautre").message, /seule ligne/);
  // Conclusion : une ligne, gras permis mais bien apparié.
  assert.equal(validerTexte("verdict_conclusion", "Une **conclusion** nette.").ok, true);
  assert.match(validerTexte("verdict_conclusion", "Une **conclusion nette.").message, /mal appariés/);
  assert.match(validerTexte("verdict_conclusion", "Une\nconclusion nette.").message, /seule ligne/);
  // Texte de critère et verdict : plusieurs paragraphes permis.
  assert.equal(validerTexte(champCritere(0), "Paragraphe un du critère.\n\nParagraphe deux.").ok, true);
  assert.equal(validerTexte("verdict_final", "Paragraphe un du verdict.\n\nParagraphe **deux**.").ok, true);
  assert.equal(validerTexte(champCritere(0), "Trop court").ok, false);
});

test("dérivés : chaque champ ne met à jour que ses propres colonnes, jamais resumeAccueil", () => {
  const attendus = {
    titre_fiche: ["titreProposition"],
    resume_court: ["teaser"],
    verdict_final: ["verdict"],
    sources_utilisees: ["sourcesUtilisees"],
    verdict_conclusion: [],
    "mesure_vers_objectif.objectif_court": [],
    [champCritere(0)]: [],
  };
  for (const [champ, colonnes] of Object.entries(attendus)) {
    const { derives } = appliquerModification(CONTENU_V4, champ, "Nouveau texte, assez long pour passer.");
    assert.deepEqual(Object.keys(derives), colonnes, champ);
    assert.ok(!("resumeAccueil" in derives), champ);
  }
});

test("dérivés : verdict copié tel quel (sans troncature), sources en liste à puces comme analyze.js", () => {
  const verdict = `${"Un verdict long. ".repeat(60)}Fin.`;
  assert.deepEqual(appliquerModification(CONTENU_V4, "verdict_final", verdict).derives, { verdict });

  const tableau = appliquerModification(CONTENU_V4, "sources_utilisees", "Source A\n\nSource C");
  assert.deepEqual(tableau.derives, { sourcesUtilisees: "• Source A\n• Source C" });
  // Calculé depuis la valeur ENREGISTRÉE (le tableau), pas depuis le texte saisi.
  assert.equal(tableau.derives.sourcesUtilisees, toText(tableau.contenu.sources_utilisees));

  const texte = appliquerModification({ ...CONTENU_V4, sources_utilisees: "Ancien" }, "sources_utilisees", "Nouveau texte");
  assert.deepEqual(texte.derives, { sourcesUtilisees: "Nouveau texte" });
});

test("validerTexte : sources, une par ligne, lignes vides retirées, gras fermé sur chaque ligne", () => {
  assert.deepEqual(validerTexte("sources_utilisees", " Source A \n\n\n Source B \r\n"), { ok: true, valeur: "Source A\nSource B" });
  assert.match(validerTexte("sources_utilisees", "Source **A\nSource B**").message, /mal appariés/);
  assert.match(
    validerTexte("sources_utilisees", `Source A\n${"x".repeat(1001)}`).message,
    /ligne 2 est trop longue : 1001 caractères, maximum 1000/,
  );
  assert.match(validerTexte("sources_utilisees", "\n  \n").message, /vide/);
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

test("toText donne les mêmes résultats que dans scripts/analyze.js", () => {
  const source = readFileSync(new URL("../scripts/analyze.js", import.meta.url), "utf8");
  const corps = source.match(/function toText\(value\) \{[\s\S]*?\n\}\n/)?.[0];
  assert.ok(corps, "toText introuvable dans scripts/analyze.js");
  const original = new Function(`${corps}\nreturn toText;`)();
  const echantillons = [
    "Un verdict.",
    "",
    null,
    undefined,
    [],
    ["Source A", "Source B, https://exemple.fr"],
    { synthese: "S", texte: "Texte" },
    { synthese: "S", texte: ["a", "b"] },
    { synthese: "S" },
  ];
  for (const echantillon of echantillons) {
    assert.deepEqual(toText(echantillon), original(echantillon), JSON.stringify(echantillon));
  }
});

test("test-edition.js reste autonome : aucun import (ni Next, ni base, ni analyze.js)", () => {
  const source = readFileSync(new URL("../src/lib/test-edition.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /require\(/);
});
