import test from "node:test";
import assert from "node:assert/strict";
import {
  fichesAAnnoncer,
  formatDateLimite,
  nombreEnLettres,
  prenomDepuisNom,
  redigerAnnonce,
  corpsParDefaut,
  corpsEnHtml,
  lirePersonnalisation,
} from "../src/lib/relecture-annonce.js";

// Mail d'annonce des fiches en relecture (bouton « Prévenir les adhérents »).

const FICHE_A = { candidat: "Marine Le Pen", parti: "RN", titre: "Règle d'or budgétaire", fin: new Date("2026-10-16T18:00:00Z") };
const FICHE_B = { candidat: "Éric Zemmour", parti: "Reconquête", titre: "RSA après trois ans", fin: new Date("2026-10-17T10:30:00Z") };

test("nombre en lettres de Une à Dix, puis en chiffres", () => {
  assert.equal(nombreEnLettres(1), "Une");
  assert.equal(nombreEnLettres(3), "Trois");
  assert.equal(nombreEnLettres(10), "Dix");
  assert.equal(nombreEnLettres(11), "11");
});

test("date limite à l'heure de Paris, minutes seulement si non nulles", () => {
  assert.equal(formatDateLimite(new Date("2026-10-16T18:00:00Z")), "vendredi 16 octobre à 20h");
  assert.equal(formatDateLimite(new Date("2026-10-16T18:30:00Z")), "vendredi 16 octobre à 20h30");
  assert.equal(formatDateLimite(new Date("2026-11-01T08:05:00Z")), "dimanche 1er novembre à 9h05");
});

test("prénom tiré du nom affiché", () => {
  assert.equal(prenomDepuisNom("Camille D."), "Camille");
  assert.equal(prenomDepuisNom("JEAN-LUC M."), "Jean-Luc");
  assert.equal(prenomDepuisNom("C."), null);
  assert.equal(prenomDepuisNom("a@b.fr"), null);
  assert.equal(prenomDepuisNom(""), null);
});

test("une fiche : singulier, « sa publication »", () => {
  const { sujet, texte } = redigerAnnonce({ fiches: [FICHE_A], prenom: "Camille" });
  assert.equal(sujet, "Une nouvelle fiche à relire avant publication");
  assert.ok(texte.startsWith("Bonjour Camille,\n\nUne nouvelle fiche vient d'arriver sur la page des relectures, et votre regard nous intéresse avant sa publication :\n\n• Marine Le Pen (RN) : Règle d'or budgétaire\n\n👉 Tout se passe ici : https://perlimpinpin.ai/relectures\n\nVous avez jusqu'au vendredi 16 octobre à 20h pour commenter."));
  assert.ok(texte.endsWith("Merci de faire vivre Perlimpinpin !\nL'équipe Perlimpinpin\n\nVous recevez ce mail en tant qu'adhérent du Club Perlimpinpin. Se désinscrire en répondant à cet email"));
});

test("plusieurs fiches : pluriel, échéance la plus proche, sans prénom", () => {
  const { sujet, texte, html } = redigerAnnonce({ fiches: [FICHE_B, FICHE_A], prenom: null });
  assert.equal(sujet, "Deux nouvelles fiches à relire avant publication");
  assert.ok(texte.startsWith("Bonjour,\n\nDeux nouvelles fiches viennent d'arriver"));
  assert.ok(texte.includes("avant leur publication :\n\n• Éric Zemmour (Reconquête) : RSA après trois ans\n• Marine Le Pen (RN) : Règle d'or budgétaire\n"));
  assert.ok(texte.includes("jusqu'au vendredi 16 octobre à 20h pour"));
  assert.ok(html.includes('<a href="https://perlimpinpin.ai/relectures"'));
  assert.ok(html.includes("Règle d&#39;or budgétaire"));
});

