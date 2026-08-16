import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeAppreciation,
  computeScoreTotal,
  computeNiveauImpactAttendu,
  applyFinalScore,
  validateAnalyseCanoniqueStructure,
  checkAjustementDocumentation,
  neutralizeAjustementJuridique,
} from "./scoring.js";

// --- Fabriques -----------------------------------------------------------
// Analyse canonique minimale mais complète au sens de AnalyseCanoniqueSchema
// (schéma V4 : perimetre_competence, sous_mesures, affirmations_juridiques),
// surchargeable par test.

function makeCriteres({ factuel = 20, efficacite = 20, operationnel = 20, cout = 20 } = {}) {
  return [
    { critere: "solidite_factuelle", titre: "Solidité factuelle et documentaire", note: factuel, note_max: 25, texte: "Texte." },
    { critere: "efficacite", titre: "Efficacité attendue", note: efficacite, note_max: 25, texte: "Texte." },
    { critere: "operationnel", titre: "Faisabilité opérationnelle", note: operationnel, note_max: 25, texte: "Texte." },
    { critere: "cout", titre: "Coût et soutenabilité budgétaire", note: cout, note_max: 25, texte: "Texte." },
  ];
}

function makeAffirmation(overrides = {}) {
  return {
    id: "J1",
    affirmation: "Affirmation de test.",
    norme_ou_engagement: "Norme de test.",
    source_ids: ["S1"],
    portee_de_la_source: "Portée décrite.",
    application_a_la_proposition: "Application décrite.",
    degre_applicabilite: "directe",
    confiance: "haute",
    incidence_sur_ajustement: "Justifie le malus.",
    ...overrides,
  };
}

function makeQualification(overrides = {}) {
  return {
    ajustement_juridique: 0,
    niveau_impact_juridique: "neutre",
    confiance_qualification: "haute",
    nature_contrainte: null,
    justification_juridique_technique: "Aucun obstacle identifié.",
    voie_mise_en_conformite: null,
    sources_juridiques: [],
    affirmations_juridiques: [],
    ...overrides,
  };
}

function makeSource(overrides = {}) {
  return {
    id: "S1",
    titre: "Source de test",
    organisme: "Organisme",
    url: "https://exemple.fr",
    date_publication: null,
    date_consultation: "2026-08-12",
    type: "texte_juridique",
    ...overrides,
  };
}

function makeAnalyseCanonique({ criteres, qualification, sources = [] } = {}) {
  return {
    mesure_reformulee: "Une mesure de test.",
    perimetre_competence: {
      territoire: "France",
      niveau_decision: "national",
      autorite_competente: "Parlement",
      horizon_annonce: null,
      degre_precision: "moyen",
    },
    sous_mesures: [],
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
    sources_utilisees: sources,
    niveau_de_confiance: "moyen",
    limites: "Limites de test.",
  };
}

// --- CAS 1-9, 13 (section 43) : calcul pur, inchangé depuis V3 ------------

