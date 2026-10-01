// Textes modifiables de la page /methode (voir src/lib/textes-site.js).
// Ne sont PAS ici : les tranches de score (src/lib/score.js, partagées avec
// tout le site) et les libellés techniques input/output des 5 étapes.

const G_ENTETE = "En-tête";
const G_ETAPES = "Les 5 étapes de l'analyse";
const G_CRITERES = "Les cinq critères";
const G_NOTE = "La note finale";
const G_GRILLE = "D'où vient notre grille";
const G_VERIF = "Notre processus de vérification";
const G_GARDEFOUS = "Nos garde-fous";
const G_NONPAS = "Ce que Perlimpinpin n'est pas";

const page = {
  nom: "Méthode",
  chemin: "/methode",
  champs: [
    { cle: "entete.etiquette", groupe: G_ENTETE, libelle: "Petite étiquette", defaut: "/ Méthode" },
    { cle: "entete.titre", groupe: G_ENTETE, libelle: "Grand titre", defaut: "Comment fonctionne une analyse" },
    {
      cle: "entete.texte",
      groupe: G_ENTETE,
      libelle: "Texte sous le titre",
      defaut: "Une chaîne de traitement transparente. Survolez une étape pour voir ce qui se passe.",
    },

    { cle: "etape1.carte", groupe: G_ETAPES, libelle: "Étape 01 — texte de la carte", defaut: "Reformuler la déclaration" },
    { cle: "etape1.titre", groupe: G_ETAPES, libelle: "Étape 01 — titre du détail", defaut: "La déclaration est reformulée simplement." },
    {
      cle: "etape1.texte",
      groupe: G_ETAPES,
      libelle: "Étape 01 — texte du détail",
      defaut: "On résume la promesse en une phrase claire, sans l'interprétation du candidat ni la nôtre.",
    },
    { cle: "etape2.carte", groupe: G_ETAPES, libelle: "Étape 02 — texte de la carte", defaut: "Rassembler les sources" },
    { cle: "etape2.titre", groupe: G_ETAPES, libelle: "Étape 02 — titre du détail", defaut: "Les sources sont rassemblées et vérifiées." },
    {
      cle: "etape2.texte",
      groupe: G_ETAPES,
      libelle: "Étape 02 — texte du détail",
      defaut:
        "Données publiques d'abord (Légifrance, INSEE, Cour des comptes...) — jamais une source militante comme preuve d'un fait.",
    },
    { cle: "etape3.carte", groupe: G_ETAPES, libelle: "Étape 03 — texte de la carte", defaut: "Situer la mesure dans son contexte" },
    { cle: "etape3.titre", groupe: G_ETAPES, libelle: "Étape 03 — titre du détail", defaut: "La mesure est replacée dans son contexte." },
    {
      cle: "etape3.texte",
      groupe: G_ETAPES,
      libelle: "Étape 03 — texte du détail",
      defaut:
        "Dans le programme du candidat, dans la réalité française actuelle, et à l'international quand c'est pertinent.",
    },
    { cle: "etape4.carte", groupe: G_ETAPES, libelle: "Étape 04 — texte de la carte", defaut: "Évaluer selon 5 critères" },
    {
      cle: "etape4.titre",
      groupe: G_ETAPES,
      libelle: "Étape 04 — titre du détail",
      defaut: "La mesure est notée selon cinq critères indépendants.",
    },
    {
      cle: "etape4.texte",
      groupe: G_ETAPES,
      libelle: "Étape 04 — texte du détail",
      defaut: "Cinq critères, chacun noté séparément, pour un total sur 100 points — détail plus bas sur cette page.",
    },
    { cle: "etape5.carte", groupe: G_ETAPES, libelle: "Étape 05 — texte de la carte", defaut: "Qualifier le résultat" },
    {
      cle: "etape5.titre",
      groupe: G_ETAPES,
      libelle: "Étape 05 — titre du détail",
      defaut: "Ce qui est établi, probable, discutable et inconnu est distingué explicitement.",
    },
    {
      cle: "etape5.texte",
      groupe: G_ETAPES,
      libelle: "Étape 05 — texte du détail",
      defaut:
        "Quand une source manque, on l'écrit noir sur blanc — « sources insuffisantes » — plutôt que de deviner.",
    },
    {
      cle: "etapes.note",
      groupe: G_ETAPES,
      libelle: "Petite note sous les étapes",
      defaut: "Les détails complets apparaissent au survol de chaque étape.",
    },

    { cle: "criteres.titre", groupe: G_CRITERES, libelle: "Titre du bloc", defaut: "Les cinq critères" },
    {
      cle: "critere1.titre",
      groupe: G_CRITERES,
      libelle: "Critère 01 — titre",
      defaut: "« Est-ce que c'est possible ? » — Opérationnalité & Moyens (30 points)",
    },
    {
      cle: "critere1.texte",
      groupe: G_CRITERES,
      libelle: "Critère 01 — texte",
      defaut:
        "Trois piliers notés séparément (juridique, budgétaire, moyens humains, 10 points chacun). Si l'un est vraiment défaillant, le sous-total plafonne à 10/30, même si les deux autres sont solides.",
    },
    {
      cle: "critere2.titre",
      groupe: G_CRITERES,
      libelle: "Critère 02 — titre",
      defaut: "« Est-ce que ça marche ? » — Efficacité (30 points)",
    },
    {
      cle: "critere2.texte",
      groupe: G_CRITERES,
      libelle: "Critère 02 — texte",
      defaut:
        "Le lien de cause à effet est-il direct, indirect, ou quasiment absent ? Et une preuve concrète confirme-t-elle que ça fonctionne pour ce cas précis ?",
    },
    {
      cle: "critere3.titre",
      groupe: G_CRITERES,
      libelle: "Critère 03 — titre",
      defaut: "« Quels sont les risques de dérive ? » — Effets rebonds & Externalités (20 points)",
    },
    {
      cle: "critere3.texte",
      groupe: G_CRITERES,
      libelle: "Critère 03 — texte",
      defaut:
        "La mesure risque-t-elle de créer un problème aussi grave que celui qu'elle prétend résoudre ? Reports de coûts, impacts économiques, sociaux ou environnementaux non voulus.",
    },
    {
      cle: "critere4.titre",
      groupe: G_CRITERES,
      libelle: "Critère 04 — titre",
      defaut: "« Est-ce que c'est mature ? » — Degré de préparation (10 points)",
    },
    {
      cle: "critere4.texte",
      groupe: G_CRITERES,
      libelle: "Critère 04 — texte",
      defaut:
        "Un projet détaillé et chiffré, ou un simple slogan de campagne ? Et si des chiffres sont avancés, sont-ils exacts au regard des sources officielles ?",
    },
    {
      cle: "critere5.titre",
      groupe: G_CRITERES,
      libelle: "Critère 05 — titre",
      defaut: "« Est-ce que c'est cohérent ? » — Alignement & Logique globale (10 points)",
    },
    {
      cle: "critere5.texte",
      groupe: G_CRITERES,
      libelle: "Critère 05 — texte",
      defaut:
        "Cohérente avec le reste du programme du candidat, et avec ses votes passés sur des textes comparables. Sans mandat antérieur, seule la cohérence du programme compte.",
    },

    { cle: "note.etiquette", groupe: G_NOTE, libelle: "Petite étiquette", defaut: "// Output_score" },
    { cle: "note.titre", groupe: G_NOTE, libelle: "Titre", defaut: "La note finale" },
    {
      cle: "note.texte",
      groupe: G_NOTE,
      libelle: "Texte (les tranches de score en dessous ne sont pas modifiables ici)",
      defaut: "Les cinq critères s'additionnent pour produire un score sur 100.",
    },

    { cle: "grille.titre", groupe: G_GRILLE, libelle: "Titre", defaut: "D'où vient notre grille" },
    {
      cle: "grille.texte",
      groupe: G_GRILLE,
      libelle: "Texte (un paragraphe par ligne)",
      riche: true,
      defaut: [
        "On n'a pas inventé ces cinq critères dans notre coin. Ils s'inspirent de plusieurs décennies de recherche, en France et à l'international, sur la manière de juger sérieusement une politique publique, notamment les travaux d'Eugene Bardach (Berkeley), l'un des fondateurs de l'analyse des politiques publiques aux États-Unis, et d'Elinor Ostrom, première femme à avoir reçu le prix Nobel d'économie (2009), qui a montré qu'une réforme peut être parfaitement légale sur le papier et pourtant échouer dans les faits parce que le vrai pouvoir de décision appartient à d'autres acteurs que ceux visés par la promesse.",
        "En France, Pierre Muller, Yves Surel et Patrice Duran ont posé les bases de l'analyse des politiques publiques. Et l'universitaire italien Giandomenico Majone nous rappelle qu'aucune évaluation n'est jamais totalement neutre : c'est pour ça qu'on rend notre grille et nos sources publiques.",
        "Le principe de comparer chaque mesure à un objectif de référence, plutôt qu'à l'objectif tel que le candidat le formule, s'appuie lui aussi sur des cadres reconnus : les critères d'évaluation du Comité d'aide au développement de l'OCDE, la distinction entre réalisation et résultat popularisée par le chercheur français Patrick Gibert, et le Green Book du Trésor britannique, référence en matière d'évaluation des politiques publiques.",
      ].join("\n"),
    },

    { cle: "verification.titre", groupe: G_VERIF, libelle: "Titre", defaut: "Notre processus de vérification" },
    {
      cle: "verification.texte",
      groupe: G_VERIF,
      libelle: "Texte (un paragraphe par ligne)",
      riche: true,
      defaut: [
        "Chaque analyse passe par plusieurs étapes avant publication, pour limiter les erreurs et les angles morts d'un seul modèle.",
        "Une première analyse est effectuée avec Claude, qui soulève les points les plus importants : chiffres et sources, faisabilité juridique, coût, effets attendus, angles morts.",
        "Une contre-analyse est ensuite effectuée avec Mistral, un second modèle indépendant, dont le rôle est justement de challenger la première analyse en repérant un chiffre douteux, une affirmation juridique trop tranchée, ou un point structurant qui aurait été oublié.",
        "Le résumé final est produit par Claude, qui tranche entre les deux analyses et n'intègre que les remarques réellement fondées.",
        "Cette double vérification par IA est ensuite relue par des experts vérificateurs avant toute publication.",
      ].join("\n"),
    },

    { cle: "gardefous.titre", groupe: G_GARDEFOUS, libelle: "Titre du bloc", defaut: "Nos garde-fous" },
    {
      cle: "gardefou1.titre",
      groupe: G_GARDEFOUS,
      libelle: "Garde-fou 01 — titre",
      defaut: "On ne présume jamais qu'une source est pertinente.",
    },
    {
      cle: "gardefou1.texte",
      groupe: G_GARDEFOUS,
      libelle: "Garde-fou 01 — texte",
      defaut:
        "Nos documents de référence servent de base de travail, pas de réponse toute faite. Si une source n'a rien à voir avec la mesure analysée, on le dit.",
    },
    {
      cle: "gardefou2.titre",
      groupe: G_GARDEFOUS,
      libelle: "Garde-fou 02 — titre",
      defaut: "On ne cite jamais une source qu'on n'a pas réellement consultée.",
    },
    {
      cle: "gardefou2.texte",
      groupe: G_GARDEFOUS,
      libelle: "Garde-fou 02 — texte (vide par défaut : rien ne s'affiche)",
      defaut: "",
    },
    { cle: "gardefou3.titre", groupe: G_GARDEFOUS, libelle: "Garde-fou 03 — titre", defaut: "On signale les désaccords entre sources" },
    {
      cle: "gardefou3.texte",
      groupe: G_GARDEFOUS,
      libelle: "Garde-fou 03 — texte",
      defaut: "plutôt que de trancher arbitrairement en leur faveur.",
    },
    {
      cle: "gardefou4.titre",
      groupe: G_GARDEFOUS,
      libelle: "Garde-fou 04 — titre",
      defaut: "Le calcul du score final n'est jamais fait par une IA.",
    },
    {
      cle: "gardefou4.texte",
      groupe: G_GARDEFOUS,
      libelle: "Garde-fou 04 — texte",
      defaut:
        "C'est toujours notre code qui additionne les points selon les règles ci-dessus, jamais un modèle qui décide du chiffre final à l'instinct.",
    },

    { cle: "nonpas.titre", groupe: G_NONPAS, libelle: "Titre", defaut: "Ce que Perlimpinpin n'est pas" },
    {
      cle: "nonpas.texte",
      groupe: G_NONPAS,
      libelle: "Texte (un paragraphe par ligne)",
      riche: true,
      defaut:
        "Perlimpinpin ne dit pas si une mesure est souhaitable politiquement : ça reste un choix de valeurs, propre à chacun. On évalue si une promesse est réaliste, chiffrée et cohérente avec les contraintes du pays. Le reste, c'est à vous de le décider dans les urnes.",
    },
  ],
};

export default page;
