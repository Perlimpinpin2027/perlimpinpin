import test from "node:test";
import assert from "node:assert/strict";
import { SESSION_EXPIREE, posterCommentaire } from "../src/lib/relecture-comments-core.js";

// Logique de POST /api/relectures/comments (Club Perlimpinpin) : session,
// signature automatique par le compte, validations. Base simulée.

const ADHERENT = { id: 7, nom: "Camille D.", email: "camille@exemple.test" };
const MAINTENANT = new Date("2026-10-01T12:00:00Z");

function fausseBase({ fiche = null } = {}) {
  const crees = [];
  return {
    crees,
    trouverFiche: async () => fiche,
    creer: async (values) => {
      crees.push(values);
      return { id: "c1", createdAt: MAINTENANT, ...values };
    },
  };
}

function poster(data, { adherent = ADHERENT, fiche } = {}) {
  const base = fausseBase({ fiche });
  const resultat = posterCommentaire({
    adherent,
    data,
    trouverFiche: base.trouverFiche,
    creer: base.creer,
    maintenant: MAINTENANT,
  });
  return resultat.then((r) => ({ ...r, crees: base.crees }));
}

const COMMENTAIRE = { ficheSlug: "lisnard-cee-carburant", sectionId: "lisnard-cee-carburant-score", sectionLabel: "Score", body: "Source ?" };

test("non connecté : 401 avec le lien de connexion, rien n'est écrit", async () => {
  const { status, body, crees } = await poster(COMMENTAIRE, { adherent: null });
  assert.equal(status, 401);
  assert.deepEqual(body, { error: "Session expirée. Reconnectez-vous.", login: "/relectures/connexion" });
  assert.deepEqual(body, SESSION_EXPIREE);
  assert.equal(crees.length, 0);
});

test("connecté : authorName et adherentId viennent du compte", async () => {
  const { status, body, crees } = await poster(COMMENTAIRE);
  assert.equal(status, 201);
  assert.equal(crees.length, 1);
  assert.equal(crees[0].authorName, "Camille D.");
  assert.equal(crees[0].adherentId, 7);
  assert.equal(body.authorName, "Camille D.");
  assert.equal(body.adherentId, 7);
});

test("un authorName (ou adherentId) envoyé par la page est ignoré", async () => {
  const { status, crees } = await poster({ ...COMMENTAIRE, authorName: "Quelqu'un d'autre", adherentId: 99 });
  assert.equal(status, 201);
  assert.equal(crees[0].authorName, "Camille D.");
  assert.equal(crees[0].adherentId, 7);
});

test("annotation valide : passage et positions enregistrés, signée par le compte", async () => {
  const { status, crees } = await poster({ ...COMMENTAIRE, quotedText: "abc", startOffset: 10, endOffset: 13 });
  assert.equal(status, 201);
  assert.deepEqual(
    { quotedText: crees[0].quotedText, startOffset: crees[0].startOffset, endOffset: crees[0].endOffset, authorName: crees[0].authorName },
    { quotedText: "abc", startOffset: 10, endOffset: 13, authorName: "Camille D." },
  );
});

test("validations inchangées : champs manquants, annotation incohérente, JSON absent", async () => {
  assert.equal((await poster({ ...COMMENTAIRE, body: "  " })).status, 400);
  assert.equal((await poster({ ...COMMENTAIRE, sectionId: "" })).status, 400);
  assert.equal((await poster({ ...COMMENTAIRE, quotedText: "abc", startOffset: 10, endOffset: 12 })).status, 400);
  assert.equal((await poster(null)).status, 400);
  const long = await poster({ ...COMMENTAIRE, body: "x".repeat(5000) });
  assert.equal(long.crees[0].body.length, 4000);
});

test("relecture close : 403 closed, rien n'est écrit", async () => {
  const fiche = { reviewDeadline: new Date("2026-09-30T10:00:00Z") };
  const { status, body, crees } = await poster(COMMENTAIRE, { fiche });
  assert.equal(status, 403);
  assert.equal(body.closed, true);
  assert.match(body.error, /Relecture terminée le .* : les commentaires sont fermés\./);
  assert.equal(crees.length, 0);
});

test("relecture encore ouverte (échéance future) : commentaire accepté", async () => {
  const fiche = { reviewDeadline: new Date("2026-10-02T10:00:00Z") };
  assert.equal((await poster(COMMENTAIRE, { fiche })).status, 201);
});