describe("CAS 1-9, 13 — calcul du score final", () => {
  test("CAS 1 : 25/25/25/25, ajustement 0 -> score_total = 100", () => {
    const { scoreTotal } = computeScoreTotal({ factuel: 25, efficacite: 25, operationnel: 25, cout: 25 }, 0);
    assert.equal(scoreTotal, 100);
  });

  test("CAS 2 : somme interne 80, malus majeur -35 (confiance haute, source primaire directe) -> score_total = 45", () => {
    const analyse = makeAnalyseCanonique({
      criteres: makeCriteres({ factuel: 20, efficacite: 20, operationnel: 20, cout: 20 }),
      qualification: makeQualification({
        ajustement_juridique: -35,
        niveau_impact_juridique: "majeur",
        confiance_qualification: "haute",
        justification_juridique_technique: "Incompatibilité constitutionnelle documentée.",
        sources_juridiques: ["S1"],
        affirmations_juridiques: [makeAffirmation()],
      }),
      sources: [makeSource({ type: "jurisprudence" })],
    });
    const structure = validateAnalyseCanoniqueStructure(analyse);
    assert.equal(structure.valid, true, structure.errors?.join("; "));
    const doc = checkAjustementDocumentation(analyse.qualification_juridique, analyse.sources_utilisees);
    assert.equal(doc.sufficient, true, doc.errors.join("; "));
    const { notationDetaillee, audit } = applyFinalScore(structure.analyseCanonique);
    assert.equal(audit.sommeInterne, 80);
    assert.equal(notationDetaillee.score_total, 45);
  });

  test("CAS 3 : somme interne 20, ajustement -35 -> score_total = 0 (clamp bas)", () => {
    const { scoreTotal } = computeScoreTotal({ factuel: 5, efficacite: 5, operationnel: 5, cout: 5 }, -35);
    assert.equal(scoreTotal, 0);
  });

  test("CAS 5 : somme interne 85, malus limité -5 -> score_total = 80", () => {
    const { scoreTotal } = computeScoreTotal({ factuel: 25, efficacite: 20, operationnel: 20, cout: 20 }, -5);
    assert.equal(scoreTotal, 80);
  });

  test("CAS 6 : somme interne 85, révision constitutionnelle prévue -15 -> score_total = 70", () => {
    const { scoreTotal } = computeScoreTotal({ factuel: 25, efficacite: 20, operationnel: 20, cout: 20 }, -15);
    assert.equal(scoreTotal, 70);
  });

  test("CAS 7 : somme interne 85, majorité hostile mais aucune contrainte juridique -> ajustement 0, score_total = 85", () => {
    const { scoreTotal } = computeScoreTotal({ factuel: 25, efficacite: 20, operationnel: 20, cout: 20 }, 0);
    assert.equal(scoreTotal, 85);
  });

  test("CAS 8 : somme interne 100, bonus +3 -> score_total = 100 (clamp haut)", () => {
    const { scoreTotal } = computeScoreTotal({ factuel: 25, efficacite: 25, operationnel: 25, cout: 25 }, 3);
    assert.equal(scoreTotal, 100);
  });

  test("CAS 9 : 15/15/15/15, ajustement 0 -> score_total = 60, aucune note modifiée", () => {
    const notes = { factuel: 15, efficacite: 15, operationnel: 15, cout: 15 };
    const { scoreTotal, sommeInterne } = computeScoreTotal(notes, 0);
    assert.equal(sommeInterne, 60);
    assert.equal(scoreTotal, 60);
    assert.deepEqual(notes, { factuel: 15, efficacite: 15, operationnel: 15, cout: 15 });
  });

  test("CAS 13 : le score public écrase toujours l'arithmétique du modèle (notation_detaillee entièrement reconstruit)", () => {
    const analyse = makeAnalyseCanonique({
      criteres: makeCriteres({ factuel: 10, efficacite: 10, operationnel: 10, cout: 10 }), // somme réelle = 40
    });
    // V4 : l'analyse canonique ne contient même plus de notation_detaillee
    // à écraser — un éventuel champ parasite ajouté par le modèle doit être
    // purement et simplement ignoré par applyFinalScore, qui reconstruit
    // tout depuis analyse_par_criteres.
    analyse.notation_detaillee = { score_total: 999, appreciation: "exemplaire" };
    const structure = validateAnalyseCanoniqueStructure(analyse);
    assert.equal(structure.valid, true, structure.errors?.join("; "));
    const { notationDetaillee } = applyFinalScore(structure.analyseCanonique);
    assert.equal(notationDetaillee.score_total, 40);
    assert.equal(notationDetaillee.appreciation, "partiellement fondé");
  });
});

// --- CAS 4 et 14 (durcissement + neutralisation, section 43) -------------

