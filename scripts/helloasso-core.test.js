import test from "node:test";
import assert from "node:assert/strict";
import {
  adhesionValide,
  enregistrerAdhesion,
  extraireAdherent,
  lireConfigHelloasso,
  lireNotification,
  lireTokenWebhook,
  masquerEmail,
  nomAffiche,
  notificationHorsAdhesion,
  resumer,
  secretsEgaux,
} from "../src/lib/helloasso-core.js";

// Adhésions HelloAsso → comptes Adherent : validation de la commande relue via
// l'API, nom affiché, idempotence. Ni réseau, ni vraie base.

const CONFIG = { organisation: "perlimpinpin", formulaires: ["adhesion-club", "adhesion-annuelle"], sandbox: false };

// Commande au format de l'API v5 (GET /orders/{id}, schéma OrderDetail)
function commande(modifs = {}) {
  return {
    id: 1234,
    formSlug: "adhesion-club",
    formType: "Membership",
    organizationSlug: "perlimpinpin",
    payer: { email: "Camille.Dupont@Gmail.com ", firstName: "camille", lastName: "DUPONT" },
    items: [{ id: 1, type: "Membership", state: "Processed", amount: 2000 }],
    payments: [{ id: 9, amount: 2000, state: "Authorized" }],
    ...modifs,
  };
}

const valide = (order, opts = {}) => adhesionValide(order, { ...CONFIG, ...opts });

test("commande valide : bonne organisation, bon formulaire, paiement autorisé", () => {
  assert.deepEqual(valide(commande()), { valide: true });
  // slugs comparés sans tenir compte de la casse
  assert.equal(valide(commande({ formSlug: "Adhesion-Club", organizationSlug: "PERLIMPINPIN" })).valide, true);
});

test("plusieurs formulaires : chacun accepté, slug inconnu refusé", () => {
  assert.equal(valide(commande({ formSlug: "adhesion-annuelle" })).valide, true);
  assert.equal(valide(commande({ formSlug: "ADHESION-ANNUELLE" })).valide, true);
  assert.equal(valide(commande({ formSlug: "adhesion-mensuelle" })).raison, "autre formulaire");
  // un seul formulaire configuré : l'autre est refusé
  assert.equal(valide(commande({ formSlug: "adhesion-annuelle" }), { formulaires: ["adhesion-club"] }).raison, "autre formulaire");
  assert.equal(valide(commande(), { formulaires: [] }).valide, false);
  assert.equal(notificationHorsAdhesion({ formType: "Membership", formSlug: "Adhesion-Annuelle" }, CONFIG), false);
});

test("mauvais formulaire, mauvais type, autre organisation : refusée", () => {
  assert.equal(valide(commande({ formSlug: "don-libre" })).raison, "autre formulaire");
  assert.equal(valide(commande({ formType: "Donation" })).raison, "pas une adhésion");
  assert.equal(valide(commande({ organizationSlug: "autre-asso" })).raison, "autre organisation");
  assert.equal(valide(null).valide, false);
  assert.equal(valide(commande({ items: [{ type: "Donation", state: "Processed" }] })).valide, false);
});

test("paiement refusé, remboursé, annulé, contesté, en attente : refusée", () => {
  for (const state of ["Refused", "Refunded", "Refunding", "Canceled", "Contested", "Pending", "Waiting", "WaitingBankValidation"]) {
    assert.equal(valide(commande({ payments: [{ state }] })).valide, false, state);
  }
  assert.equal(valide(commande({ payments: [] })).valide, false);
  assert.equal(valide(commande({ payments: undefined })).valide, false);
  // un remboursement après autorisation annule l'adhésion
  assert.equal(valide(commande({ payments: [{ state: "Authorized" }, { state: "Refunded" }] })).valide, false);
  // article d'adhésion annulé
  assert.equal(valide(commande({ items: [{ type: "Membership", state: "Canceled" }] })).valide, false);
});

test("AuthorizedPreprod : accepté seulement en sandbox", () => {
  const order = commande({ payments: [{ state: "AuthorizedPreprod" }] });
  assert.equal(valide(order).valide, false);
  assert.equal(valide(order, { accepterPreprod: true }).valide, true);
});

