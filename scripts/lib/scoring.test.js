import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeAppreciation,
  computeNiveauImpactAttendu,
  checkNotationCoherence,
  validateEtape1Structure,
  validateFicheCompleteStructure,
  CRITERE_KEYS,
  CRITERE_TO_NOTATION_KEY,
} from "./scoring.js";

// --- Fabriques -----------------------------------------------------------

function makeNotation(overrides = {}) {
  return {
    factuel: 20,
    efficacite: 20,
    operationnel: 20,
    cout: 20,
    somme_4_criteres: 80,
    ajustement_juridique: 0,
    niveau_impact_juridique: "neutre",
    confiance_juridique: "haute",
    justification_juridique: "Aucun obstacle identifié.",
    score_total: 80,
    appreciation: "solide et chiffré",
    ...overrides,
  };
}

// Champs communs à l'étape 1 et à fiche_complete, minimaux mais complets.
function makeChampsCommuns(overrides = {}) {
  return {
    mesure_reformulee: "Une mesure de test.",
    nature_et_existant: "Nature de test.",
    contexte_programme: "Contexte programme de test.",
    contexte_national: "Contexte national de test.",
    contexte_international: "Contexte international de test.",
    impact_environnement: null,
    analyse_longevites: "Analyse longévités de test.",
    impact_temporel_et_sectoriel: null,
    ce_qui_est_etabli: "Établi de test.",
    ce_qui_est_probable: "Probable de test.",
    ce_qui_est_discutable: "Discutable de test.",
    ce_qui_est_inconnu: "Inconnu de test.",
    angles_morts: "Angles morts de test.",
    notation_detaillee: makeNotation(),
    verdict_final: "Verdict de test.",
    sources_utilisees: [],
    niveau_de_confiance: "moyen",
    limites: "Limites de test.",
    ...overrides,
  };
}

function makeEtape1({ champs = {}, ...overrides } = {}) {
  return {
    ...makeChampsCommuns(champs),
    analyse_par_criteres: "Texte libre décrivant les quatre critères.",
    resume_court: "Résumé court de test.",
    phrase_teasing: "Phrase teasing de test.",
    ...overrides,
  };
}

function makeCriteresEtape3({ factuel = 20, efficacite = 20, operationnel = 20, cout = 20 } = {}) {
  return [
    { critere: "solidite_factuelle", titre: "Solidité factuelle et documentaire", note: factuel, note_max: 25, est_juridique: false, texte: "Texte." },
    { critere: "efficacite", titre: "Efficacité attendue", note: efficacite, note_max: 25, est_juridique: false, texte: "Texte." },
    { critere: "operationnel", titre: "Faisabilité opérationnelle", note: operationnel, note_max: 25, est_juridique: false, texte: "Texte." },
    { critere: "cout", titre: "Coût et soutenabilité budgétaire", note: cout, note_max: 25, est_juridique: false, texte: "Texte." },
    { critere: "juridique", titre: "Faisabilité juridique et réglementaire", note: null, note_max: null, est_juridique: true, texte: "Texte juridique." },
  ];
}

function makeFicheComplete({ champs = {}, criteres, ...overrides } = {}) {
  return {
    ...makeChampsCommuns(champs),
    analyse_par_criteres: criteres ?? makeCriteresEtape3(),
    ...overrides,
  };
}

// --- computeAppreciation ----------------------------------------------------

describe("computeAppreciation", () => {
  test("suit le barème 0-19/20-39/.../90-100", () => {
    assert.equal(computeAppreciation(0), "irréaliste");
    assert.equal(computeAppreciation(19), "irréaliste");
    assert.equal(computeAppreciation(20), "fragile");
    assert.equal(computeAppreciation(39), "fragile");
    assert.equal(computeAppreciation(40), "partiellement fondé");
    assert.equal(computeAppreciation(59), "partiellement fondé");
    assert.equal(computeAppreciation(60), "plausible sous condition");
    assert.equal(computeAppreciation(74), "plausible sous condition");
    assert.equal(computeAppreciation(75), "solide et chiffré");
    assert.equal(computeAppreciation(89), "solide et chiffré");
    assert.equal(computeAppreciation(90), "exemplaire");
    assert.equal(computeAppreciation(100), "exemplaire");
  });
});

// --- computeNiveauImpactAttendu (barème -30..+5) ----------------------------

describe("computeNiveauImpactAttendu", () => {
  test("couvre toutes les bandes du barème juridique -30..+5", () => {
    assert.equal(computeNiveauImpactAttendu(5), "bonus");
    assert.equal(computeNiveauImpactAttendu(1), "bonus");
    assert.equal(computeNiveauImpactAttendu(0), "neutre");
    assert.equal(computeNiveauImpactAttendu(-1), "limite");
    assert.equal(computeNiveauImpactAttendu(-5), "limite");
    assert.equal(computeNiveauImpactAttendu(-6), "significatif");
    assert.equal(computeNiveauImpactAttendu(-12), "significatif");
    assert.equal(computeNiveauImpactAttendu(-13), "severe");
    assert.equal(computeNiveauImpactAttendu(-20), "severe");
    assert.equal(computeNiveauImpactAttendu(-21), "majeur");
    assert.equal(computeNiveauImpactAttendu(-30), "majeur");
  });
});

