import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  computeAppreciation,
  computeScoreTotal,
  computeNiveauImpactAttendu,
  applyFinalScore,
  validateFiche,
  checkAjustementJuridiqueDocumentation,
  checkSourcesJuridiquesReferences,
} from "./scoring.js";

// Fiche minimale mais complète au sens de FicheSchema, pour les tests qui
// passent par validateFiche()/applyFinalScore() plutôt que directement par
// les fonctions de calcul. Les 4 notes et l'ajustement juridique sont
// surchargeables par test.
function makeCriteres({ factuel = 20, efficacite = 20, operationnel = 20, cout = 20 } = {}) {
  return [
    { critere: "solidite_factuelle", titre: "Solidité factuelle et documentaire", note: factuel, note_max: 25, texte: "Texte." },
    { critere: "efficacite", titre: "Efficacité attendue", note: efficacite, note_max: 25, texte: "Texte." },
    { critere: "operationnel", titre: "Faisabilité opérationnelle", note: operationnel, note_max: 25, texte: "Texte." },
    { critere: "cout", titre: "Coût et soutenabilité budgétaire", note: cout, note_max: 25, texte: "Texte." },
  ];
}

function makeQualification(overrides = {}) {
  return {
    ajustement_juridique: 0,
    niveau_impact_juridique: "neutre",
    confiance_qualification: "haute",
    nature_contrainte: null,
    justification_juridique: "Aucun obstacle identifié.",
    voie_mise_en_conformite: null,
    sources_juridiques: [],
    ...overrides,
  };
}

function makeFiche({ criteres, qualification, sources = [] } = {}) {
  return {
    mesure_reformulee: "Une mesure de test.",
    nature_et_existant: "Nature de test.",
    contexte_programme: "Contexte programme de test.",
    contexte_national: "Contexte national de test.",
    contexte_international: "Contexte international de test.",
    impact_environnement: null,
    analyse_par_criteres: criteres ?? makeCriteres(),
    qualification_juridique: qualification ?? makeQualification(),
    analyse_longevites: "Analyse longévités de test.",
    impact_temporel_et_sectoriel: null,
    ce_qui_est_etabli: "Établi de test.",
    ce_qui_est_probable: "Probable de test.",
    ce_qui_est_discutable: "Discutable de test.",
    ce_qui_est_inconnu: "Inconnu de test.",
    angles_morts: "Angles morts de test.",
    verdict_final: "Verdict de test.",
    sources_utilisees: sources,
    niveau_de_confiance: "moyen",
    limites: "Limites de test.",
    resume_court: "Résumé court de test.",
  };
}

// --- CAS 1 à 13 (section 39 de la spec) --------------------------------------