test("nom affiché « Prénom I. » : accents, composés, majuscules, particules", () => {
  assert.equal(nomAffiche("camille", "DUPONT"), "Camille D.");
  assert.equal(nomAffiche("ÉLODIE", "éluard"), "Élodie É.");
  assert.equal(nomAffiche("jean-PIERRE", "Martin-Durand"), "Jean-Pierre M.");
  assert.equal(nomAffiche(" marie   claire ", "le pen"), "Marie Claire L.");
  assert.equal(nomAffiche("Dominique", "de Villepin"), "Dominique V.");
  assert.equal(nomAffiche("Charles", "d'Artagnan"), "Charles A.");
  assert.equal(nomAffiche("Zoé", ""), "Zoé");
  assert.equal(nomAffiche("Zoé", null), "Zoé");
  assert.equal(nomAffiche("", "Dupont"), null);
  assert.equal(nomAffiche(null, null), null);
});

test("extraireAdherent : e-mail du payeur normalisé (minuscules, espaces)", () => {
  assert.deepEqual(extraireAdherent(commande()), { email: "camille.dupont@gmail.com", nom: "Camille D." });
  assert.equal(extraireAdherent(commande({ payer: { email: "pas-un-email", firstName: "A", lastName: "B" } })), null);
  assert.equal(extraireAdherent(commande({ payer: null })), null);
});

test("lireNotification : notifications Order et Payment, le reste est ignoré", () => {
  assert.deepEqual(lireNotification({ eventType: "Order", data: { id: 55, formType: "Membership", formSlug: "adhesion-club" } }), {
    orderId: 55,
    formType: "Membership",
    formSlug: "adhesion-club",
  });
  assert.deepEqual(lireNotification({ eventType: "Payment", data: { id: 9, order: { id: 55, formType: "Membership" } } }), {
    orderId: 55,
    formType: "Membership",
    formSlug: null,
  });
  assert.equal(lireNotification({ eventType: "Form", data: { id: 3 } }), null);
  assert.equal(lireNotification({ eventType: "Order", data: { id: "55" } }), null);
  assert.equal(lireNotification(null), null);
  assert.equal(notificationHorsAdhesion({ formType: "Donation", formSlug: null }, CONFIG), true);
  assert.equal(notificationHorsAdhesion({ formType: "Membership", formSlug: "autre" }, CONFIG), true);
  assert.equal(notificationHorsAdhesion({ formType: null, formSlug: null }, CONFIG), false);
});

test("configuration : fail closed si une variable manque", () => {
  const env = {
    HELLOASSO_CLIENT_ID: "id",
    HELLOASSO_CLIENT_SECRET: "secret",
    HELLOASSO_ORGANIZATION_SLUG: "perlimpinpin",
    HELLOASSO_MEMBERSHIP_FORM_SLUG: "adhesion-club",
    HELLOASSO_API_BASE: "https://api.helloasso-sandbox.com/v5/",
  };
  const config = lireConfigHelloasso(env);
  assert.deepEqual(config.formulaires, ["adhesion-club"]);
  assert.equal(config.apiBase, "https://api.helloasso-sandbox.com");
  assert.equal(config.sandbox, true);
  assert.equal(lireConfigHelloasso({ ...env, HELLOASSO_API_BASE: "https://api.helloasso.com" }).sandbox, false);
  assert.equal(lireConfigHelloasso({ ...env, HELLOASSO_CLIENT_SECRET: "" }), null);
  assert.equal(lireConfigHelloasso({ ...env, HELLOASSO_API_BASE: "http://api.helloasso.com" }), null);
  // liste de formulaires séparés par des virgules (espaces et vides ignorés)
  const deux = lireConfigHelloasso({ ...env, HELLOASSO_MEMBERSHIP_FORM_SLUG: " mensuel-slug , annuel-slug ," });
  assert.deepEqual(deux.formulaires, ["mensuel-slug", "annuel-slug"]);
  assert.equal(lireConfigHelloasso({ ...env, HELLOASSO_MEMBERSHIP_FORM_SLUG: " , ," }), null);
  assert.equal(lireConfigHelloasso({ ...env, HELLOASSO_MEMBERSHIP_FORM_SLUG: undefined }), null);
  assert.equal(lireTokenWebhook({ HELLOASSO_WEBHOOK_TOKEN: "court" }), null);
  assert.equal(lireTokenWebhook({ HELLOASSO_WEBHOOK_TOKEN: "x".repeat(32) }), "x".repeat(32));
});

