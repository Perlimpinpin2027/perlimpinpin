import test from "node:test";
import assert from "node:assert/strict";
import { lireCsvAdherents } from "./lib/adherents-csv.js";

// Lecture du CSV des adhérents (scripts/import-adherents.js). Aucune base.

test("lignes valides : e-mail normalisé en minuscules, nom nettoyé", () => {
  const { valides, invalides } = lireCsvAdherents("email;nom\r\n  Camille.D@Exemple.FR ; Camille  D. \r\nalex@exemple.fr;\"Alex M.\"\n");
  assert.deepEqual(invalides, []);
  assert.deepEqual(valides, [
    { ligne: 2, email: "camille.d@exemple.fr", nom: "Camille D." },
    { ligne: 3, email: "alex@exemple.fr", nom: "Alex M." },
  ]);
});

test("sans en-tête, avec BOM et lignes vides", () => {
  const { valides, invalides } = lireCsvAdherents("﻿a@b.fr;Anne B.\n\n   \nc@d.fr;Chloé D.");
  assert.deepEqual(invalides, []);
  assert.deepEqual(valides.map((v) => v.email), ["a@b.fr", "c@d.fr"]);
});

test("lignes invalides listées avec leur numéro et la raison, sans bloquer les autres", () => {
  const csv = [
    "email;nom",
    "pas-une-adresse;Nom Valide",
    "ok@exemple.fr;Nom Valide",
    "sans-nom@exemple.fr;",
    "trop@de.fr;champs;ici",
    "une seule colonne",
    "OK@exemple.fr;Doublon",
    `long@exemple.fr;${"x".repeat(81)}`,
  ].join("\n");
  const { valides, invalides } = lireCsvAdherents(csv);
  assert.deepEqual(valides, [{ ligne: 3, email: "ok@exemple.fr", nom: "Nom Valide" }]);
  assert.deepEqual(
    invalides.map((i) => [i.ligne, i.raison]),
    [
      [2, "adresse e-mail invalide"],
      [4, "nom manquant ou trop long (2 à 80 caractères)"],
      [5, "format attendu : email;nom"],
      [6, "format attendu : email;nom"],
      [7, "adresse en double (déjà ligne 3)"],
      [8, "nom manquant ou trop long (2 à 80 caractères)"],
    ],
  );
});
