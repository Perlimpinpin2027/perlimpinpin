import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeAppreciation,
  checkNotationCoherence,
  validateEtape1Structure,
  validateFicheCompleteStructure,
  CRITERE_ETAPE3_KEYS,
  CRITERE_NOTE_MAX,
  CATEGORIES_OBJECTIF,
} from "./scoring.js";

// --- Fabriques -----------------------------------------------------------

function makeNotation(overrides = {}) {
  return {
    operationnalite_juridique: 8,
    qualification_juridique: "SOLIDE",
    operationnalite_budgetaire: 8,
    qualification_budgetaire: "SOLIDE",
    operationnalite_moyens_humains: 8,
    qualification_moyens_humains: "SOLIDE",
    operationnalite_moyens_total: 24,
    plafond_applique: false,
    plafond_declencheur: null,
    efficacite: 24,
    qualification_efficacite: "SOLIDE",
    effets_rebonds_externalites: 16,
    qualification_effets_rebonds: "SOLIDE",
    degre_preparation: 8,
    qualification_preparation: "SOLIDE",
    alignement_logique: 8,
    qualification_alignement: "SOLIDE",
    score_total: 80,
    appreciation: "solide et chiffré",
    ...overrides,
  };
}

function makeMesureVersObjectif(overrides = {}) {
  return {
    objectif_court: "Réduire le déficit du système de retraites.",
    categorie_objectif: "Retraites",
    objectif_vise: "Assurer la pérennité financière du système par répartition.",
    mecanisme_propose: "Report de l'âge légal de départ à la retraite.",
    lien_causal: "direct",
    ...overrides,
  };
}

// Champs communs à l'étape 1 et à fiche_complete, minimaux mais complets.
function makeChampsCommuns(overrides = {}) {
  return {
    mesure_reformulee: "Une mesure de test.",
    mesure_vers_objectif: makeMesureVersObjectif(),
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
    analyse_par_criteres: "Texte libre décrivant les cinq critères.",
    resume_court: "Résumé court de test.",
    phrase_teasing: "Phrase teasing de test.",
    ...overrides,
  };
}