// --- checkNotationCoherence : avertissement, jamais un rejet ---------------

describe("checkNotationCoherence", () => {
  test("notation cohérente -> aucune erreur", () => {
    const errors = checkNotationCoherence(makeNotation());
    assert.deepEqual(errors, []);
  });

  test("somme_4_criteres incohérente avec les 4 notes -> erreur signalée", () => {
    const errors = checkNotationCoherence(makeNotation({ somme_4_criteres: 999 }));
    assert.ok(errors.some((e) => e.includes("somme_4_criteres")));
  });

  test("score_total incohérent avec somme + ajustement -> erreur signalée", () => {
    const errors = checkNotationCoherence(makeNotation({ ajustement_juridique: -10, score_total: 999 }));
    assert.ok(errors.some((e) => e.includes("score_total")));
  });

  test("score_total correctement plafonné (clamp) n'est pas signalé comme incohérent", () => {
    const errors = checkNotationCoherence(
      makeNotation({
        factuel: 25,
        efficacite: 25,
        operationnel: 25,
        cout: 25,
        somme_4_criteres: 100,
        ajustement_juridique: 5,
        niveau_impact_juridique: "bonus",
        score_total: 100,
      }),
    );
    assert.deepEqual(errors, []);
  });

  test("niveau_impact_juridique incohérent avec l'ajustement -> erreur signalée", () => {
    const errors = checkNotationCoherence(makeNotation({ ajustement_juridique: -15, niveau_impact_juridique: "limite", somme_4_criteres: 80, score_total: 65 }));
    assert.ok(errors.some((e) => e.includes("niveau_impact_juridique")));
  });
});

// --- validateEtape1Structure -------------------------------------------------

describe("validateEtape1Structure", () => {
  test("accepte une analyse étape 1 minimale mais complète", () => {
    const result = validateEtape1Structure(makeEtape1());
    assert.equal(result.valid, true, result.errors?.join("; "));
  });

  test("rejette un champ obligatoire manquant (verdict_final)", () => {
    const analyse = makeEtape1();
    delete analyse.verdict_final;
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette analyse_par_criteres si ce n'est pas une chaîne (schéma étape 1)", () => {
    const analyse = makeEtape1({ analyse_par_criteres: ["pas", "une", "chaîne"] });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette une note hors bornes (26/25) dans notation_detaillee", () => {
    const analyse = makeEtape1({ champs: { notation_detaillee: makeNotation({ factuel: 26 }) } });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette un ajustement_juridique hors bornes (-31, en dehors de -30..+5)", () => {
    const analyse = makeEtape1({ champs: { notation_detaillee: makeNotation({ ajustement_juridique: -31, niveau_impact_juridique: "majeur" }) } });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette un niveau_impact_juridique hors énumération", () => {
    const analyse = makeEtape1({ champs: { notation_detaillee: makeNotation({ niveau_impact_juridique: "catastrophique" }) } });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });
});

// --- validateFicheCompleteStructure (étape 3) -------------------------------

describe("validateFicheCompleteStructure", () => {
  test("accepte une fiche complète minimale mais complète (5 critères : 4 + juridique)", () => {
    const result = validateFicheCompleteStructure(makeFicheComplete());
    assert.equal(result.valid, true, result.errors?.join("; "));
  });

  test("rejette moins ou plus de 5 objets dans analyse_par_criteres", () => {
    const fiche = makeFicheComplete({ criteres: makeCriteresEtape3().slice(0, 4) });
    assert.equal(validateFicheCompleteStructure(fiche).valid, false);
  });

  test("rejette un critère dupliqué", () => {
    const criteres = makeCriteresEtape3();
    criteres[4] = { ...criteres[0] }; // écrase le critère juridique par un doublon
    const fiche = makeFicheComplete({ criteres });
    assert.equal(validateFicheCompleteStructure(fiche).valid, false);
  });

  test("rejette l'absence du critère juridique", () => {
    const criteres = makeCriteresEtape3().slice(0, 4);
    criteres.push({ critere: "solidite_factuelle", titre: "doublon", note: 10, note_max: 25, est_juridique: false, texte: "x" });
    const fiche = makeFicheComplete({ criteres });
    assert.equal(validateFicheCompleteStructure(fiche).valid, false);
  });

  test("accepte note/note_max null pour le critère juridique", () => {
    const result = validateFicheCompleteStructure(makeFicheComplete());
    assert.equal(result.valid, true, result.errors?.join("; "));
    const juridique = result.fiche.analyse_par_criteres.find((c) => c.critere === "juridique");
    assert.equal(juridique.note, null);
    assert.equal(juridique.note_max, null);
  });

  test("n'exige pas resume_court/phrase_teasing (absents de fiche_complete)", () => {
    const fiche = makeFicheComplete();
    assert.equal("resume_court" in fiche, false);
    assert.equal(validateFicheCompleteStructure(fiche).valid, true);
  });
});

// --- Constantes de correspondance critère <-> notation ----------------------

describe("CRITERE_KEYS / CRITERE_TO_NOTATION_KEY", () => {
  test("chaque critère a une correspondance dans notation_detaillee", () => {
    for (const key of CRITERE_KEYS) {
      assert.ok(CRITERE_TO_NOTATION_KEY[key], `pas de correspondance pour ${key}`);
    }
  });
});
