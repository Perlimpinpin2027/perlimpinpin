import { isRelectureClosed } from "./relecture.js";

// Mail d'annonce des fiches en relecture aux adhérents du Club (/relectures,
// mode comité, bouton « Prévenir les adhérents »). Fonction unique de
// rédaction, partagée par l'aperçu (POST /api/relectures/annonce/apercu) et,
// plus tard, par l'envoi. Logique sans Next.js ni Prisma
// (tests : scripts/relecture-annonce.test.js).

export const SITE_URL = "https://perlimpinpin.ai";

// Prénom fictif de l'aperçu : chaque adhérent verra le sien.
export const NOM_APERCU = "Camille D.";

const NOMBRES = ["Une", "Deux", "Trois", "Quatre", "Cinq", "Six", "Sept", "Huit", "Neuf", "Dix"];

// 1 -> « Une », …, 10 -> « Dix », puis en chiffres : 11 -> « 11 ».
export function nombreEnLettres(n) {
  return NOMBRES[n - 1] ?? String(n);
}

// « Camille D. » -> « Camille ». null (salutation « Bonjour, ») si le nom est
// vide, une seule lettre (« C. »), une adresse e-mail ou sans lettre.
// Même règle que prenomDepuisNom de la branche mails-reponses-commentaires.
export function prenomDepuisNom(nom) {
  if (typeof nom !== "string") return null;
  const premier = nom.trim().split(/\s+/)[0] ?? "";
  if (!premier || premier.includes("@")) return null;
  const mot = premier.replace(/[.,;:!?]+$/, "");
  const lettres = mot.match(/\p{L}/gu) ?? [];
  if (lettres.length < 2) return null;
  // Tout en minuscules ou tout en majuscules : « camille », « CAMILLE » -> « Camille »
  if (mot === mot.toLowerCase() || mot === mot.toUpperCase()) {
    return mot.toLowerCase().replace(/(^|[-'’])(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());
  }
  return mot;
}

// « vendredi 16 octobre à 20h » (« 20h30 » si minutes ≠ 0), heure de Paris
// quel que soit le fuseau du serveur.
export function formatDateLimite(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "numeric",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const jour = parts.day === "1" ? "1er" : parts.day;
  const minutes = parts.minute === "00" ? "" : parts.minute;
  return `${parts.weekday} ${jour} ${parts.month} à ${Number(parts.hour)}h${minutes}`;
}

// Fiches à annoncer : chrono lancé et pas encore échu, fiche présente dans
// data/relectures/ et non archivée. Triées par échéance (la plus proche d'abord).
// chronos : lignes RelectureFiche ; lireFiche(slug) : contenu JSON ou null.
export function fichesAAnnoncer({ chronos, lireFiche, maintenant = new Date() }) {
  return chronos
    .filter((c) => c.reviewDeadline && !isRelectureClosed(c, maintenant))
    .map((c) => ({ chrono: c, fiche: lireFiche(c.ficheSlug) }))
    .filter(({ fiche }) => fiche?.relecture && !fiche.relecture.archive)
    .sort((a, b) => a.chrono.reviewDeadline - b.chrono.reviewDeadline || a.chrono.ficheSlug.localeCompare(b.chrono.ficheSlug))
    .map(({ chrono, fiche }) => ({
      slug: chrono.ficheSlug,
      candidat: fiche.relecture.candidat,
      parti: fiche.relecture.parti,
      titre: fiche.relecture.titre,
      fin: chrono.reviewDeadline,
    }));
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ---------- texte modifiable depuis la fenêtre « Aperçu du mail » ----------
// Le comité peut retoucher le sujet et le corps du mail avant l'envoi. La
// salutation (« Bonjour <prénom>, ») et la ligne de désinscription restent
// ajoutées automatiquement à chaque mail : elles ne font pas partie du corps.
// Format du corps (texte simple) : une ligne vide sépare deux paragraphes,
// **texte** passe en gras, les liens https://… deviennent cliquables.

export const SUJET_MAX = 200;
export const CORPS_MAX = 8000;

const PIED = "Vous recevez ce mail en tant qu'adhérent du Club Perlimpinpin. Se désinscrire en répondant à cet email";

// Corps d'origine (ce que le comité voit dans l'éditeur avant toute retouche).
export function corpsParDefaut({ fiches, siteUrl = SITE_URL }) {
  if (!fiches?.length) throw new Error("Aucune fiche à annoncer.");
  const n = fiches.length;
  const un = n === 1;
  const nombre = nombreEnLettres(n);
  const lien = `${siteUrl}/relectures`;
  const finProche = new Date(Math.min(...fiches.map((f) => new Date(f.fin).getTime())));
  const dateLimite = formatDateLimite(finProche);
  return [
    `${nombre} ${un ? "nouvelle fiche vient" : "nouvelles fiches viennent"} d'arriver sur la page des relectures, et votre regard nous intéresse avant ${un ? "sa" : "leur"} publication :`,
    "",
    ...fiches.map((f) => `• **${f.candidat}** (${f.parti}) : ${f.titre}`),
    "",
    `👉 Tout se passe ici : ${lien}`,
    "",
    `Vous avez jusqu'au ${dateLimite} pour commenter. Une source qui manque, un chiffre qui vous semble faux, une note trop sévère ou trop clémente : chaque remarque compte. Chaque fiche se termine aussi par quelques questions adressées directement au comité, c'est un bon point de départ.`,
    "",
    "À la clôture, nous répondons à chaque commentaire et nous intégrons ceux qui améliorent l'analyse avant la publication.",
    "",
    "Merci de faire vivre Perlimpinpin !",
    "L'équipe Perlimpinpin",
  ].join("\n");
}

export function sujetParDefaut(fiches) {
  const n = fiches.length;
  return `${nombreEnLettres(n)} ${n === 1 ? "nouvelle fiche" : "nouvelles fiches"} à relire avant publication`;
}

// Version texte : on retire seulement les ** du gras.
function corpsEnTexte(corps) {
  return corps.replace(/\*\*(.+?)\*\*/g, "$1");
}

// Version HTML : tout est échappé, puis gras, liens, paragraphes et retours à la ligne.
export function corpsEnHtml(corps) {
  return corps
    .split(/\n[ \t]*\n+/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => {
      const contenu = esc(para)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/https?:\/\/[^\s<]+?(?=[.,;:!?)]*(?:\s|$))/g, (url) => `<a href="${url}" style="color:#2563eb">${url}</a>`)
        .split("\n")
        .join("<br>");
      return `<p style="margin:0 0 16px">${contenu}</p>`;
    })
    .join("\n");
}

// Retouches envoyées par la fenêtre ({ sujet, corps }), vérifiées côté serveur.
// Renvoie { perso: null } (pas de retouche), { perso: { sujet, corps } } ou { error }.
export function lirePersonnalisation(data) {
  const aSujet = data?.sujet !== undefined && data?.sujet !== null;
  const aCorps = data?.corps !== undefined && data?.corps !== null;
  if (!aSujet && !aCorps) return { perso: null };
  if (typeof data.sujet !== "string" || typeof data.corps !== "string") {
    return { error: "Sujet et texte du mail attendus." };
  }
  const sujet = data.sujet.replace(/\s+/g, " ").trim();
  const corps = data.corps.replace(/\r\n?/g, "\n").trim();
  if (!sujet) return { error: "Le sujet est vide." };
  if (sujet.length > SUJET_MAX) return { error: `Sujet trop long (${SUJET_MAX} caractères maximum).` };
  if (!corps) return { error: "Le texte du mail est vide." };
  if (corps.length > CORPS_MAX) return { error: `Texte trop long (${CORPS_MAX} caractères maximum).` };
  return { perso: { sujet, corps } };
}

// fiches : [{ candidat, parti, titre, fin }] (au moins une) ; prenom : string ou null ;
// perso : { sujet, corps } retouchés par le comité, ou null (texte d'origine).
// Renvoie { sujet, texte, html }.
export function redigerAnnonce({ fiches, prenom, siteUrl = SITE_URL, perso = null }) {
  if (!fiches?.length) throw new Error("Aucune fiche à annoncer.");
  const sujet = perso?.sujet ?? sujetParDefaut(fiches);
  const corps = perso?.corps ?? corpsParDefaut({ fiches, siteUrl });
  const bonjour = prenom ? `Bonjour ${prenom},` : "Bonjour,";

  const texte = [bonjour, "", corpsEnTexte(corps), "", PIED].join("\n");

  const html = [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"></head>',
    '<body style="margin:0;padding:24px;background:#ffffff;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">',
    '<div style="max-width:560px">',
    `<p style="margin:0 0 16px">${esc(bonjour)}</p>`,
    corpsEnHtml(corps),
    `<p style="margin:0 0 16px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">${esc(PIED)}</p>`,
    "</div></body></html>",
  ].join("\n");

  return { sujet, texte, html };
}
