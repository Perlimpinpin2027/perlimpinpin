// Textes modifiables de la page /a-propos (voir src/lib/textes-site.js).
// Champs « riche » : *gras* et [lien](/adresse) acceptés (src/components/TexteRiche.js).

const page = {
  nom: "À propos",
  chemin: "/a-propos",
  champs: [
    { cle: "entete.titre", groupe: "En-tête", libelle: "Grand titre (le point coloré est ajouté automatiquement)", defaut: "Construire pour la démocratie" },
    { cle: "entete.soustitre", groupe: "En-tête", libelle: "Sous-titre", defaut: "Pourquoi Perlimpinpin existe" },
    {
      cle: "entete.auteurs",
      groupe: "En-tête",
      libelle: "Signature",
      riche: true,
      defaut:
        "Par [Arno Fontaine](https://www.linkedin.com/in/arno-fontaine-049a52100/) et [Matis Brasca](https://www.linkedin.com/in/matisbrasca/?locale=fr)",
    },
    {
      cle: "introduction",
      groupe: "Introduction",
      libelle: "Introduction (un paragraphe par ligne)",
      riche: true,
      defaut: [
        "*Une campagne électorale se déroule presque toujours selon le même scénario.* Un candidat avance un chiffre. Un autre le conteste. Un troisième change de sujet. Le citoyen, lui, reste avec des questions simples et rarement résolues : qui a raison ? Comment juger les propositions énoncées ? Comment évaluer la crédibilité des promesses qui engagent notre avenir ?",
        "*Perlimpinpin est né de cette frustration.* Non pas pour dire aux Français pour qui voter, mais pour leur donner les moyens de juger par eux-mêmes de la faisabilité des propositions politiques.",
      ].join("\n"),
    },

    { cle: "section1.titre", groupe: "Section 1", libelle: "Titre", defaut: "Des discours électoraux qui doivent être pris au sérieux" },
    {
      cle: "section1.texte",
      groupe: "Section 1",
      libelle: "Texte (un paragraphe par ligne)",
      riche: true,
      defaut: [
        "Aujourd'hui, les discours politiques regorgent d'approximations, d'appels à la peur et de ressorts émotionnels. Ils s'appuient parfois davantage sur une perception subjective de la réalité que sur des faits documentés ou une analyse sérieuse des enjeux. *Face à cette surenchère, nous voulons réinjecter de la méthode.*",
        "Perlimpinpin consiste à mesurer la faisabilité réelle d'une proposition politique. Non pas pour juger de l'intention du candidat, mais pour mesurer la distance entre l'ambition et sa réalisation.",
        "Une mesure peut être sincère et rester juridiquement bloquée. Une autre peut sembler modeste tout en étant parfaitement applicable et répondre efficacement à un problème documenté. Il faut regarder le droit, le financement, les moyens humains, les délais, les conséquences économiques et les éventuels effets secondaires.",
        "*Notre rôle est de faire cette distinction, mesure après mesure, en toute indépendance.*",
      ].join("\n"),
    },

    { cle: "section2.titre", groupe: "Section 2", libelle: "Titre", defaut: "Pour des politiques publiques réellement efficaces" },
    {
      cle: "section2.texte",
      groupe: "Section 2",
      libelle: "Texte (un paragraphe par ligne)",
      riche: true,
      defaut: [
        "On déplore trop souvent l'inefficacité de l'action publique après coup, lorsque les lois sont votées, les budgets engagés et que les réformes ne produisent pas les effets escomptés. Ce diagnostic tardif nourrit la défiance et le sentiment que les promesses n'engagent finalement que ceux qui les reçoivent.",
        "Nous sommes convaincus que l'évaluation des politiques publiques ne doit pas intervenir uniquement en fin de mandat : *le contrôle de crédibilité doit commencer au moment même où la promesse est formulée.*",
        "Cela suppose d'anticiper les effets rebonds, les impacts collatéraux sur d'autres secteurs, les coûts indirects, les contraintes administratives ou encore les changements de comportement qu'une politique peut provoquer.",
        "Évaluer l'efficacité attendue, la faisabilité budgétaire, juridique et opérationnelle d'une annonce avant le vote, c'est choisir de confronter le slogan au réel. Sans nier l'importance de la vision politique, nous voulons donner aux citoyens les moyens d'exiger davantage de précision et encourager les candidats à proposer des mesures réellement applicables.",
        "*L'essence même de la politique réside dans la capacité à promettre, puis à tenir ses engagements face à l'incertitude.* Aujourd'hui, restaurer cette capacité d'action est une nécessité : c'est précisément l'accumulation des promesses non tenues qui a fini par éloigner tant de citoyens des urnes. Perlimpinpin est né pour préserver ce lien de confiance, qui constitue le cœur et l'ADN de notre vie démocratique.",
      ].join("\n"),
    },

    { cle: "section3.titre", groupe: "Section 3", libelle: "Titre", defaut: "L'intelligence artificielle au service de l'intérêt général" },
    {
      cle: "section3.texte",
      groupe: "Section 3",
      libelle: "Texte (un paragraphe par ligne)",
      riche: true,
      defaut: [
        "Un tel travail serait extrêmement difficile à réaliser à cette échelle sans intelligence artificielle.",
        "Analyser des centaines de propositions suppose de confronter des textes législatifs, des rapports publics, des données économiques, des études scientifiques et des milliers de pages de documentation. *L'IA permet aujourd'hui de traiter cette masse d'informations et de mobiliser une puissance de calcul considérable pour analyser chaque mesure sous plusieurs angles.*",
        "Mais dans cet environnement, nous avançons en connaissance de cause : entre souveraineté numérique, souveraineté énergétique, dérives de la désinformation, *l'impact sociétal de ces technologies est immense.* A cette fin, nous nous sommes posés une question centrale : *comment pouvons-nous utiliser l'IA générative pour servir la démocratie plutôt que pour la fragiliser ?*",
        "Alors que les algorithmes des réseaux sociaux et les IA génératives utilisées sans contrôle ont tendance à enfermer chacun de nous dans des bulles de confirmation et informationnelles, nous avons fait le choix d'utiliser les agents conversationnels comme des outils de rigueur méthodologique. L'idée de Perlimpinpin est d'offrir un éclairage fiable, transparent, méthodique et associés à une supervision humaine.",
        "Ici, chaque fiche passe par une chaîne automatisée de recherche, d'analyse, de contradiction et de synthèse. *Claude intervient d'abord, puis Mistral, une intelligence artificielle française, travaille à son tour sur les informations et raisonnements produits afin de générer les fiches selon notre méthodologie.* Plusieurs opérations peuvent ainsi être nécessaires pour une seule proposition avant d'aboutir au résultat présenté au lecteur.",
        "Les IA travaillent à partir des informations accessibles sur Internet, mais également *d'un corpus documentaire interne construit par Perlimpinpin*. Il centralise aujourd'hui plus de 70 liens institutionnels et rapports de référence, notamment issus de l'INSEE, de la Cour des comptes, de RTE, de l'OCDE, de la DREES ou de l'IPP, et mémorise exactement 39 « Données Pivots », soit trois données fondamentales pour chacun des domaines couverts par notre algorithme.",
        "À cette base s'ajoutent des textes officiels, législatifs, institutionnels et scientifiques sélectionnés pour leur fiabilité. Imprimée, cette documentation représenterait déjà une longueur comparable à celle de Notre-Dame de Paris ; recopiée à la main sur une seule ligne, elle pourrait parcourir les Champs-Élysées.",
        "Et elle continuera de grandir.",
        "*Nous croyons à un déploiement responsable et progressif de l'intelligence artificielle dans le débat public.* De ce fait, Perlimpinpin répond à une problématique démocratique et n'est pas une boîte noire figée : notre méthode s'affine au contact du réel, mesure après mesure, sous le contrôle direct de nos utilisateurs. En exposant nos sources, en publiant notre méthode, nos biais potentiels et nos limites, nous permettons à la société civile d'apprendre à utiliser ces nouveaux outils pour renforcer le débat démocratique plutôt que pour le subir.",
      ].join("\n"),
    },

    { cle: "section4.titre", groupe: "Section 4", libelle: "Titre", defaut: "Une méthodologie 100 % ouverte et transparente" },
    {
      cle: "section4.texte",
      groupe: "Section 4",
      libelle: "Texte (un paragraphe par ligne)",
      riche: true,
      defaut: [
        "Une méthode de notation secrète ne vaut rien. La nôtre est publique, accessible à tous, et chaque score renvoie aux éléments documentaires qui ont alimenté l'analyse.",
        "Elle repose sur cinq critères pondérés permettant notamment d'examiner la faisabilité (juridique, budgétaire et en termes de moyens humains), l'efficacité, les risques potentiels, la maturité et la cohérence de la proposition.",
        "Pour limiter les raisonnements trop rapides ou les biais d'un modèle unique, notre protocole sépare volontairement l'instruction initiale, la contradiction et la synthèse finale, avant une relecture humaine.",
        '*A cette fin, et pour améliorer nos contenus au fur et à mesure, plusieurs versions suivront dans les prochains mois afin d\'aboutir à des analyses de plus en plus approfondies.* Il s\'agit pour l\'instant de la V1 de Perlimpinpin, nom de code "Tagadaaa".',
        "*L'intégralité de cette démarche est disponible sur notre [page Méthodologie](/methode).*",
        "Perlimpinpin a par ailleurs fait le choix d'un statut associatif strict, loi 1901. Nous ne dépendons d'aucun parti, ne vendons pas d'espace publicitaire et ne recherchons pas la rentabilité. Une campagne de financement participatif doit nous permettre de couvrir notamment les coûts de développement, d'infrastructure et de calcul liés au fonctionnement de la plateforme.",
        "*Ce choix garantit que nos algorithmes et nos évaluations restent alignés avec une seule et unique priorité : l'intérêt général.*",
      ].join("\n"),
    },

    { cle: "section5.titre", groupe: "Section 5", libelle: "Titre", defaut: "Le 10 septembre 2026 est un commencement" },
    {
      cle: "section5.texte",
      groupe: "Section 5",
      libelle: "Texte (un paragraphe par ligne)",
      riche: true,
      defaut: [
        "*La plateforme ouvre ses portes en septembre 2026, à quelques mois des grandes échéances politiques.* Chaque nouvelle mesure analysée viendra enrichir notre base publique de connaissances, avec ses sources, son score et ses limites méthodologiques.",
        "*Nous ne prétendons pas nous substituer au débat politique ou au choix des électeurs.* Nous voulons lui redonner un socle de faits vérifiables sur lequel construire des décisions plus éclairées.",
        "*Notre ambition ne s'arrête pas à notre propre plateforme.* Nous considérerons une partie de notre mission accomplie si nos travaux, nos données et notre méthodologie permettent demain à des journalistes, des chercheurs, des associations ou de simples citoyens d'élever leur niveau d'exigence face aux promesses politiques.",
        "*Nous ne cherchons pas à détenir le monopole du fait, mais à contribuer à construire l'infrastructure méthodologique et technologique dont la démocratie a aujourd'hui besoin.*",
      ].join("\n"),
    },
  ],
};

export default page;
