import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appreciationCarte,
  cacheControlCarte,
  cheminCarte,
  couperTitre,
  slugCandidat,
  sousTitreCarte,
  tailleChiffre,
  tailleTitre,
  versionCarte,
} from "../src/lib/carte.js";

test("couleur de la carte selon l'appréciation", () => {
  assert.equal(appreciationCarte(10).label, "Irréaliste");
  assert.equal(appreciationCarte(10).score, appreciationCarte(30).score); // rouge
  assert.equal(appreciationCarte(45).score, "#f2552c"); // orange de la carte d'origine
  assert.equal(appreciationCarte(60).label, "Plausible sous condition");
  assert.equal(appreciationCarte(75).score, appreciationCarte(90).score); // vert
  assert.notEqual(appreciationCarte(60).score, appreciationCarte(45).score);
});

test("titre coupé en sujet noir et suite grise", () => {
  assert.deepEqual(couperTitre("Des robots pour remplacer les travailleurs immigrés"), {
    noir: "Des robots",
    gris: "pour remplacer les travailleurs immigrés",
  });
  assert.deepEqual(couperTitre("Taxe carbone : un chèque pour les ménages"), {
    noir: "Taxe carbone :",
    gris: "un chèque pour les ménages",
  });
  assert.deepEqual(couperTitre("Supprimer les certificats d’économies d’énergie"), {
    noir: "Supprimer les certificats",
    gris: "d’économies d’énergie",
  });
  assert.deepEqual(couperTitre("Référendum"), { noir: "Référendum", gris: "" });
  assert.equal(couperTitre("Baisser massivement les impôts locaux vite").noir, "Baisser massivement les");
});

test("sous-titre : « d’ » devant une voyelle ou un h", () => {
  assert.equal(sousTitreCarte("Marine Le Pen"), "La mesure de Marine Le Pen passée au crible.");
  assert.equal(sousTitreCarte("Édouard Philippe"), "La mesure d’Édouard Philippe passée au crible.");
  assert.equal(sousTitreCarte("Éric Zemmour"), "La mesure d’Éric Zemmour passée au crible.");
});

test("tailles : titre réduit s'il est trop long, chiffre sur une ligne", () => {
  assert.equal(tailleTitre("Des robots pour remplacer les travailleurs immigrés"), 88);
  assert.ok(tailleTitre("mot ".repeat(40)) < 88);
  assert.ok(tailleChiffre("141 M€") > tailleChiffre("2,9 millions"));
  assert.ok(tailleChiffre("1") <= 320);
});

test("slug du portrait bleu : depuis la photo, sinon depuis le nom", () => {
  assert.equal(slugCandidat({ nom: "x", photoUrl: "/photos/jean-luc-melenchon.jpg" }), "jean-luc-melenchon");
  assert.equal(slugCandidat({ nom: "Raphaël Glucksmann", photoUrl: null }), "raphael-glucksmann");
  assert.equal(slugCandidat({ nom: "Dominique de Villepin", photoUrl: "https://ailleurs/x.jpg" }), "dominique-de-villepin");
});

test("URL versionnée : change dès que le contenu de la carte change", () => {
  const carte = { analyseId: 120, titre: "Des robots", candidatNom: "Éric Zemmour", score: 41, reseaux: undefined };
  const v = versionCarte(carte);
  assert.match(v, /^120-[0-9a-f]{8}$/);
  assert.equal(versionCarte({ ...carte }), v); // stable
  assert.notEqual(versionCarte({ ...carte, titre: "Des robots !" }), v);
  assert.notEqual(versionCarte({ ...carte, score: 42 }), v);
  assert.match(versionCarte({ ...carte, analyseId: 121 }), /^121-/);
  const avecTextes = { ...carte, reseaux: { chiffre: { valeur: "141 M€", explication: "Coût." } } };
  assert.notEqual(versionCarte(avecTextes), v);
  assert.notEqual(
    versionCarte({ ...carte, reseaux: { chiffre: { valeur: "142 M€", explication: "Coût." } } }),
    versionCarte(avecTextes),
  );
  // Les tweets eux-mêmes ne sont pas sur l'image : ils ne changent pas l'URL.
  assert.equal(versionCarte({ ...avecTextes, reseaux: { ...avecTextes.reseaux, fil: ["a"] } }), versionCarte(avecTextes));
  assert.equal(cheminCarte({ propositionId: 56, format: "chiffre", ...carte }), `/api/carte/56?format=chiffre&v=${v}`);
  assert.match(cheminCarte({ propositionId: 1, brouillon: true, ...carte }), /brouillon=1/);
});

test("cache", () => {
  assert.match(cacheControlCarte({ publie: true, versionDemandee: "120-41", versionCourante: "120-41" }), /immutable/);
  assert.doesNotMatch(cacheControlCarte({ publie: true, versionDemandee: "119-41", versionCourante: "120-41" }), /immutable/);
  assert.doesNotMatch(cacheControlCarte({ publie: true, versionDemandee: null, versionCourante: "120-41" }), /immutable/);
  assert.equal(cacheControlCarte({ publie: false, versionDemandee: "1-1", versionCourante: "1-1" }), "private, no-store");
});