describe("CAS 4, 14 — documentation insuffisante -> réparation puis neutralisation", () => {
  test("CAS 4 : malus majeur avec confiance moyenne -> documentation jugée insuffisante", () => {
    const qualification = makeQualification({
      ajustement_juridique: -35,
      niveau_impact_juridique: "majeur",
      confiance_qualification: "moyenne", // exige "haute" pour -31..-40
      justification_juridique_technique: "Incompatibilité alléguée.",
      sources_juridiques: ["S1"],
      affirmations_juridiques: [makeAffirmation()],
    });
    const doc = checkAjustementDocumentation(qualification, [makeSource({ type: "jurisprudence" })]);
    assert.equal(doc.sufficient, false);
    assert.ok(doc.errors.some((e) => e.includes("haute")));
  });

  test("CAS 4bis : malus majeur sans source juridique primaire -> documentation jugée insuffisante", () => {
    const qualification = makeQualification({
      ajustement_juridique: -35,
      niveau_impact_juridique: "majeur",
      confiance_qualification: "haute",
      justification_juridique_technique: "Incompatibilité alléguée.",
      sources_juridiques: ["S1"],
      affirmations_juridiques: [makeAffirmation({ source_ids: ["S1"] })],
    });
    // La source existe mais n'est pas de type juridique primaire.
    const doc = checkAjustementDocumentation(qualification, [makeSource({ type: "presse" })]);
    assert.equal(doc.sufficient, false);
    assert.ok(doc.errors.some((e) => e.includes("source juridique primaire")));
  });

  test("CAS 14 : ajustement -11 sans source primaire -> insuffisant, puis neutralisé à 0 avec incertitude conservée", () => {
    const qualification = makeQualification({
      ajustement_juridique: -11,
      niveau_impact_juridique: "significatif",
      confiance_qualification: "moyenne",
      justification_juridique_technique: "Contrainte alléguée mais mal établie.",
      sources_juridiques: [],
      affirmations_juridiques: [makeAffirmation({ source_ids: [] })], // pas de source réelle
    });
    const doc = checkAjustementDocumentation(qualification, []);
    assert.equal(doc.sufficient, false);

    // Simule : une tentative de réparation (hors scoring.js, orchestrée par
    // analyze.js) n'a pas permis d'obtenir de preuve -> neutralisation.
    const neutralized = neutralizeAjustementJuridique(qualification);
    assert.equal(neutralized.ajustement_juridique, 0);
    assert.equal(neutralized.niveau_impact_juridique, "neutre");
    // L'incertitude (justification, affirmations) reste visible : rien
    // d'autre n'est effacé.
    assert.equal(neutralized.justification_juridique_technique, "Contrainte alléguée mais mal établie.");
    assert.equal(neutralized.affirmations_juridiques.length, 1);

    // Le score final utilise bien l'ajustement neutralisé.
    const analyse = makeAnalyseCanonique({
      criteres: makeCriteres({ factuel: 20, efficacite: 20, operationnel: 20, cout: 20 }),
      qualification: neutralized,
    });
    const structure = validateAnalyseCanoniqueStructure(analyse);
    assert.equal(structure.valid, true, structure.errors?.join("; "));
    const { notationDetaillee, audit } = applyFinalScore(structure.analyseCanonique);
    assert.equal(audit.ajustementJuridique, 0);
    assert.equal(notationDetaillee.score_total, 80);
  });

  test("Distinction structure vs documentation : un ajustement non documenté reste STRUCTURELLEMENT valide (pas de rejet, seulement neutralisable)", () => {
    const analyse = makeAnalyseCanonique({
      qualification: makeQualification({
        ajustement_juridique: -5,
        niveau_impact_juridique: "limite",
        confiance_qualification: "moyenne",
        affirmations_juridiques: [], // aucune preuve
      }),
    });
    const structure = validateAnalyseCanoniqueStructure(analyse);
    assert.equal(structure.valid, true, structure.errors?.join("; "));
    const doc = checkAjustementDocumentation(analyse.qualification_juridique, analyse.sources_utilisees);
    assert.equal(doc.sufficient, false);
  });
});

// --- TEST A-F (section 44) — durcissement du bonus-malus juridique -------

