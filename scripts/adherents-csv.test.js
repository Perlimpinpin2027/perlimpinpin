import test from "node:test";
import assert from "node:assert/strict";
import { detecterSeparateur, lireCsvAdherents } from "./lib/adherents-csv.js";

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

test("séparateur détecté sur la première ligne : « ; » ou « , »", () => {
  assert.equal(detecterSeparateur("email;nom\na@b.fr;Anne"), ";");
  assert.equal(detecterSeparateur("email,nom\na@b.fr,Anne"), ",");
  assert.equal(detecterSeparateur("\n\na@b.fr,Anne"), ",");
  assert.equal(detecterSeparateur('a@b.fr;"Dupont, Anne"'), ";");
  // Virgule entre guillemets seulement : pas un séparateur
  assert.equal(detecterSeparateur('"a,b"'), ";");
  assert.equal(detecterSeparateur(""), ";");
});

test("fichier à virgules, sans en-tête et sans fin de ligne (cas réel)", () => {
  const { separateur, valides, invalides } = lireCsvAdherents("camille@exemple.fr,Camille D.");
  assert.equal(separateur, ",");
  assert.deepEqual(invalides, []);
  assert.deepEqual(valides, [{ ligne: 1, email: "camille@exemple.fr", nom: "Camille D." }]);
});

test("guillemets : séparateur ou guillemet dans le nom, espaces autour, retour à la ligne", () => {
  const csv = [
    "email,nom",
    'camille@exemple.fr,"Dupont, Camille"',
    'alex@exemple.fr , "Alex ""le Grand"" M."  ',
    'multi@exemple.fr,"Sur deux',
    'lignes"',
    "suite@exemple.fr,Suite S.",
  ].join("\r\n");
  const { valides, invalides } = lireCsvAdherents(csv);
  assert.deepEqual(invalides, []);
  assert.deepEqual(valides, [
    { ligne: 2, email: "camille@exemple.fr", nom: "Dupont, Camille" },
    { ligne: 3, email: "alex@exemple.fr", nom: 'Alex "le Grand" M.' },
    { ligne: 4, email: "multi@exemple.fr", nom: "Sur deux lignes" },
    { ligne: 6, email: "suite@exemple.fr", nom: "Suite S." },
  ]);
});

test("fichier à virgules : nom non protégé contenant une virgule → ligne refusée, pas coupée en silence", () => {
  const { valides, invalides } = lireCsvAdherents("a@b.fr,Anne B.\nc@d.fr,Dupont, Camille");
  assert.deepEqual(valides.map((v) => v.email), ["a@b.fr"]);
  assert.deepEqual(invalides.map((i) => [i.ligne, i.raison]), [[2, "format attendu : email,nom"]]);
});

test("guillemet non fermé : signalé, sans bloquer les lignes précédentes", () => {
  const { valides, invalides } = lireCsvAdherents('a@b.fr;Anne B.\nc@d.fr;"Camille');
  assert.deepEqual(valides.map((v) => v.email), ["a@b.fr"]);
  assert.deepEqual(invalides.map((i) => [i.ligne, i.raison]), [[2, "guillemet non fermé"]]);
});