function makeCriteresEtape3(overrides = {}) {
  return [
    {
      critere: "operationnalite_moyens",
      titre: "Opérationnalité & Moyens",
      note: 24,
      note_max: 30,
      plafond_applique: false,
      plafond_declencheur: null,
      texte: "Texte.",
      ...(overrides.operationnalite_moyens ?? {}),
    },
    { critere: "efficacite", titre: "Efficacité", note: 24, note_max: 30, texte: "Texte.", ...(overrides.efficacite ?? {}) },
    {
      critere: "effets_rebonds_externalites",
      titre: "Effets rebonds & Externalités",
      note: 16,
      note_max: 20,
      texte: "Texte.",
      ...(overrides.effets_rebonds_externalites ?? {}),
    },
    { critere: "degre_preparation", titre: "Degré de préparation", note: 8, note_max: 10, texte: "Texte.", ...(overrides.degre_preparation ?? {}) },
    { critere: "alignement_logique", titre: "Alignement & Logique globale", note: 8, note_max: 10, texte: "Texte.", ...(overrides.alignement_logique ?? {}) },
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

// --- checkNotationCoherence : avertissement, jamais un rejet ---------------

describe("checkNotationCoherence", () => {
  test("notation cohérente -> aucune erreur", () => {
    const errors = checkNotationCoherence(makeNotation());
    assert.deepEqual(errors, []);
  });

  test("operationnalite_moyens_total incohérent avec les 3 sous-composantes -> erreur signalée", () => {
    const errors = checkNotationCoherence(makeNotation({ operationnalite_moyens_total: 999 }));
    assert.ok(errors.some((e) => e.includes("operationnalite_moyens_total")));
  });

  test("score_total incohérent avec la somme des 5 critères -> erreur signalée", () => {
    const errors = checkNotationCoherence(makeNotation({ score_total: 999 }));
    assert.ok(errors.some((e) => e.includes("score_total")));
  });

  test("RÈGLE DE PLAFOND : une sous-composante FRAGILE (<3/10) plafonne le total à 10/30", () => {
    const notation = makeNotation({
      operationnalite_juridique: 2,
      qualification_juridique: "FRAGILE",
      operationnalite_moyens_total: 10,
      plafond_applique: true,
      plafond_declencheur: "juridique",
      score_total: 66, // 10 + 24 + 16 + 8 + 8
      appreciation: "plausible sous condition",
    });
    const errors = checkNotationCoherence(notation);
    assert.deepEqual(errors, []);
  });

  test("plafond non appliqué alors qu'une sous-composante est FRAGILE -> erreur signalée", () => {
    const notation = makeNotation({
      operationnalite_juridique: 2,
      operationnalite_moyens_total: 18, // 2+8+8, non plafonné à 10
      plafond_applique: false,
      plafond_declencheur: null,
    });
    const errors = checkNotationCoherence(notation);
    assert.ok(errors.some((e) => e.includes("operationnalite_moyens_total") || e.includes("plafond_applique")));
  });

  test("plafond_declencheur pointe la sous-composante la plus basse si plusieurs sont FRAGILE", () => {
    const notation = makeNotation({
      operationnalite_juridique: 2,
      operationnalite_budgetaire: 1,
      operationnalite_moyens_total: 10,
      plafond_applique: true,
      plafond_declencheur: "budgetaire",
      score_total: 66,
      appreciation: "plausible sous condition",
    });
    const errors = checkNotationCoherence(notation);
    assert.deepEqual(errors, []);
  });

  test("plafond_declencheur incorrect (mauvaise sous-composante) -> erreur signalée", () => {
    const notation = makeNotation({
      operationnalite_juridique: 2,
      operationnalite_budgetaire: 1,
      operationnalite_moyens_total: 10,
      plafond_applique: true,
      plafond_declencheur: "juridique", // devrait être "budgetaire" (le plus bas)
      score_total: 66,
    });
    const errors = checkNotationCoherence(notation);
    assert.ok(errors.some((e) => e.includes("plafond_declencheur")));
  });

  test("appreciation incohérente avec score_total -> erreur signalée", () => {
    const errors = checkNotationCoherence(makeNotation({ appreciation: "exemplaire" }));
    assert.ok(errors.some((e) => e.includes("appreciation")));
  });

  test("aucune trace de l'ancien système de malus (ajustement_juridique) dans le calcul", () => {
    // score_total ne doit dépendre que des 5 critères, jamais d'un ajustement
    // séparé : une notation sans aucun champ juridique-malus reste cohérente.
    const notation = makeNotation();
    assert.equal("ajustement_juridique" in notation, false);
    assert.deepEqual(checkNotationCoherence(notation), []);
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

  test("rejette mesure_vers_objectif manquant (nouveau bloc obligatoire)", () => {
    const analyse = makeEtape1();
    delete analyse.mesure_vers_objectif;
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette une categorie_objectif hors de la liste fermée des 12 domaines", () => {
    const analyse = makeEtape1({ champs: { mesure_vers_objectif: makeMesureVersObjectif({ categorie_objectif: "Culture" }) } });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("accepte categorie_objectif = null (aucun domaine ne convient)", () => {
    const analyse = makeEtape1({ champs: { mesure_vers_objectif: makeMesureVersObjectif({ categorie_objectif: null }) } });
    assert.equal(validateEtape1Structure(analyse).valid, true);
  });

  test("rejette un lien_causal hors énumération", () => {
    const analyse = makeEtape1({ champs: { mesure_vers_objectif: makeMesureVersObjectif({ lien_causal: "certain" }) } });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette analyse_par_criteres si ce n'est pas une chaîne (schéma étape 1)", () => {
    const analyse = makeEtape1({ analyse_par_criteres: ["pas", "une", "chaîne"] });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette une note hors bornes (11/10) sur une sous-composante d'Opérationnalité", () => {
    const analyse = makeEtape1({ champs: { notation_detaillee: makeNotation({ operationnalite_juridique: 11 }) } });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette une qualification hors énumération SOLIDE/INCERTAIN/FRAGILE", () => {
    const analyse = makeEtape1({ champs: { notation_detaillee: makeNotation({ qualification_juridique: "MOYEN" }) } });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });

  test("rejette l'ancien schéma à 4 critères + ajustement_juridique (barème supprimé)", () => {
    const ancienneNotation = {
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
    };
    const analyse = makeEtape1({ champs: { notation_detaillee: ancienneNotation } });
    assert.equal(validateEtape1Structure(analyse).valid, false);
  });
});

// --- validateFicheCompleteStructure (étape 3) -------------------------------

describe("validateFicheCompleteStructure", () => {
  test("accepte une fiche complète minimale mais complète (5 critères du nouveau barème)", () => {
    const result = validateFicheCompleteStructure(makeFicheComplete());
    assert.equal(result.valid, true, result.errors?.join("; "));
  });

  test("rejette moins ou plus de 5 objets dans analyse_par_criteres", () => {
    const fiche = makeFicheComplete({ criteres: makeCriteresEtape3().slice(0, 4) });
    assert.equal(validateFicheCompleteStructure(fiche).valid, false);
  });

  test("rejette un critère dupliqué", () => {
    const criteres = makeCriteresEtape3();
    criteres[4] = { ...criteres[0] };
    const fiche = makeFicheComplete({ criteres });
    assert.equal(validateFicheCompleteStructure(fiche).valid, false);
  });

  test("rejette un critère hors de l'ancien schéma (ex: 'juridique' seul, plus une clé valide)", () => {
    const criteres = makeCriteresEtape3().slice(0, 4);
    criteres.push({ critere: "juridique", titre: "Faisabilité juridique", note: null, note_max: null, texte: "x" });
    const fiche = makeFicheComplete({ criteres });
    assert.equal(validateFicheCompleteStructure(fiche).valid, false);
  });

  test("note_max différent par critère (30/30/20/10/10) est accepté", () => {
    const result = validateFicheCompleteStructure(makeFicheComplete());
    assert.equal(result.valid, true, result.errors?.join("; "));
    const maxParCritere = Object.fromEntries(
      result.fiche.analyse_par_criteres.map((c) => [c.critere, c.note_max]),
    );
    assert.deepEqual(maxParCritere, CRITERE_NOTE_MAX);
  });

  test("rejette un note_max incohérent avec le critère (ex: 25 au lieu de 30 pour efficacite)", () => {
    const criteres = makeCriteresEtape3({ efficacite: { note_max: 25 } });
    const fiche = makeFicheComplete({ criteres });
    assert.equal(validateFicheCompleteStructure(fiche).valid, false);
  });

  test("rejette une note supérieure à note_max", () => {
    const criteres = makeCriteresEtape3({ degre_preparation: { note: 11 } });
    const fiche = makeFicheComplete({ criteres });
    assert.equal(validateFicheCompleteStructure(fiche).valid, false);
  });

  test("accepte plafond_applique/plafond_declencheur sur l'objet operationnalite_moyens", () => {
    const criteres = makeCriteresEtape3({
      operationnalite_moyens: { note: 10, plafond_applique: true, plafond_declencheur: "juridique" },
    });
    const result = validateFicheCompleteStructure(makeFicheComplete({ criteres }));
    assert.equal(result.valid, true, result.errors?.join("; "));
  });

  test("n'exige pas resume_court/phrase_teasing (absents de fiche_complete)", () => {
    const fiche = makeFicheComplete();
    assert.equal("resume_court" in fiche, false);
    assert.equal(validateFicheCompleteStructure(fiche).valid, true);
  });
});

// --- Constantes exposées -----------------------------------------------------

describe("CRITERE_ETAPE3_KEYS / CRITERE_NOTE_MAX", () => {
  test("chaque critère du barème a un note_max défini", () => {
    for (const key of CRITERE_ETAPE3_KEYS) {
      assert.ok(CRITERE_NOTE_MAX[key], `pas de note_max pour ${key}`);
    }
  });

  test("le total des note_max fait bien 100 (30+30+20+10+10)", () => {
    const total = Object.values(CRITERE_NOTE_MAX).reduce((sum, max) => sum + max, 0);
    assert.equal(total, 100);
  });
});

describe("CATEGORIES_OBJECTIF", () => {
  test("contient exactement les 12 domaines de data/objectifs-de-reference.md", () => {
    assert.equal(CATEGORIES_OBJECTIF.length, 12);
  });
});