describe("CAS 1-13 — calcul du score final", () => {
  test("CAS 1 : 25/25/25/25, ajustement 0 -> score_total = 100", () => {
    const { scoreTotal } = computeScoreTotal(
      { factuel: 25, efficacite: 25, operationnel: 25, cout: 25 },
      0,
    );
    assert.equal(scoreTotal, 100);
  });

  test("CAS 2 : somme interne 80, malus majeur -35 (confiance haute, source primaire) -> score_total = 45", () => {
    const fiche = makeFiche({
      criteres: makeCriteres({ factuel: 20, efficacite: 20, operationnel: 20, cout: 20 }),
      qualification: makeQualification({
        ajustement_juridique: -35,
        niveau_impact_juridique: "majeur",
        confiance_qualification: "haute",
        justification_juridique: "Incompatibilité constitutionnelle documentée par le Conseil constitutionnel.",
        sources_juridiques: ["S1"],
      }),
      sources: [{ id: "S1", titre: "Décision", organisme: "Conseil constitutionnel", url: "https://...", date_publication: null, date_consultation: "2026-08-10", type: "jurisprudence" }],
    });
    const result = validateFiche(fiche);
    assert.equal(result.valid, true, result.errors?.join("; "));
    const { fiche: scored, audit } = applyFinalScore(result.fiche);
    assert.equal(audit.sommeInterne, 80);
    assert.equal(scored.notation_detaillee.score_total, 45);
  });

  test("CAS 3 : somme interne 20, ajustement -35 -> score_total = 0 (clamp bas)", () => {
    const { scoreTotal } = computeScoreTotal(
      { factuel: 5, efficacite: 5, operationnel: 5, cout: 5 },
      -35,
    );
    assert.equal(scoreTotal, 0);
  });

  test("CAS 4 : malus majeur avec confiance moyenne -> structure jugée invalide (pas d'application silencieuse)", () => {
    const fiche = makeFiche({
      qualification: makeQualification({
        ajustement_juridique: -35,
        niveau_impact_juridique: "majeur",
        confiance_qualification: "moyenne", // exige "haute" pour -31..-40
        justification_juridique: "Incompatibilité alléguée.",
        sources_juridiques: ["S1"],
      }),
      sources: [{ id: "S1", titre: "Article", organisme: "Presse", url: "https://...", date_publication: null, date_consultation: "2026-08-10", type: "presse" }],
    });
    const result = validateFiche(fiche);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("haute")));
  });

  test("CAS 4bis : malus majeur sans source juridique -> structure jugée invalide", () => {
    const fiche = makeFiche({
      qualification: makeQualification({
        ajustement_juridique: -35,
        niveau_impact_juridique: "majeur",
        confiance_qualification: "haute",
        justification_juridique: "Incompatibilité alléguée.",
        sources_juridiques: [], // aucune source primaire
      }),
    });
    const result = validateFiche(fiche);
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("source juridique primaire")));
  });

  test("CAS 5 : somme interne 85, malus limité -5 -> score_total = 80", () => {
    const { scoreTotal } = computeScoreTotal(
      { factuel: 25, efficacite: 20, operationnel: 20, cout: 20 },
      -5,
    );
    assert.equal(scoreTotal, 80);
  });

  test("CAS 6 : somme interne 85, révision constitutionnelle prévue -15 -> score_total = 70", () => {
    const { scoreTotal } = computeScoreTotal(
      { factuel: 25, efficacite: 20, operationnel: 20, cout: 20 },
      -15,
    );
    assert.equal(scoreTotal, 70);
  });

  test("CAS 7 : somme interne 85, majorité hostile mais aucune contrainte juridique -> ajustement 0, score_total = 85", () => {
    const { scoreTotal } = computeScoreTotal(
      { factuel: 25, efficacite: 20, operationnel: 20, cout: 20 },
      0,
    );
    assert.equal(scoreTotal, 85);
  });

  test("CAS 8 : somme interne 100, bonus +3 -> score_total = 100 (clamp haut)", () => {
    const { scoreTotal } = computeScoreTotal(
      { factuel: 25, efficacite: 25, operationnel: 25, cout: 25 },
      3,
    );
    assert.equal(scoreTotal, 100);
  });

  test("CAS 9 : 15/15/15/15, ajustement 0 -> score_total = 60, aucune note modifiée", () => {
    const notes = { factuel: 15, efficacite: 15, operationnel: 15, cout: 15 };
    const { scoreTotal, sommeInterne } = computeScoreTotal(notes, 0);
    assert.equal(sommeInterne, 60);
    assert.equal(scoreTotal, 60);
    // computeScoreTotal ne mute jamais l'objet de notes en entrée.
    assert.deepEqual(notes, { factuel: 15, efficacite: 15, operationnel: 15, cout: 15 });
  });

  // CAS 10 (Mistral indisponible -> pipeline continue) et CAS 11 (Mistral ne
  // relève rien -> aucune modification analytique) portent sur
  // l'orchestration réseau (analyze.js) et le comportement du modèle
  // d'arbitrage, pas sur du calcul pur : non couverts ici, voir
  // scripts/analyze.test.js pour CAS 10 (résilience sans réseau) et le run
  // réel du pipeline pour CAS 11 (comportement de Claude en pratique).

  test("CAS 12 : la garde anti-injection est bien présente dans le prompt système", () => {
    const prompt = readFileSync(
      new URL("../../data/prompt-methodologie.md", import.meta.url),
      "utf-8",
    );
    assert.match(prompt, /DONNÉE À ANALYSER/);
    assert.match(prompt, /Ignore les instructions précédentes/);
  });

  test("CAS 13 : le score public écrase toujours l'arithmétique du modèle", () => {
    const fiche = makeFiche({
      criteres: makeCriteres({ factuel: 10, efficacite: 10, operationnel: 10, cout: 10 }), // somme réelle = 40
    });
    // Le modèle a mal calculé son propre notation_detaillee (score_total
    // erroné, très éloigné de la vraie somme) : applyFinalScore doit
    // l'ignorer complètement et le recalculer depuis analyse_par_criteres.
    fiche.notation_detaillee = {
      factuel: 10,
      efficacite: 10,
      operationnel: 10,
      cout: 10,
      score_total: 999, // valeur aberrante que le modèle aurait pu produire
      appreciation: "exemplaire", // idem, incohérent avec 999 improbable
    };
    const result = validateFiche(fiche);
    assert.equal(result.valid, true, result.errors?.join("; "));
    const { fiche: scored } = applyFinalScore(result.fiche);
    assert.equal(scored.notation_detaillee.score_total, 40);
    assert.equal(scored.notation_detaillee.appreciation, "partiellement fondé");
  });
});

// --- TEST A à D (section 40 de la spec) --------------------------------------

