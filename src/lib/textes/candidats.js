// Textes modifiables de la page /candidats (voir src/lib/textes-site.js).
// Les cartes des candidats (parcours, indemnités, frais de mandat) viennent
// de data/candidats-parcours.json et ne sont pas modifiables ici.

const page = {
  nom: "Candidats",
  chemin: "/candidats",
  champs: [
    { cle: "entete.surtitre", groupe: "En-tête", libelle: "Sur-titre (le « // » est ajouté automatiquement)", defaut: "Présidentielle 2027" },
    { cle: "entete.titre", groupe: "En-tête", libelle: "Grand titre", defaut: "Les candidats" },
    {
      cle: "entete.introduction",
      groupe: "En-tête",
      libelle: "Phrase d'introduction",
      defaut:
        "Découvrez les déclarations analysées et leur niveau moyen de solidité selon la méthode Perlimpinpin.",
    },

    {
      cle: "notes.score",
      groupe: "Notes sous la grille",
      libelle: "Note sur le score",
      defaut:
        "Ce score est une moyenne arithmétique des mesures actuellement analysées par l’outil. Il ne constitue ni un jugement sur la personne, ni un indice général de crédibilité politique, et évolue au fur et à mesure des analyses.",
    },
    {
      cle: "notes.indemnites",
      groupe: "Notes sous la grille",
      libelle: "Note sur les indemnités et revenus",
      defaut:
        "Indemnités d’élu : montants bruts mensuels au 1er janvier 2026, d’après les barèmes officiels ; pour les mandats locaux, il s’agit des plafonds fixés par la loi. Revenus déclarés à la HATVP : montants nets, tels que déclarés par l’élu, non comparables aux indemnités brutes.",
    },
    {
      cle: "notes.frais",
      groupe: "Notes sous la grille",
      libelle: "Note sur les frais de mandat",
      defaut:
        "Les frais de mandat financent les dépenses liées au mandat (permanence, déplacements, communication) et ne constituent pas un revenu. Montants identiques pour tous les élus d’une même assemblée.",
    },
    {
      cle: "notes.condamnations",
      groupe: "Notes sous la grille",
      libelle: "Note sur les condamnations (la date de dernière vérification, tirée de data/condamnations.json, est ajoutée automatiquement)",
      defaut:
        "Condamnations pénales prononcées par un tribunal. « Définitive » : plus aucun recours possible. Les enquêtes et mises en examen ne figurent pas.",
    },
  ],
};

export default page;
