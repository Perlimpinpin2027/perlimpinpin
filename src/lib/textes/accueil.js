// Textes modifiables de la page d'accueil (voir src/lib/textes-site.js).
// Ne sont PAS ici : les données (déclarations, candidats, scores) et les
// libellés des tranches de score (src/lib/score.js, liés à la méthodologie).

const page = {
  nom: "Accueil",
  chemin: "/",
  champs: [
    // Bandeau principal (src/components/HeroText.js)
    { cle: "hero.etiquette", groupe: "Bandeau principal", libelle: "Étiquette rouge", defaut: "Présidentielles 2027" },
    {
      cle: "hero.titre",
      groupe: "Bandeau principal",
      libelle: "Grand titre (le point bleu suit le dernier mot)",
      defaut: "Ce que valent vraiment les promesses politiques",
    },
    {
      cle: "hero.texte",
      groupe: "Bandeau principal",
      libelle: "Texte sous le titre",
      defaut:
        "Perlimpinpin analyse les déclarations des candidats à l'élection présidentielle 2027 avec l'IA et des experts, à partir de sources publiques et d'une méthode transparente.",
    },
    { cle: "hero.atout1.titre", groupe: "Bandeau principal", libelle: "Atout 01 — titre", defaut: "Analyses générées par l'IA" },
    {
      cle: "hero.atout1.texte",
      groupe: "Bandeau principal",
      libelle: "Atout 01 — texte",
      defaut: "Une méthodologie commune et évolutive, appliquée à chaque mesure.",
    },
    { cle: "hero.atout2.titre", groupe: "Bandeau principal", libelle: "Atout 02 — titre", defaut: "Méthodologie avec des experts" },
    {
      cle: "hero.atout2.texte",
      groupe: "Bandeau principal",
      libelle: "Atout 02 — texte",
      defaut: "Construite avec économistes, experts et journalistes.",
    },
    { cle: "hero.atout3.titre", groupe: "Bandeau principal", libelle: "Atout 03 — titre", defaut: "Sources publiques et documentées" },
    {
      cle: "hero.atout3.texte",
      groupe: "Bandeau principal",
      libelle: "Atout 03 — texte",
      defaut: "Données institutionnelles et sources de référence.",
    },

    // Les 3 colonnes (src/components/BottomColumns.js)
    { cle: "colonnes.declarations.titre", groupe: "Les 3 colonnes", libelle: "Colonne 1 — titre", defaut: "Dernières déclarations" },
    { cle: "colonnes.declarations.lien", groupe: "Les 3 colonnes", libelle: "Colonne 1 — lien", defaut: "Voir toutes →" },
    {
      cle: "colonnes.declarations.vide",
      groupe: "Les 3 colonnes",
      libelle: "Colonne 1 — message s'il n'y a aucune déclaration",
      defaut: "Aucune déclaration analysée pour le moment.",
    },
    { cle: "colonnes.score.titre", groupe: "Les 3 colonnes", libelle: "Colonne 2 — titre", defaut: "Comment fonctionne le score ?" },
    {
      cle: "colonnes.score.texte",
      groupe: "Les 3 colonnes",
      libelle: "Colonne 2 — texte",
      defaut: "Le Score Perlimpinpin évalue la qualité informationnelle des déclarations sur 100 points.",
    },
    { cle: "colonnes.candidats.titre", groupe: "Les 3 colonnes", libelle: "Colonne 3 — titre", defaut: "Indice de fiabilité des candidats" },
    {
      cle: "colonnes.candidats.soustitre",
      groupe: "Les 3 colonnes",
      libelle: "Colonne 3 — sous-titre",
      defaut: "Moyenne arithmétique des propositions des candidats",
    },
    { cle: "colonnes.candidats.lien", groupe: "Les 3 colonnes", libelle: "Colonne 3 — lien", defaut: "Voir tous les candidats →" },
    {
      cle: "colonnes.candidats.vide",
      groupe: "Les 3 colonnes",
      libelle: "Colonne 3 — message s'il n'y a aucun candidat",
      defaut: "Aucun candidat enregistré.",
    },
    {
      cle: "colonnes.candidats.note",
      groupe: "Les 3 colonnes",
      libelle: "Colonne 3 — note en bas",
      defaut:
        "Ce score est une moyenne arithmétique des mesures actuellement analysées par l’outil. Il ne constitue ni un jugement sur la personne, ni un indice général de crédibilité politique, et évolue au fur et à mesure des analyses.",
    },

    // Bandeau « Rejoindre » (src/components/SupportBanner.js)
    {
      cle: "bandeau.titre",
      groupe: "Bandeau « Rejoignez-nous »",
      libelle: "Titre (une ligne par morceau)",
      defaut: "L’objectivité ne se décrète pas.\nElle se construit.",
    },
    {
      cle: "bandeau.texte",
      groupe: "Bandeau « Rejoignez-nous »",
      libelle: "Texte",
      defaut:
        "Relisez, commentez et challengez les analyses avant leur publication en adhérant à l'association pour 2€.",
    },
    { cle: "bandeau.bouton", groupe: "Bandeau « Rejoignez-nous »", libelle: "Texte du bouton", defaut: "Rejoignez-nous →" },

    // Encadré du bas
    { cle: "transparence.titre", groupe: "Encadré du bas", libelle: "Titre", defaut: "Transparence et indépendance" },
    {
      cle: "transparence.texte",
      groupe: "Encadré du bas",
      libelle: "Texte",
      defaut:
        "Perlimpinpin est un projet éditorial indépendant. Nos analyses sont gratuites, sans publicité et sans influence politique.",
    },
    { cle: "transparence.lien", groupe: "Encadré du bas", libelle: "Lien", defaut: "En savoir plus sur nous →" },
  ],
};

export default page;
