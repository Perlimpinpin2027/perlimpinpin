import { createHash, timingSafeEqual } from "node:crypto";
import { normalizeEmail } from "./live-password.js";

// Adhésions HelloAsso → comptes Adherent (Club Perlimpinpin). Fonctions sans
// Next ni réseau, testées par scripts/helloasso-core.test.js. La base est
// passée en paramètre (enregistrerAdhesion) pour être remplaçable en test.
//
// Règle de sécurité : le contenu d'une notification HelloAsso n'est jamais
// cru. Il ne sert qu'à savoir quelle commande relire ; seules les commandes
// renvoyées par l'API HelloAsso (src/lib/helloasso.js) passent par
// adhesionValide puis enregistrerAdhesion.

export const SOURCE_HELLOASSO = "helloasso";
export const TOKEN_MIN_LENGTH = 32;
const NOM_MAX_LENGTH = 80;

// États de paiement HelloAsso (PaymentState, spec OpenAPI officielle
// github.com/HelloAsso/helloasso-open-api). « Authorized » = paiement accepté.
// « AuthorizedPreprod » n'est accepté qu'en sandbox (accepterPreprod).
const ETATS_PAIEMENT_ANNULANT = new Set(["Refunded", "Refunding", "Canceled", "Contested", "Deleted"]);
// États d'article (ItemState) qui retirent l'adhésion de la commande
const ETATS_ARTICLE_ANNULE = new Set(["Canceled", "Refused", "Deleted", "Abandoned"]);

const egauxSansCasse = (a, b) =>
  typeof a === "string" && typeof b === "string" && a.trim().toLowerCase() === b.trim().toLowerCase();
const formulaireConnu = (slug, formulaires) => Array.isArray(formulaires) && formulaires.some((f) => egauxSansCasse(slug, f));

// Comparaison à temps constant (hachés d'abord : longueurs égales, et la
// longueur du secret ne se devine pas au temps de réponse).
export function secretsEgaux(recu, attendu) {
  if (typeof recu !== "string" || typeof attendu !== "string" || attendu.length === 0) return false;
  const h = (s) => createHash("sha256").update(s, "utf8").digest();
  return timingSafeEqual(h(recu), h(attendu));
}

// Configuration lue dans l'environnement, ou null si un réglage manque
// (les routes répondent alors 503 : fail closed). HELLOASSO_MEMBERSHIP_FORM_SLUG
// peut lister plusieurs formulaires séparés par des virgules (mensuel, annuel…).
export function lireConfigHelloasso(env = process.env) {
  const config = {
    clientId: env.HELLOASSO_CLIENT_ID?.trim(),
    clientSecret: env.HELLOASSO_CLIENT_SECRET?.trim(),
    organisation: env.HELLOASSO_ORGANIZATION_SLUG?.trim(),
    formulaires: (env.HELLOASSO_MEMBERSHIP_FORM_SLUG ?? "")
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean),
    // Avec ou sans « /v5 » final : on garde la racine (le jeton est sous /oauth2)
    apiBase: env.HELLOASSO_API_BASE?.trim().replace(/\/+$/, "").replace(/\/v5$/i, ""),
  };
  if (Object.values(config).some((v) => !v) || config.formulaires.length === 0) return null;
  try {
    if (new URL(config.apiBase).protocol !== "https:") return null;
  } catch {
    return null;
  }
  config.sandbox = /sandbox/i.test(config.apiBase);
  return config;
}

// Jeton de l'URL de notification, ou null s'il manque ou est trop court.
export function lireTokenWebhook(env = process.env) {
  const token = env.HELLOASSO_WEBHOOK_TOKEN?.trim();
  return token && token.length >= TOKEN_MIN_LENGTH ? token : null;
}

// « camille@gmail.com » → « ca***@gmail.com » (pour les journaux).
export function masquerEmail(email) {
  if (typeof email !== "string") return "(sans e-mail)";
  const at = email.lastIndexOf("@");
  if (at < 1) return "***";
  return `${email.slice(0, Math.min(2, at))}***${email.slice(at)}`;
}

// Corps de notification → { orderId, formType, formSlug } ou null.
// Notification « Order » : data est la commande. Notification « Payment » :
// data est le paiement, la commande est dans data.order. Rien de ce qui est lu
// ici n'est cru : ce n'est qu'un pré-tri avant de relire la commande.
export function lireNotification(corps) {
  const type = corps?.eventType;
  const commande = type === "Order" ? corps?.data : type === "Payment" ? corps?.data?.order : null;
  const orderId = commande?.id;
  if (!Number.isSafeInteger(orderId) || orderId <= 0) return null;
  return {
    orderId,
    formType: typeof commande.formType === "string" ? commande.formType : null,
    formSlug: typeof commande.formSlug === "string" ? commande.formSlug : null,
  };
}

// Vrai si la notification annonce une commande d'un autre formulaire (inutile
// de relire l'API). Les champs absents ne font rien écarter : la relecture tranchera.
export function notificationHorsAdhesion(notif, config) {
  if (notif.formType && notif.formType !== "Membership") return true;
  if (notif.formSlug && !formulaireConnu(notif.formSlug, config.formulaires)) return true;
  return false;
}

