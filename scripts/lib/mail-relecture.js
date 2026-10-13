// Contenu du mail d'appel à relecture envoyé à chaque adhérent
// (scripts/relecture.js lancer / envoyer). Fonctions PURES, testées dans
// scripts/mail-relecture.test.js. Pas de tiret cadratin dans les textes.

import { formatClosedAt } from "../../src/lib/relecture.js";

export const LIEN_RELECTURES = "https://perlimpinpin.ai/relectures";

// « Camille D. » -> « Camille ». null (salutation « Bonjour ! ») si le nom est
// vide, une seule lettre (« C. »), une adresse e-mail ou sans lettre.
export function prenomDepuisNom(nom) {
  if (typeof nom !== "string") return null;
  const premier = nom.trim().split(/\s+/)[0] ?? "";
  if (!premier || premier.includes("@")) return null;
  const mot = premier.replace(/[.,;:!?]+$/, "");
  const lettres = mot.match(/\p{L}/gu) ?? [];
  if (lettres.length < 2) return null;
  // Tout en minuscules ou tout en majuscules : « camille », « CAMILLE » -> « Camille »
  if (mot === mot.toLowerCase() || mot === mot.toUpperCase()) {
    return mot
      .toLowerCase()
      .replace(/(^|[-'’])(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());
  }
  return mot;
}

function echapperHtml(texte) {
  return String(texte)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// { objet, texte, html } pour un adhérent. `prenom` null -> « Bonjour ! ».
export function redigerMailAdherent({ fiche, prenom, echeance, lienDesinscription }) {
  const r = fiche.relecture;
  const resume = String(fiche.resume_court ?? "").trim();
  const cloture = formatClosedAt(new Date(echeance));
  const salutation = prenom ? `Bonjour ${prenom} !` : "Bonjour !";
  const objet = `Nouvelle fiche à passer au crible : ${r.titre} (${r.candidat})`;

  const paragraphes = [
    salutation,
    `Une fiche toute fraîche vient d'arriver sur la table de relecture du Club : « ${r.titre} » (${r.candidat}, thème ${r.theme}).`,
    `En deux mots : ${resume}`,
    "À vous de jouer ! Un chiffre qui vous fait tiquer, une source qui manque, un raisonnement qui boite, une note trop sévère ou trop clémente : tout nous intéresse. Petit rappel : on commente la méthode, pas l'opinion sur la mesure.",
    `Pour relire et commenter : ${LIEN_RELECTURES}\nClôture des commentaires : ${cloture} (heure de Paris).`,
    "Bonus : chaque commentaire retenu dans la version finale vous rapporte 20 PerlimpinPOINTS.",
    "Merci, et bonne relecture !\nL'équipe Perlimpinpin",
  ];
  const pied = [
    "Vous recevez ce message parce que vous êtes adhérent du Club Perlimpinpin.",
    `Ne plus recevoir les appels à relecture : ${lienDesinscription}`,
  ];
  const texte = `${paragraphes.join("\n\n")}\n\n--\n${pied.join("\n")}\n`;

  // HTML simple : mêmes paragraphes, liens cliquables.
  const lien = (url, libelle = url) => `<a href="${echapperHtml(url)}">${echapperHtml(libelle)}</a>`;
  const p = (contenu) => `<p style="margin:0 0 16px">${contenu}</p>`;
  const html = [
    '<div style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#18181b;max-width:560px">',
    p(echapperHtml(salutation)),
    p(echapperHtml(paragraphes[1])),
    p(`<strong>En deux mots :</strong> ${echapperHtml(resume)}`),
    p(echapperHtml(paragraphes[3])),
    p(`Pour relire et commenter : ${lien(LIEN_RELECTURES)}<br>Clôture des commentaires : <strong>${echapperHtml(cloture)}</strong> (heure de Paris).`),
    p(echapperHtml(paragraphes[5])),
    p("Merci, et bonne relecture !<br>L'équipe Perlimpinpin"),
    '<p style="margin:24px 0 0;padding-top:12px;border-top:1px solid #e4e4e7;font-size:13px;color:#71717a">',
    `${echapperHtml(pied[0])}<br>${lien(lienDesinscription, "Ne plus recevoir les appels à relecture")}`,
    "</p>",
    "</div>",
  ].join("\n");

  return { objet: sansCadratin(objet), texte: sansCadratin(texte), html: sansCadratin(html) };
}

// Le titre ou le résumé de la fiche peuvent contenir un tiret cadratin : on le
// remplace par une virgule (« A — B » -> « A, B »).
export function sansCadratin(texte) {
  return String(texte).replace(/\s*—\s*/g, ", ");
}

// « camille@gmail.com » -> « c***@gmail.com » (aperçu dans le terminal).
export function masquerEmail(email) {
  const [local, domaine] = String(email).split("@");
  if (!domaine) return "***";
  return `${local.slice(0, 1)}***@${domaine}`;
}
