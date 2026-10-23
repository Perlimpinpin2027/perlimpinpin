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

// fiches : [{ candidat, parti, titre, fin }] (au moins une) ; prenom : string ou null.
// Renvoie { sujet, texte, html }.
export function redigerAnnonce({ fiches, prenom, siteUrl = SITE_URL }) {
  if (!fiches?.length) throw new Error("Aucune fiche à annoncer.");
  const n = fiches.length;
  const un = n === 1;
  const nombre = nombreEnLettres(n);
  const lien = `${siteUrl}/relectures`;
  const finProche = new Date(Math.min(...fiches.map((f) => new Date(f.fin).getTime())));
  const dateLimite = formatDateLimite(finProche);

  const sujet = `${nombre} ${un ? "nouvelle fiche" : "nouvelles fiches"} à relire avant publication`;
  const bonjour = prenom ? `Bonjour ${prenom},` : "Bonjour,";
  const arrivee = `${nombre} ${un ? "nouvelle fiche vient" : "nouvelles fiches viennent"} d'arriver sur la page des relectures, et votre regard nous intéresse avant ${un ? "sa" : "leur"} publication :`;
  const lignes = fiches.map((f) => `• ${f.candidat} (${f.parti}) : ${f.titre}`);
  const delai = `Vous avez jusqu'au ${dateLimite} pour commenter. Une source qui manque, un chiffre qui vous semble faux, une note trop sévère ou trop clémente : chaque remarque compte. Chaque fiche se termine aussi par quelques questions adressées directement au comité, c'est un bon point de départ.`;
  const cloture = "À la clôture, nous répondons à chaque commentaire et nous intégrons ceux qui améliorent l'analyse avant la publication.";
  const pied = "Vous recevez ce mail en tant qu'adhérent du Club Perlimpinpin. Se désinscrire en répondant à cet email";

  const texte = [
    bonjour,
    "",
    arrivee,
    "",
    ...lignes,
    "",
    `👉 Tout se passe ici : ${lien}`,
    "",
    delai,
    "",
    cloture,
    "",
    "Merci de faire vivre Perlimpinpin !",
    "L'équipe Perlimpinpin",
    "",
    pied,
  ].join("\n");

  const p = (contenu, style = "") => `<p style="margin:0 0 16px${style}">${contenu}</p>`;
  const html = [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"></head>',
    '<body style="margin:0;padding:24px;background:#ffffff;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6">',
    '<div style="max-width:560px">',
    p(esc(bonjour)),
    p(esc(arrivee)),
    p(fiches.map((f) => `• <strong>${esc(f.candidat)}</strong> (${esc(f.parti)}) : ${esc(f.titre)}`).join("<br>")),
    p(`👉 Tout se passe ici : <a href="${esc(lien)}" style="color:#2563eb">${esc(lien)}</a>`),
    p(esc(delai)),
    p(esc(cloture)),
    p(`Merci de faire vivre Perlimpinpin !<br>L'équipe Perlimpinpin`),
    p(esc(pied), ";padding-top:16px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a"),
    "</div></body></html>",
  ].join("\n");

  return { sujet, texte, html };
}