// { valide: true } ou { valide: false, raison } pour une commande relue via l'API.
export function adhesionValide(order, { organisation, formulaires, accepterPreprod = false } = {}) {
  if (!order || !Number.isSafeInteger(order.id)) return { valide: false, raison: "commande illisible" };
  if (!egauxSansCasse(order.organizationSlug, organisation)) return { valide: false, raison: "autre organisation" };
  if (order.formType !== "Membership") return { valide: false, raison: "pas une adhésion" };
  if (!formulaireConnu(order.formSlug, formulaires)) return { valide: false, raison: "autre formulaire" };

  const articles = Array.isArray(order.items) ? order.items : [];
  const adhesions = articles.filter((a) => a?.type === "Membership" && !ETATS_ARTICLE_ANNULE.has(a?.state));
  if (adhesions.length === 0) return { valide: false, raison: "aucune adhésion active dans la commande" };

  const paiements = Array.isArray(order.payments) ? order.payments : [];
  const annulant = paiements.find((p) => ETATS_PAIEMENT_ANNULANT.has(p?.state));
  if (annulant) return { valide: false, raison: `paiement ${annulant.state}` };
  const accepte = (etat) => etat === "Authorized" || (accepterPreprod && etat === "AuthorizedPreprod");
  if (!paiements.some((p) => accepte(p?.state))) {
    const etats = [...new Set(paiements.map((p) => p?.state ?? "?"))].join(", ") || "aucun paiement";
    return { valide: false, raison: `paiement non validé (${etats})` };
  }
  return { valide: true };
}

// « jean-PIERRE » → « Jean-Pierre », « éLODIE » → « Élodie ».
function capitaliser(texte) {
  return texte
    .toLocaleLowerCase("fr")
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, sep, lettre) => sep + lettre.toLocaleUpperCase("fr"));
}

// Initiale du nom de famille, particule écartée : « de Villepin » → « V. »,
// « d'Artagnan » → « A. », « Le Pen » → « L. », « éluard » → « É. ».
function initiale(nom) {
  const sansParticule = nom.replace(/^(?:de|du|des)\s+(?=\p{L})|^d['’](?=\p{L})/iu, "");
  const lettre = sansParticule.match(/\p{L}/u)?.[0];
  return lettre ? `${lettre.toLocaleUpperCase("fr")}.` : "";
}

// Nom affiché « Prénom I. » à partir du payeur, ou null sans prénom.
export function nomAffiche(firstName, lastName) {
  const nettoyer = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");
  const prenom = nettoyer(firstName);
  if (!/\p{L}/u.test(prenom)) return null;
  const nom = [capitaliser(prenom), initiale(nettoyer(lastName))].filter(Boolean).join(" ");
  return nom.length >= 2 && nom.length <= NOM_MAX_LENGTH ? nom : null;
}

// { email, nom } du payeur (celui qui reçoit la confirmation HelloAsso), ou null.
export function extraireAdherent(order) {
  const email = normalizeEmail(order?.payer?.email);
  const nom = nomAffiche(order?.payer?.firstName, order?.payer?.lastName);
  return email && nom ? { email, nom } : null;
}

// Traite une commande relue via l'API HelloAsso. Création seule, jamais de mise à
// jour : un compte existant n'est pas touché. Idempotent (e-mail et
// helloassoOrderId uniques en base : une création concurrente échoue en P2002).
// Renvoie { resultat: "creee" | "aCreer" | "dejaPresente" | "ignoree", ... } ;
// avec simulation: true, rien n'est écrit (« aCreer »).
export async function enregistrerAdhesion({ prisma, order, config, simulation = false }) {
  const verdict = adhesionValide(order, {
    organisation: config.organisation,
    formulaires: config.formulaires,
    accepterPreprod: config.sandbox,
  });
  if (!verdict.valide) return { resultat: "ignoree", raison: verdict.raison, orderId: order?.id ?? null };

  const adherent = extraireAdherent(order);
  if (!adherent) return { resultat: "ignoree", raison: "e-mail ou prénom du payeur manquant", orderId: order.id };

  const existant = await prisma.adherent.findFirst({
    where: { OR: [{ email: adherent.email }, { helloassoOrderId: order.id }] },
    select: { id: true },
  });
  if (existant) return { resultat: "dejaPresente", orderId: order.id, ...adherent };
  if (simulation) return { resultat: "aCreer", orderId: order.id, ...adherent };

  try {
    const cree = await prisma.adherent.create({
      data: { ...adherent, source: SOURCE_HELLOASSO, helloassoOrderId: order.id },
      select: { id: true },
    });
    return { resultat: "creee", adherentId: cree.id, orderId: order.id, ...adherent };
  } catch (error) {
    // Même notification traitée en parallèle, ou adresse créée entre-temps
    if (error?.code === "P2002") return { resultat: "dejaPresente", orderId: order.id, ...adherent };
    throw error;
  }
}

// Compteurs sans données personnelles, pour la réponse de la synchronisation.
export function resumer(resultats) {
  const resume = { lues: resultats.length, creees: 0, dejaPresentes: 0, ignorees: 0 };
  for (const { resultat } of resultats) {
    if (resultat === "creee" || resultat === "aCreer") resume.creees += 1;
    else if (resultat === "dejaPresente") resume.dejaPresentes += 1;
    else resume.ignorees += 1;
  }
  return resume;
}