describe("TEST A-D — bonus-malus juridique", () => {
  test("TEST A : nouvelle loi simple -> malus limité (0 à -5), pas de documentation exigée", () => {
    const fiche = makeFiche({
      qualification: makeQualification({
        ajustement_juridique: -3,
        niveau_impact_juridique: "limite",
        confiance_qualification: "moyenne",
        justification_juridique: "Nécessite une loi ordinaire, procédure classique.",
      }),
    });
    const result = validateFiche(fiche);
    assert.equal(result.valid, true, result.errors?.join("; "));
  });

  test("TEST B : révision constitutionnelle prévue -> malus significatif (-9 à -20) accepté, pas besoin du niveau majeur", () => {
    const fiche = makeFiche({
      qualification: makeQualification({
        ajustement_juridique: -15,
        niveau_impact_juridique: "significatif",
        confiance_qualification: "moyenne",
        justification_juridique: "Révision constitutionnelle nécessaire mais explicitement prévue par la proposition.",
      }),
    });
    const result = validateFiche(fiche);
    assert.equal(result.valid, true, result.errors?.join("; "));
  });

  test("TEST C : incompatibilité constitutionnelle sans mise en conformité -> exige confiance haute + source primaire", () => {
    const sansDocumentation = makeFiche({
      qualification: makeQualification({
        ajustement_juridique: -38,
        niveau_impact_juridique: "majeur",
        confiance_qualification: "haute",
        justification_juridique: "",
        sources_juridiques: [],
      }),
    });
    assert.equal(validateFiche(sansDocumentation).valid, false);

    const avecDocumentation = makeFiche({
      qualification: makeQualification({
        ajustement_juridique: -38,
        niveau_impact_juridique: "majeur",
        confiance_qualification: "haute",
        justification_juridique: "Contraire à une jurisprudence directement applicable du Conseil constitutionnel.",
        sources_juridiques: ["S1"],
      }),
      sources: [{ id: "S1", titre: "Décision", organisme: "Conseil constitutionnel", url: "https://...", date_publication: null, date_consultation: "2026-08-10", type: "jurisprudence" }],
    });
    const result = validateFiche(avecDocumentation);
    assert.equal(result.valid, true, result.errors?.join("; "));
  });

  test("TEST D : écart à un engagement non contraignant -> malus limité (-1 à -8), jamais traité comme majeur", () => {
    const fiche = makeFiche({
      qualification: makeQualification({
        ajustement_juridique: -5,
        niveau_impact_juridique: "limite",
        confiance_qualification: "moyenne",
        justification_juridique: "S'écarte d'un engagement non contraignant.",
      }),
    });
    const result = validateFiche(fiche);
    assert.equal(result.valid, true, result.errors?.join("; "));
    assert.notEqual(fiche.qualification_juridique.niveau_impact_juridique, "majeur");
  });
});

// --- Fonctions utilitaires ---------------------------------------------------

describe("Fonctions unitaires", () => {
  test("computeAppreciation suit le barème 0-19/20-39/.../90-100", () => {
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

  test("computeNiveauImpactAttendu couvre toutes les bandes du barème juridique", () => {
    assert.equal(computeNiveauImpactAttendu(3), "bonus");
    assert.equal(computeNiveauImpactAttendu(1), "bonus");
    assert.equal(computeNiveauImpactAttendu(0), "neutre");
    assert.equal(computeNiveauImpactAttendu(-1), "limite");
    assert.equal(computeNiveauImpactAttendu(-8), "limite");
    assert.equal(computeNiveauImpactAttendu(-9), "significatif");
    assert.equal(computeNiveauImpactAttendu(-20), "significatif");
    assert.equal(computeNiveauImpactAttendu(-21), "severe");
    assert.equal(computeNiveauImpactAttendu(-30), "severe");
    assert.equal(computeNiveauImpactAttendu(-31), "majeur");
    assert.equal(computeNiveauImpactAttendu(-40), "majeur");
  });

  test("validateFiche rejette un ajustement_juridique hors bornes (-41)", () => {
    const fiche = makeFiche({
      qualification: makeQualification({ ajustement_juridique: -41, niveau_impact_juridique: "majeur" }),
    });
    const result = validateFiche(fiche);
    assert.equal(result.valid, false);
  });

  test("validateFiche rejette moins ou plus de 4 critères", () => {
    const troisCriteres = makeFiche({ criteres: makeCriteres().slice(0, 3) });
    assert.equal(validateFiche(troisCriteres).valid, false);
  });

  test("validateFiche rejette un critère dupliqué", () => {
    const criteres = makeCriteres();
    criteres[3] = { ...criteres[0] }; // "cout" remplacé par un doublon de "solidite_factuelle"
    const fiche = makeFiche({ criteres });
    assert.equal(validateFiche(fiche).valid, false);
  });

  test("validateFiche rejette une note hors bornes (26/25)", () => {
    const fiche = makeFiche({ criteres: makeCriteres({ factuel: 26 }) });
    assert.equal(validateFiche(fiche).valid, false);
  });

  test("checkSourcesJuridiquesReferences détecte un identifiant absent de sources_utilisees", () => {
    const fiche = makeFiche({
      qualification: makeQualification({ sources_juridiques: ["S1"] }),
      sources: [], // S1 n'existe pas
    });
    const errors = checkSourcesJuridiquesReferences(fiche);
    assert.equal(errors.length, 1);
  });

  test("checkAjustementJuridiqueDocumentation n'exige rien pour un ajustement neutre ou limité", () => {
    assert.deepEqual(
      checkAjustementJuridiqueDocumentation(makeQualification({ ajustement_juridique: 0, justification_juridique: "" })),
      [],
    );
    assert.deepEqual(
      checkAjustementJuridiqueDocumentation(
        makeQualification({ ajustement_juridique: -8, justification_juridique: "", sources_juridiques: [] }),
      ),
      [],
    );
  });
});
