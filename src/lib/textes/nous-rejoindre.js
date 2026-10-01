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

    // Les 3 sections sous les cartes
    { cle: "section1.titre", groupe: "Les 3 sections", libelle: "Section 1 — titre", defaut: "Une nouvelle exigence" },
    {
      cle: "section1.texte", groupe: "Les 3 sections",
      libelle: "Section 1 — texte",
      defaut: [
        "L’IA rend plus visibles les promesses imprécises, les financements absents ou les contradictions.",
        "À mesure que les outils d’analyse progressent, les propositions politiques peuvent elles aussi être soumises à davantage d’exigence, de précision et de vérification.",
      ].join("\n"),
    },
    {
      cle: "section2.titre", groupe: "Les 3 sections",
      libelle: "Section 2 — titre",
      defaut: "Une autre manière d’utiliser l’IA en démocratie",
    },
    {
      cle: "section2.texte", groupe: "Les 3 sections",
      libelle: "Section 2 — texte",
      defaut: [
        "L’intelligence artificielle apporte la vitesse et la capacité d’analyse.",
        "Les humains apportent l’expertise, la contradiction et le jugement.",
        "C’est leur combinaison qui fait Perlimpinpin.",
      ].join("\n"),
    },
    { cle: "section3.titre", groupe: "Les 3 sections", libelle: "Section 3 — titre", defaut: "Un outil indépendant" },
    {
      cle: "section3.texte", groupe: "Les 3 sections",
      libelle: "Section 3 — texte",
      defaut: [
        "Perlimpinpin est porté par une association indépendante.",
        "Les adhésions et les dons financent :",
        "L’indépendance.",
        "La technologie.",
        "L’accès aux analyses.",
      ].join("\n"),
    },

    // Encadré final
    { cle: "cta.surtitre", groupe: "Encadré final", libelle: "Encadré final — petit surtitre", defaut: "Rejoignez le Club" },
    { cle: "cta.titre", groupe: "Encadré final", libelle: "Encadré final — titre", defaut: "Entrez dans l’aventure." },
    {
      cle: "cta.texte", groupe: "Encadré final",
      libelle: "Encadré final — texte",
      defaut: "Faites un don de 2 € sur HelloAsso pour rejoindre le Club Perlimpinpin.",
    },
    { cle: "cta.bouton", groupe: "Encadré final", libelle: "Encadré final — texte du bouton", defaut: "Faire un don de 2 €" },
  ],
};

export default page;