test("fiches à annoncer : chrono en cours seulement, hors archives", () => {
  const maintenant = new Date("2026-10-15T12:00:00Z");
  const chronos = [
    { ficheSlug: "b", reviewDeadline: new Date("2026-10-17T10:00:00Z") },
    { ficheSlug: "a", reviewDeadline: new Date("2026-10-16T18:00:00Z") },
    { ficheSlug: "close", reviewDeadline: new Date("2026-10-14T18:00:00Z") },
    { ficheSlug: "sans-chrono", reviewDeadline: null },
    { ficheSlug: "archivee", reviewDeadline: new Date("2026-10-16T18:00:00Z") },
    { ficheSlug: "absente", reviewDeadline: new Date("2026-10-16T18:00:00Z") },
  ];
  const lireFiche = (slug) =>
    slug === "absente" ? null : { relecture: { candidat: `C-${slug}`, parti: "P", titre: `T-${slug}`, ...(slug === "archivee" ? { archive: {} } : {}) } };
  const fiches = fichesAAnnoncer({ chronos, lireFiche, maintenant });
  assert.deepEqual(fiches.map((f) => f.slug), ["a", "b"]);
  assert.equal(fiches[0].candidat, "C-a");
});

test("aucune fiche : erreur", () => {
  assert.throws(() => redigerAnnonce({ fiches: [], prenom: null }));
});

test("texte retouché : sujet et corps du comité, salutation et désinscription gardées", () => {
  const perso = { sujet: "Relecture express", corps: "Petit mot du **comité**.\n\nLien : https://perlimpinpin.ai/relectures." };
  const { sujet, texte, html } = redigerAnnonce({ fiches: [FICHE_A], prenom: "Camille", perso });
  assert.equal(sujet, "Relecture express");
  assert.equal(texte, "Bonjour Camille,\n\nPetit mot du comité.\n\nLien : https://perlimpinpin.ai/relectures.\n\nVous recevez ce mail en tant qu'adhérent du Club Perlimpinpin. Se désinscrire en répondant à cet email");
  assert.ok(html.includes("Petit mot du <strong>comité</strong>."));
  // Le point final ne fait pas partie du lien.
  assert.ok(html.includes('<a href="https://perlimpinpin.ai/relectures" style="color:#2563eb">https://perlimpinpin.ai/relectures</a>.'));
  assert.ok(html.includes("Se désinscrire"));
});

test("corps par défaut : le texte d'origine, candidats en gras", () => {
  const corps = corpsParDefaut({ fiches: [FICHE_A] });
  assert.ok(corps.startsWith("Une nouvelle fiche vient d'arriver"));
  assert.ok(corps.includes("• **Marine Le Pen** (RN) : Règle d'or budgétaire"));
  assert.ok(corps.endsWith("Merci de faire vivre Perlimpinpin !\nL'équipe Perlimpinpin"));
});

test("corps en HTML : tout est échappé, paragraphes et retours à la ligne", () => {
  const html = corpsEnHtml('<script>alert(1)</script>\nligne 2\n\n\nparagraphe "2"');
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;<br>ligne 2</p>"));
  assert.ok(html.includes("paragraphe &quot;2&quot;"));
  assert.equal((html.match(/<p /g) || []).length, 2);
});

test("retouches vérifiées : absentes, vides, trop longues", () => {
  assert.deepEqual(lirePersonnalisation({ mode: "test" }), { perso: null });
  assert.deepEqual(lirePersonnalisation(null), { perso: null });
  assert.deepEqual(lirePersonnalisation({ sujet: "  Un   sujet ", corps: "Texte\r\n" }), { perso: { sujet: "Un sujet", corps: "Texte" } });
  assert.ok(lirePersonnalisation({ sujet: "", corps: "x" }).error);
  assert.ok(lirePersonnalisation({ sujet: "x", corps: "   " }).error);
  assert.ok(lirePersonnalisation({ sujet: "x" }).error);
  assert.ok(lirePersonnalisation({ sujet: "x".repeat(201), corps: "x" }).error);
  assert.ok(lirePersonnalisation({ sujet: "x", corps: "x".repeat(8001) }).error);
});
