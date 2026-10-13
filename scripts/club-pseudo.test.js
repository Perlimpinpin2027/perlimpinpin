import test from "node:test";
import assert from "node:assert/strict";
import { validerPseudo, modifierPseudo, nomAffiche, PSEUDO_DEJA_UTILISE } from "../src/lib/club-pseudo-core.js";

// Pseudonyme des membres du Club : validation et logique de
// PATCH /api/relectures/moi. Base simulée.

const ADHERENT = { id: 7, nom: "Camille D.", email: "camille@exemple.test" };

function fausseBase({ pris = [], erreur = null } = {}) {
  const ecrits = [];
  return {
    ecrits,
    pseudoPris: async (pseudo) => pris.some((p) => p.toLowerCase() === pseudo.toLowerCase()),
    enregistrer: async (adherentId, pseudo) => {
      if (erreur) throw erreur;
      ecrits.push({ adherentId, pseudo });
    },
  };
}

async function patcher(data, { adherent = ADHERENT, ...options } = {}) {
  const base = fausseBase(options);
  const r = await modifierPseudo({ adherent, data, pseudoPris: base.pseudoPris, enregistrer: base.enregistrer });
  return { ...r, ecrits: base.ecrits };
}

test("pseudo valide : espaces retirés au début et à la fin", () => {
  assert.deepEqual(validerPseudo("  Hélène_42  "), { pseudo: "Hélène_42" });
  assert.deepEqual(validerPseudo("Jean-Luc.B"), { pseudo: "Jean-Luc.B" });
  assert.deepEqual(validerPseudo("Camille   D."), { pseudo: "Camille D." });
});

test("vide ou null : retour au nom par défaut", () => {
  assert.deepEqual(validerPseudo(""), { pseudo: null });
  assert.deepEqual(validerPseudo("    "), { pseudo: null });
  assert.deepEqual(validerPseudo(null), { pseudo: null });
});

test("longueur : 3 à 24 caractères (accents comptés comme un caractère)", () => {
  assert.ok(validerPseudo("ab").error);
  assert.deepEqual(validerPseudo("Zoé"), { pseudo: "Zoé" });
  assert.deepEqual(validerPseudo("é".repeat(24)), { pseudo: "é".repeat(24) });
  assert.ok(validerPseudo("a".repeat(25)).error);
});

test("caractères interdits", () => {
  for (const pseudo of ["Camille!", "<b>moi</b>", "a@b.fr", "émoji 😀", "deux/trois"]) {
    assert.ok(validerPseudo(pseudo).error, pseudo);
  }
  assert.ok(validerPseudo(42).error);
});

test("mots interdits, sans tenir compte des majuscules, accents ni séparateurs", () => {
  for (const pseudo of ["Admin", "SuperModo", "Modérateur", "L'équipe", "Équipe_Perlimpinpin", "Le Pen", "le-pen", "LEPEN", "Mélenchon", "melenchon2027", "Z.e.m.m.o.u.r", "fan de Villepin"]) {
    assert.ok(validerPseudo(pseudo).error, pseudo);
  }
});

test("nom affiché : le pseudo s'il existe, sinon le nom par défaut", () => {
  assert.equal(nomAffiche({ nom: "Camille D.", pseudo: "Hélène" }), "Hélène");
  assert.equal(nomAffiche({ nom: "Camille D.", pseudo: null }), "Camille D.");
  assert.equal(nomAffiche(null), null);
});

test("PATCH non connecté : 401, rien n'est écrit", async () => {
  const { status, body, ecrits } = await patcher({ pseudo: "Hélène" }, { adherent: null });
  assert.equal(status, 401);
  assert.equal(body.login, "/relectures/connexion");
  assert.deepEqual(ecrits, []);
});

test("PATCH : écrit le pseudo du membre CONNECTÉ, jamais un id envoyé", async () => {
  const { status, body, ecrits } = await patcher({ pseudo: " Hélène ", id: 99, adherentId: 99 });
  assert.equal(status, 200);
  assert.deepEqual(body, { pseudo: "Hélène", nomAffiche: "Hélène" });
  assert.deepEqual(ecrits, [{ adherentId: 7, pseudo: "Hélène" }]);
});

test("PATCH vide : pseudo remis à null, nom par défaut affiché", async () => {
  const { status, body, ecrits } = await patcher({ pseudo: "" });
  assert.equal(status, 200);
  assert.deepEqual(body, { pseudo: null, nomAffiche: "Camille D." });
  assert.deepEqual(ecrits, [{ adherentId: 7, pseudo: null }]);
});

test("PATCH : pseudo invalide → 400 avec message, rien n'est écrit", async () => {
  const { status, body, ecrits } = await patcher({ pseudo: "Admin" });
  assert.equal(status, 400);
  assert.ok(body.error);
  assert.deepEqual(ecrits, []);
});

test("PATCH : corps manquant → 400", async () => {
  assert.equal((await patcher(null)).status, 400);
  assert.equal((await patcher({})).status, 400);
});

test("PATCH : pseudo déjà pris (même en changeant les majuscules) → 409", async () => {
  const { status, body, ecrits } = await patcher({ pseudo: "hélène" }, { pris: ["Hélène"] });
  assert.equal(status, 409);
  assert.equal(body.error, PSEUDO_DEJA_UTILISE);
  assert.deepEqual(ecrits, []);
});

test("PATCH : course entre deux membres (erreur unique P2002) → 409", async () => {
  const erreur = Object.assign(new Error("Unique constraint"), { code: "P2002" });
  const { status, body } = await patcher({ pseudo: "Hélène" }, { erreur });
  assert.equal(status, 409);
  assert.equal(body.error, PSEUDO_DEJA_UTILISE);
});
