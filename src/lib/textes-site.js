// Textes modifiables des pages publiques du site.
//
// Chaque page a une liste de « champs » : une clé unique, un libellé (ce que
// l'éditeur verra dans la future page d'édition) et le texte par défaut.
// Dans un texte, un retour à la ligne (\n) = un nouveau paragraphe.
//
// Un texte enregistré en base (table TexteSite) remplace le texte par défaut.
// Si la base est vide ou injoignable, le texte par défaut s'affiche : la page
// ne peut jamais se retrouver vide. Ce fichier n'accède PAS à la base, il peut
// donc aussi être importé par des composants client.

export const PAGES_EDITABLES = {
  "nous-rejoindre": {
    nom: "Nous rejoindre",
    chemin: "/nous-rejoindre",
    champs: [
      // En-tête
      {
        cle: "titre",
        libelle: "Grand titre (une ligne par morceau)",
        defaut: "De l’intelligence artificielle\nà l’intelligence collective",
      },
      {
        cle: "introduction",
        libelle: "Introduction (un paragraphe par ligne)",
        defaut: [
          "Perlimpinpin utilise l’intelligence artificielle pour rendre le débat public plus lisible, plus vérifiable et plus ouvert.",
          "L’IA peut analyser des milliers de données et confronter des sources. Mais elle ne peut pas, encore, décider ce qui est pertinent ou suffisamment démontré.",
          "L’objectivité ne se décrète pas. Elle se construit.",
        ].join("\n"),
      },
      {
        cle: "intro.bouton",
        libelle: "Introduction — bouton vers l’adhésion",
        defaut: "Adhérer au Club →",
      },

      // Les 4 cartes numérotées
      { cle: "etape1.titre", libelle: "Carte 01 — titre", defaut: "L’IA analyse" },
      {
        cle: "etape1.texte",
        libelle: "Carte 01 — texte",
        defaut: [
          "Chaque proposition est examinée selon une méthode commune : faisabilité, coût, financement, moyens, efficacité, calendrier et données disponibles.",
          "Un point de départ, pas une vérité définitive.",
        ].join("\n"),
      },
      { cle: "etape2.titre", libelle: "Carte 02 — titre", defaut: "Le Club challenge" },
      {
        cle: "etape2.texte",
        libelle: "Carte 02 — texte",
        defaut: [
          "Les contributeurs peuvent apporter une source, contester un raisonnement, signaler une erreur ou proposer une autre lecture.",
          "La contradiction fait partie du système.",
        ].join("\n"),
      },
      { cle: "etape3.titre", libelle: "Carte 03 — titre", defaut: "L’IA s’améliore" },
      {
        cle: "etape3.texte",
        libelle: "Carte 03 — texte",
        defaut:
          "L’IA confronte ces contributions aux sources, corrige ses erreurs, nuance ses conclusions ou maintient son analyse lorsqu’elle estime les objections insuffisamment étayées.",
      },
      { cle: "etape4.titre", libelle: "Carte 04 — titre", defaut: "L’analyse devient collective" },
      {
        cle: "etape4.texte",
        libelle: "Carte 04 — texte",
        defaut: [
          "Les contributions pertinentes enrichissent le résultat final.",
          "Les sources, incertitudes et désaccords restent visibles.",
        ].join("\n"),
      },

      // Bloc « Pourquoi nous rejoindre ? » (grille de 4 points)
      { cle: "pourquoi.titre", libelle: "Pourquoi nous rejoindre — titre", defaut: "Pourquoi nous rejoindre ?" },
      {
        cle: "pourquoi.chapeau",
        libelle: "Pourquoi nous rejoindre — chapeau",
        defaut: "En adhérant à l’association, vous :",
      },
      {
        cle: "pourquoi1.titre",
        libelle: "Point 1 (balance) — titre",
        defaut: "Défendez une nouvelle exigence dans le débat public",
      },
      {
        cle: "pourquoi1.texte",
        libelle: "Point 1 (balance) — texte",
        defaut:
          "Dépassez la rhétorique et les petites phrases. L’IA rend plus visibles les promesses imprécises, les financements absents ou les contradictions : les propositions politiques peuvent désormais être soumises à davantage de précision et de vérification.",
      },
      {
        cle: "pourquoi2.titre",
        libelle: "Point 2 (loupe) — titre",
        defaut: "Faites de l’analyse un bien commun",
      },
      {
        cle: "pourquoi2.texte",
        libelle: "Point 2 (loupe) — texte",
        defaut:
          "L’analyse des propositions politiques ne doit plus être le privilège de quelques experts. Avec le Club, elle devient accessible, vérifiable et ouverte à tous.",
      },
      {
        cle: "pourquoi3.titre",
        libelle: "Point 3 (personnes) — titre",
        defaut: "Placez l’humain au centre, propulsé par l’IA",
      },
      {
        cle: "pourquoi3.texte",
        libelle: "Point 3 (personnes) — texte",
        defaut:
          "L’intelligence artificielle apporte la vitesse et la capacité d’analyse. Les humains apportent l’expertise, la contradiction et le jugement. C’est leur combinaison qui fait Perlimpinpin.",
      },
      {
        cle: "pourquoi4.titre",
        libelle: "Point 4 (fusée) — titre",
        defaut: "Propulsez un projet citoyen jeune et indépendant",
      },
      {
        cle: "pourquoi4.texte",
        libelle: "Point 4 (fusée) — texte",
        defaut:
          "Soutenez une initiative à ses débuts pour lui donner les moyens de grandir, de se structurer et d’agir durablement dans le paysage démocratique.",
      },

      // Bloc « Un outil indépendant » (carte grisée)
      { cle: "independance.titre", libelle: "Outil indépendant — titre", defaut: "Un outil indépendant" },
      {
        cle: "independance.soustitre",
        libelle: "Outil indépendant — sous-titre",
        defaut: "Pourquoi demandons-nous une contribution ?",
      },
      {
        cle: "independance.texte",
        libelle: "Outil indépendant — texte (un paragraphe par ligne)",
        defaut:
          "Perlimpinpin est porté par une association indépendante. L’outil est gratuit pour les lecteurs, sans publicité et sans financement politique. Pour garantir notre impartialité, nous nous appuyons sur nos adhérents et nos donateurs.",
      },
      {
        cle: "independance.introListe",
        libelle: "Outil indépendant — phrase avant la liste",
        defaut: "Les adhésions et les dons financent directement :",
      },
      { cle: "independance1.titre", libelle: "Financement 1 — titre", defaut: "La technologie" },
      {
        cle: "independance1.texte",
        libelle: "Financement 1 — texte",
        defaut:
          "Analyse des propositions, requêtes aux modèles d’IA, hébergement et maintenance du site : l’IA au service de la démocratie a un coût réel, chaque jour.",
      },
      { cle: "independance2.titre", libelle: "Financement 2 — titre", defaut: "L’indépendance" },
      {
        cle: "independance2.texte",
        libelle: "Financement 2 — texte",
        defaut:
          "Ni publicité, ni financement politique : c’est le soutien des citoyens qui garantit notre liberté d’analyse.",
      },
      { cle: "independance3.titre", libelle: "Financement 3 — titre", defaut: "L’accès aux analyses" },
      {
        cle: "independance3.texte",
        libelle: "Financement 3 — texte",
        defaut:
          "Des analyses gratuites pour tous, et un Club vivant : échanges, ateliers de décryptage, événements pour porter nos travaux auprès du grand public.",
      },
      {
        cle: "independance.mention",
        libelle: "Outil indépendant — mention en bas de carte",
        defaut: "Association loi 1901 · RNA W941021332",
      },

      // Bloc d'adhésion final (ancre #adherer)
      { cle: "adhesion.titre", libelle: "Adhésion — titre", defaut: "Entrez dans le Club Perlimpinpin" },
      {
        cle: "adhesion.soustitre",
        libelle: "Adhésion — sous-titre",
        defaut:
          "Rejoignez un collectif d’audit citoyen et donnez du poids aux faits dans le débat public.",
      },
      {
        cle: "adhesion.encadreTitre",
        libelle: "Adhésion — titre de l’encadré",
        defaut: "Adhésion à prix libre, à partir de 2 €",
      },
      {
        cle: "adhesion.encadreTexte",
        libelle: "Adhésion — texte de l’encadré",
        defaut:
          "Vous choisissez le montant de votre adhésion. Chaque contribution, quelle qu’elle soit, renforce l’indépendance du projet et fait de vous un membre du Club.",
      },
      {
        cle: "adhesion.reperes",
        libelle: "Adhésion — repères de montants (petite ligne)",
        defaut:
          "Pour vous repérer : 2 € pour rejoindre le Club · 10 € pour soutenir · 24 € pour porter le projet",
      },
      { cle: "adhesion.bouton", libelle: "Adhésion — texte du bouton", defaut: "Adhérer sur HelloAsso" },
    ],
  },
};

// Découpe un texte en paragraphes (une ligne = un paragraphe, lignes vides ignorées).
export function enLignes(texte) {
  return String(texte ?? "")
    .split("\n")
    .map((ligne) => ligne.trim())
    .filter(Boolean);
}

// La lecture des textes (base + textes par défaut) est dans
// src/lib/textes-site-serveur.js.

// Longueur maximale d'un texte (garde-fou contre un collage accidentel).
export const TEXTE_SITE_MAX = 3000;

// Nettoyage avant enregistrement : retours à la ligne Windows unifiés, espaces
// en trop au début et à la fin retirés, pas plus d'une ligne vide d'affilée.
export function normaliserTexteSite(texte) {
  return String(texte ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Vérifie un texte (déjà normalisé) avant enregistrement.
export function validerTexteSite(texte) {
  if (!texte) return { ok: false, message: "Le texte ne peut pas être vide." };
  if (texte.length > TEXTE_SITE_MAX) {
    return { ok: false, message: `Texte trop long (${TEXTE_SITE_MAX} caractères maximum).` };
  }
  return { ok: true };
}