describe("TEST A-F — bonus-malus juridique (V4, documentation obligatoire pour tout ajustement non nul)", () => {
  test("TEST A : nouvelle loi simple sans preuve -> ajustement doit tomber à 0 (documentation insuffisante par défaut)", () => {
    const qualification = makeQualification({
      ajustement_juridique: -3,
      niveau_impact_juridique: "limite",
      confiance_qualification: "moyenne",
      justification_juridique_technique: "Nécessite une loi ordinaire.",
      affirmations_juridiques: [], // rien de tracé : contrairement à V3, ceci NE SUFFIT PLUS
    });
    const doc = checkAjustementDocumentation(qualification, []);
    assert.equal(doc.sufficient, false, "V4 exige une preuve même pour un malus limité");
  });

  test("TEST A bis : nouvelle loi avec friction distincte documentée -> malus limité accepté", () => {
    const qualification = makeQualification({
      ajustement_juridique: -3,
      niveau_impact_juridique: "limite",
      confiance_qualification: "moyenne",
      justification_juridique_technique: "Frein administratif documenté au-delà de la procédure législative ordinaire.",
      sources_juridiques: ["S1"],
      affirmations_juridiques: [makeAffirmation({ degre_applicabilite: "probable" })],
    });
    const doc = checkAjustementDocumentation(qualification, [makeSource({ type: "source_publique" })]);
    assert.equal(doc.sufficient, true, doc.errors.join("; "));
  });

  test("TEST B : révision constitutionnelle prévue -> malus significatif (-9 à -20) accepté avec source primaire directe", () => {
    const qualification = makeQualification({
      ajustement_juridique: -15,
      niveau_impact_juridique: "significatif",
      confiance_qualification: "moyenne",
      justification_juridique_technique: "Révision constitutionnelle nécessaire mais explicitement prévue.",
      sources_juridiques: ["S1"],
      affirmations_juridiques: [makeAffirmation({ degre_applicabilite: "directe" })],
    });
    const doc = checkAjustementDocumentation(qualification, [makeSource({ type: "texte_juridique" })]);
    assert.equal(doc.sufficient, true, doc.errors.join("; "));
  });

  test("TEST C : incompatibilité constitutionnelle sans mise en conformité -> exige confiance haute + source primaire", () => {
    const sansDocumentation = makeQualification({
      ajustement_juridique: -38,
      niveau_impact_juridique: "majeur",
      confiance_qualification: "haute",
      justification_juridique_technique: "",
      affirmations_juridiques: [],
    });
    assert.equal(checkAjustementDocumentation(sansDocumentation, []).sufficient, false);

    const avecDocumentation = makeQualification({
      ajustement_juridique: -38,
      niveau_impact_juridique: "majeur",
      confiance_qualification: "haute",
      justification_juridique_technique: "Contraire à une jurisprudence directement applicable.",
      sources_juridiques: ["S1"],
      affirmations_juridiques: [makeAffirmation({ degre_applicabilite: "directe" })],
    });
    const doc = checkAjustementDocumentation(avecDocumentation, [makeSource({ type: "jurisprudence" })]);
    assert.equal(doc.sufficient, true, doc.errors.join("; "));
  });

  test("TEST D : écart à un engagement non contraignant -> malus limité (-1 à -8) documenté, jamais traité comme majeur", () => {
    const qualification = makeQualification({
      ajustement_juridique: -5,
      niveau_impact_juridique: "limite",
      confiance_qualification: "moyenne",
      justification_juridique_technique: "S'écarte d'un engagement non contraignant.",
      sources_juridiques: ["S1"],
      affirmations_juridiques: [makeAffirmation({ degre_applicabilite: "probable" })],
    });
    const doc = checkAjustementDocumentation(qualification, [makeSource({ type: "programme_politique" })]);
    assert.equal(doc.sufficient, true, doc.errors.join("; "));
    assert.notEqual(qualification.niveau_impact_juridique, "majeur");
  });

  test("TEST E : incompatibilité UE alléguée sans texte européen ni jurisprudence primaire -> insuffisant, neutralisable", () => {
    const qualification = makeQualification({
      ajustement_juridique: -15,
      niveau_impact_juridique: "significatif",
      confiance_qualification: "moyenne",
      justification_juridique_technique: "Incompatibilité avec le droit de l'Union alléguée.",
      sources_juridiques: ["S1"],
      affirmations_juridiques: [makeAffirmation({ source_ids: ["S1"], degre_applicabilite: "directe" })],
    });
    // Seule source disponible : un article de presse, pas un texte européen
    // officiel ni une jurisprudence CJUE.
    const doc = checkAjustementDocumentation(qualification, [makeSource({ id: "S1", type: "presse" })]);
    assert.equal(doc.sufficient, false);
    const neutralized = neutralizeAjustementJuridique(qualification);
    assert.equal(neutralized.ajustement_juridique, 0);
  });

  test("TEST F : source primaire existe mais protège une catégorie différente (degre_applicabilite non directe) -> insuffisant", () => {
    const qualification = makeQualification({
      ajustement_juridique: -15,
      niveau_impact_juridique: "significatif",
      confiance_qualification: "moyenne",
      justification_juridique_technique: "Jurisprudence existante mais portant sur une autre catégorie.",
      sources_juridiques: ["S1"],
      affirmations_juridiques: [
        makeAffirmation({ source_ids: ["S1"], degre_applicabilite: "discutable" }), // pas "directe"
      ],
    });
    // La source EST bien juridique primaire...
    const doc = checkAjustementDocumentation(qualification, [makeSource({ type: "jurisprudence" })]);
    // ...mais aucune affirmation ne la déclare directement applicable : le
    // malus -9 et au-delà reste insuffisamment étayé.
    assert.equal(doc.sufficient, false);
    assert.ok(doc.errors.some((e) => e.includes("directe")));
  });
});

