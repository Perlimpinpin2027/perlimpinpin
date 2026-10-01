// Textes modifiables de la page /nous-rejoindre (voir src/lib/textes-site.js).

const page = {
  nom: "Nous rejoindre",
  chemin: "/nous-rejoindre",
  champs: [
    // En-tête
    {
      cle: "titre", groupe: "En-tête",
      libelle: "Grand titre (une ligne par morceau)",
      defaut: "De l’intelligence artificielle\nà l’intelligence collective",
    },
    {
      cle: "introduction", groupe: "En-tête",
      libelle: "Introduction (un paragraphe par ligne)",
      defaut: [
        "Perlimpinpin utilise l’intelligence artificielle pour rendre le débat public plus lisible, plus vérifiable et plus ouvert.",
        "L’IA peut analyser des milliers de données et confronter des sources. Mais elle ne peut pas, encore, décider ce qui est pertinent ou suffisamment démontré.",
        "L’objectivité ne se décrète pas. Elle se construit.",
      ].join("\n"),
    },
    {
      cle: "intro.bouton", groupe: "En-tête",
      libelle: "Introduction — bouton vers l’adhésion",
      defaut: "Adhérer au Club →",
    },

    // Les 4 cartes numérotées
    { cle: "etape1.titre", groupe: "Les 4 cartes numérotées", libelle: "Carte 01 — titre", defaut: "L’IA analyse" },
    {
      cle: "etape1.texte", groupe: "Les 4 cartes numérotées",
      libelle: "Carte 01 — texte",
      defaut: [
        "Chaque proposition est examinée selon une méthode commune : faisabilité, coût, financement, moyens, efficacité, calendrier et données disponibles.",
        "Un point de départ, pas une vérité définitive.",
      ].join("\n"),
    },
    { cle: "etape2.titre", groupe: "Les 4 cartes numérotées", libelle: "Carte 02 — titre", defaut: "Le Club challenge" },
    {
      cle: "etape2.texte", groupe: "Les 4 cartes numérotées",
      libelle: "Carte 02 — texte",
      defaut: [
        "Les contributeurs peuvent apporter une source, contester un raisonnement, signaler une erreur ou proposer une autre lecture.",
        "La contradiction fait partie du système.",
      ].join("\n"),
    },
    { cle: "etape3.titre", groupe: "Les 4 cartes numérotées", libelle: "Carte 03 — titre", defaut: "L’IA s’améliore" },
    {
      cle: "etape3.texte", groupe: "Les 4 cartes numérotées",
      libelle: "Carte 03 — texte",
      defaut:
        "L’IA confronte ces contributions aux sources, corrige ses erreurs, nuance ses conclusions ou maintient son analyse lorsqu’elle estime les objections insuffisamment étayées.",
    },
    { cle: "etape4.titre", groupe: "Les 4 cartes numérotées", libelle: "Carte 04 — titre", defaut: "L’analyse devient collective" },
    {
      cle: "etape4.texte", groupe: "Les 4 cartes numérotées",
      libelle: "Carte 04 — texte",
      defaut: [
        "Les contributions pertinentes enrichissent le résultat final.",
        "Les sources, incertitudes et désaccords restent visibles.",
      ].join("\n"),
    },

    // Bloc « Pourquoi nous rejoindre ? » (grille de 4 points)
    { cle: "pourquoi.titre", groupe: "Pourquoi nous rejoindre", libelle: "Pourquoi nous rejoindre — titre", defaut: "Pourquoi nous rejoindre ?" },
    {
      cle: "pourquoi.chapeau", groupe: "Pourquoi nous rejoindre",
      libelle: "Pourquoi nous rejoindre — chapeau",
      defaut: "En adhérant à l’association, vous :",
    },
    {
      cle: "pourquoi1.titre", groupe: "Pourquoi nous rejoindre",
      libelle: "Point 1 (balance) — titre",
      defaut: "Défendez une nouvelle exigence dans le débat public",
    },
    {
      cle: "pourquoi1.texte", groupe: "Pourquoi nous rejoindre",
      libelle: "Point 1 (balance) — texte",
      defaut:
        "Dépassez la rhétorique et les petites phrases. L’IA rend plus visibles les promesses imprécises, les financements absents ou les contradictions : les propositions politiques peuvent désormais être soumises à davantage de précision et de vérification.",
    },
    {
      cle: "pourquoi2.titre", groupe: "Pourquoi nous rejoindre",
      libelle: "Point 2 (loupe) — titre",
      defaut: "Faites de l’analyse un bien commun",
    },
    {
      cle: "pourquoi2.texte", groupe: "Pourquoi nous rejoindre",
      libelle: "Point 2 (loupe) — texte",
      defaut:
        "L’analyse des propositions politiques ne doit plus être le privilège de quelques experts. Avec le Club, elle devient accessible, vérifiable et ouverte à tous.",
    },
    {
      cle: "pourquoi3.titre", groupe: "Pourquoi nous rejoindre",
      libelle: "Point 3 (personnes) — titre",
      defaut: "Placez l’humain au centre, propulsé par l’IA",
    },
    {
      cle: "pourquoi3.texte", groupe: "Pourquoi nous rejoindre",
      libelle: "Point 3 (personnes) — texte",
      defaut:
        "L’intelligence artificielle apporte la vitesse et la capacité d’analyse. Les humains apportent l’expertise, la contradiction et le jugement. C’est leur combinaison qui fait Perlimpinpin.",
    },
    {
      cle: "pourquoi4.titre", groupe: "Pourquoi nous rejoindre",
      libelle: "Point 4 (fusée) — titre",
      defaut: "Propulsez un projet citoyen jeune et indépendant",
    },
    {
      cle: "pourquoi4.texte", groupe: "Pourquoi nous rejoindre",
      libelle: "Point 4 (fusée) — texte",
      defaut:
        "Soutenez une initiative à ses débuts pour lui donner les moyens de grandir, de se structurer et d’agir durablement dans le paysage démocratique.",
    },

    // Bloc « Un outil indépendant » (carte grisée)
    { cle: "independance.titre", groupe: "Un outil indépendant", libelle: "Outil indépendant — titre", defaut: "Un outil indépendant" },
    {
      cle: "independance.soustitre", groupe: "Un outil indépendant",
      libelle: "Outil indépendant — sous-titre",
      defaut: "Pourquoi demandons-nous une contribution ?",
    },
    {
      cle: "independance.texte", groupe: "Un outil indépendant",
      libelle: "Outil indépendant — texte (un paragraphe par ligne)",
      defaut:
        "Perlimpinpin est porté par une association indépendante. L’outil est gratuit pour les lecteurs, sans publicité et sans financement politique. Pour garantir notre impartialité, nous nous appuyons sur nos adhérents et nos donateurs.",
    },
    {
      cle: "independance.introListe", groupe: "Un outil indépendant",
      libelle: "Outil indépendant — phrase avant la liste",
      defaut: "Les adhésions et les dons financent directement :",
    },
    { cle: "independance1.titre", groupe: "Un outil indépendant", libelle: "Financement 1 — titre", defaut: "La technologie" },
    {
      cle: "independance1.texte", groupe: "Un outil indépendant",
      libelle: "Financement 1 — texte",
      defaut:
        "Analyse des propositions, requêtes aux modèles d’IA, hébergement et maintenance du site : l’IA au service de la démocratie a un coût réel, chaque jour.",
    },
    { cle: "independance2.titre", groupe: "Un outil indépendant", libelle: "Financement 2 — titre", defaut: "L’indépendance" },
    {
      cle: "independance2.texte", groupe: "Un outil indépendant",
      libelle: "Financement 2 — texte",
      defaut:
        "Ni publicité, ni financement politique : c’est le soutien des citoyens qui garantit notre liberté d’analyse.",
    },
    { cle: "independance3.titre", groupe: "Un outil indépendant", libelle: "Financement 3 — titre", defaut: "L’accès aux analyses" },
    {
      cle: "independance3.texte", groupe: "Un outil indépendant",
      libelle: "Financement 3 — texte",
      defaut:
        "Des analyses gratuites pour tous, et un Club vivant : échanges, ateliers de décryptage, événements pour porter nos travaux auprès du grand public.",
    },
    {
      cle: "independance.mention", groupe: "Un outil indépendant",
      libelle: "Outil indépendant — mention en bas de carte",
      defaut: "Association loi 1901 · RNA W941021332",
    },

    // Bloc d'adhésion final (ancre #adherer)
    { cle: "adhesion.titre", groupe: "Bloc d’adhésion", libelle: "Adhésion — titre", defaut: "Entrez dans le Club Perlimpinpin" },
    {
      cle: "adhesion.soustitre", groupe: "Bloc d’adhésion",
      libelle: "Adhésion — sous-titre",
      defaut:
        "Rejoignez un collectif d’audit citoyen et donnez du poids aux faits dans le débat public.",
    },
    {
      cle: "adhesion.encadreTitre", groupe: "Bloc d’adhésion",
      libelle: "Adhésion — titre de l’encadré",
      defaut: "Adhésion à prix libre, à partir de 2 €",
    },
    {
      cle: "adhesion.encadreTexte", groupe: "Bloc d’adhésion",
      libelle: "Adhésion — texte de l’encadré",
      defaut:
        "Vous choisissez le montant de votre adhésion. Chaque contribution, quelle qu’elle soit, renforce l’indépendance du projet et fait de vous un membre du Club.",
    },
    {
      cle: "adhesion.reperes", groupe: "Bloc d’adhésion",
      libelle: "Adhésion — repères de montants (petite ligne)",
      defaut:
        "Pour vous repérer : 2 € pour rejoindre le Club · 10 € pour soutenir · 24 € pour porter le projet",
    },
    { cle: "adhesion.bouton", groupe: "Bloc d’adhésion", libelle: "Adhésion — texte du bouton", defaut: "Adhérer sur HelloAsso" },
  ],
};

export default page;