test("secretsEgaux et masquerEmail", () => {
  assert.equal(secretsEgaux("abc", "abc"), true);
  assert.equal(secretsEgaux("abd", "abc"), false);
  assert.equal(secretsEgaux("", "abc"), false);
  assert.equal(secretsEgaux(undefined, "abc"), false);
  assert.equal(secretsEgaux("", ""), false);
  assert.equal(masquerEmail("camille@gmail.com"), "ca***@gmail.com");
  assert.equal(masquerEmail("a@b.fr"), "a***@b.fr");
});

// Base factice : e-mail et helloassoOrderId uniques, comme en vrai
function fausseBase() {
  const lignes = [];
  return {
    lignes,
    adherent: {
      async findFirst({ where }) {
        return lignes.find((l) => where.OR.some((c) => Object.entries(c).every(([k, v]) => l[k] === v))) ?? null;
      },
      async create({ data }) {
        if (lignes.some((l) => l.email === data.email || (data.helloassoOrderId && l.helloassoOrderId === data.helloassoOrderId))) {
          throw Object.assign(new Error("Unique constraint"), { code: "P2002" });
        }
        const ligne = { id: lignes.length + 1, ...data };
        lignes.push(ligne);
        return { id: ligne.id };
      },
    },
  };
}

test("enregistrerAdhesion : crée le compte avec source et commande", async () => {
  const prisma = fausseBase();
  const r = await enregistrerAdhesion({ prisma, order: commande(), config: CONFIG });
  assert.equal(r.resultat, "creee");
  assert.deepEqual(prisma.lignes, [
    { id: 1, email: "camille.dupont@gmail.com", nom: "Camille D.", source: "helloasso", helloassoOrderId: 1234 },
  ]);
});

test("enregistrerAdhesion : la même notification deux fois ne crée qu'un compte", async () => {
  const prisma = fausseBase();
  await enregistrerAdhesion({ prisma, order: commande(), config: CONFIG });
  const r = await enregistrerAdhesion({ prisma, order: commande(), config: CONFIG });
  assert.equal(r.resultat, "dejaPresente");
  assert.equal(prisma.lignes.length, 1);
  // deux traitements simultanés : le second tombe sur la contrainte unique
  const prisma2 = fausseBase();
  const resultats = await Promise.all([1, 2].map(() => enregistrerAdhesion({ prisma: prisma2, order: commande(), config: CONFIG })));
  assert.deepEqual(resultats.map((x) => x.resultat).sort(), ["creee", "dejaPresente"]);
  assert.equal(prisma2.lignes.length, 1);
});

test("enregistrerAdhesion : un compte existant (import) n'est jamais modifié", async () => {
  const prisma = fausseBase();
  prisma.lignes.push({ id: 1, email: "camille.dupont@gmail.com", nom: "Camille Dupont", source: "import" });
  const r = await enregistrerAdhesion({ prisma, order: commande({ id: 999 }), config: CONFIG });
  assert.equal(r.resultat, "dejaPresente");
  assert.deepEqual(prisma.lignes, [{ id: 1, email: "camille.dupont@gmail.com", nom: "Camille Dupont", source: "import" }]);
});

test("enregistrerAdhesion : simulation n'écrit rien ; commande invalide ignorée", async () => {
  const prisma = fausseBase();
  assert.equal((await enregistrerAdhesion({ prisma, order: commande(), config: CONFIG, simulation: true })).resultat, "aCreer");
  const r = await enregistrerAdhesion({ prisma, order: commande({ payments: [{ state: "Refunded" }] }), config: CONFIG });
  assert.equal(r.resultat, "ignoree");
  assert.equal(prisma.lignes.length, 0);
});

test("resumer : compteurs sans données personnelles", () => {
  const resume = resumer([
    { resultat: "creee", email: "a@b.fr" },
    { resultat: "dejaPresente" },
    { resultat: "ignoree" },
    { resultat: "ignoree" },
  ]);
  assert.deepEqual(resume, { lues: 4, creees: 1, dejaPresentes: 1, ignorees: 2 });
});