// --- Fonctions unitaires ---------------------------------------------------

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

  test("validateAnalyseCanoniqueStructure rejette un ajustement_juridique hors bornes (-41)", () => {
    const analyse = makeAnalyseCanonique({
      qualification: makeQualification({ ajustement_juridique: -41, niveau_impact_juridique: "majeur" }),
    });
    assert.equal(validateAnalyseCanoniqueStructure(analyse).valid, false);
  });

  test("validateAnalyseCanoniqueStructure rejette moins ou plus de 4 critères", () => {
    const analyse = makeAnalyseCanonique({ criteres: makeCriteres().slice(0, 3) });
    assert.equal(validateAnalyseCanoniqueStructure(analyse).valid, false);
  });

  test("validateAnalyseCanoniqueStructure rejette un critère dupliqué", () => {
    const criteres = makeCriteres();
    criteres[3] = { ...criteres[0] };
    const analyse = makeAnalyseCanonique({ criteres });
    assert.equal(validateAnalyseCanoniqueStructure(analyse).valid, false);
  });

  test("validateAnalyseCanoniqueStructure rejette une note hors bornes (26/25)", () => {
    const analyse = makeAnalyseCanonique({ criteres: makeCriteres({ factuel: 26 }) });
    assert.equal(validateAnalyseCanoniqueStructure(analyse).valid, false);
  });

  test("validateAnalyseCanoniqueStructure accepte une qualification_juridique neutre sans affirmations (ajustement=0)", () => {
    const analyse = makeAnalyseCanonique(); // qualification par défaut : ajustement 0, affirmations vides
    const result = validateAnalyseCanoniqueStructure(analyse);
    assert.equal(result.valid, true, result.errors?.join("; "));
  });

  test("checkAjustementDocumentation ne demande rien pour un ajustement nul", () => {
    const doc = checkAjustementDocumentation(makeQualification({ ajustement_juridique: 0 }), []);
    assert.deepEqual(doc, { sufficient: true, errors: [] });
  });
});
