import Link from "next/link";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";
import SectionHeading from "@/components/SectionHeading";

export const metadata = {
  title: "À propos — Perlimpinpin",
  description: "Qui est derrière Perlimpinpin et pourquoi ce projet existe.",
};

// Chaque section de l'essai : séparateur fin au-dessus pour la distinguer
// du paragraphe précédent, puis SectionHeading (accent vertical bleu/indigo,
// composant partagé — voir Étape 0.3 de la demande d'audit).
function Section({ title, children }) {
  return (
    <div className="pt-6">
      <hr className="border-zinc-200" />
      <div className="mt-6 flex flex-col gap-4">
        <SectionHeading>{title}</SectionHeading>
        {children}
      </div>
    </div>
  );
}

// Convertit un marquage minimal *gras* en JSX. Astérisque simple, pas
// double : convention propre à ce texte (voir la demande d'origine) — un
// seul *...* y vaut gras, pas italique, contrairement au markdown standard.
function renderBold(text) {
  return text.split(/(\*[^*]+\*)/g).map((part, index) => {
    const match = part.match(/^\*([^*]+)\*$/);
    return match ? (
      <strong key={index} className="font-bold text-zinc-900">
        {match[1]}
      </strong>
    ) : (
      <span key={index}>{part}</span>
    );
  });
}

function Paragraph({ text }) {
  return (
    <p className="text-base leading-relaxed text-zinc-600">
      {renderBold(text)}
    </p>
  );
}

const introParagraphs = [
  "*Une campagne électorale se déroule presque toujours selon le même scénario.* Un candidat avance un chiffre. Un autre le conteste. Un troisième change de sujet. Le citoyen, lui, reste avec des questions simples et rarement résolues : qui a raison ? Comment juger les propositions énoncées ? Comment évaluer la crédibilité des promesses qui engagent notre avenir ?",
  "*Perlimpinpin est né de cette frustration.* Non pas pour dire aux Français pour qui voter, mais pour leur donner les moyens de juger par eux-mêmes de la faisabilité des propositions politiques.",
];

const essaySections = [
  {
    title: "Des discours électoraux qui doivent être pris au sérieux",
    paragraphs: [
      "Aujourd'hui, les discours politiques regorgent d'approximations, d'appels à la peur et de ressorts émotionnels. Ils s'appuient parfois davantage sur une perception subjective de la réalité que sur des faits documentés ou une analyse sérieuse des enjeux. *Face à cette surenchère, nous voulons réinjecter de la méthode.*",
      "Perlimpinpin consiste à mesurer la faisabilité réelle d'une proposition politique. Non pas pour juger de l'intention du candidat, mais pour mesurer la distance entre l'ambition et sa réalisation.",
      "Une mesure peut être sincère et rester juridiquement bloquée. Une autre peut sembler modeste tout en étant parfaitement applicable et répondre efficacement à un problème documenté. Il faut regarder le droit, le financement, les moyens humains, les délais, les conséquences économiques et les éventuels effets secondaires.",
      "*Notre rôle est de faire cette distinction, mesure après mesure, en toute indépendance.*",
    ],
  },
  {
    title: "Pour des politiques publiques réellement efficaces",
    paragraphs: [
      "On déplore trop souvent l'inefficacité de l'action publique après coup, lorsque les lois sont votées, les budgets engagés et que les réformes ne produisent pas les effets escomptés. Ce diagnostic tardif nourrit la défiance et le sentiment que les promesses n'engagent finalement que ceux qui les reçoivent.",
      "Nous sommes convaincus que l'évaluation des politiques publiques ne doit pas intervenir uniquement en fin de mandat : *le contrôle de crédibilité doit commencer au moment même où la promesse est formulée.*",
      "Cela suppose d'anticiper les effets rebonds, les impacts collatéraux sur d'autres secteurs, les coûts indirects, les contraintes administratives ou encore les changements de comportement qu'une politique peut provoquer.",
      "Évaluer l'efficacité attendue, la faisabilité budgétaire, juridique et opérationnelle d'une annonce avant le vote, c'est choisir de confronter le slogan au réel. Sans nier l'importance de la vision politique, nous voulons donner aux citoyens les moyens d'exiger davantage de précision et encourager les candidats à proposer des mesures réellement applicables.",
      "*L'essence même de la politique réside dans la capacité à promettre, puis à tenir ses engagements face à l'incertitude.* Aujourd'hui, restaurer cette capacité d'action est une nécessité : c'est précisément l'accumulation des promesses non tenues qui a fini par éloigner tant de citoyens des urnes. Perlimpinpin est né pour préserver ce lien de confiance, qui constitue le cœur et l'ADN de notre vie démocratique.",
    ],
  },
  {
    title: "L'intelligence artificielle au service de l'intérêt général",
    paragraphs: [
      "Un tel travail serait extrêmement difficile à réaliser à cette échelle sans intelligence artificielle.",
      "Analyser des centaines de propositions suppose de confronter des textes législatifs, des rapports publics, des données économiques, des études scientifiques et des milliers de pages de documentation. *L'IA permet aujourd'hui de traiter cette masse d'informations et de mobiliser une puissance de calcul considérable pour analyser chaque mesure sous plusieurs angles.*",
      "Mais dans cet environnement, nous avançons en connaissance de cause : entre souveraineté numérique, souveraineté énergétique, dérives de la désinformation, *l'impact sociétal de ces technologies est immense.* A cette fin, nous nous sommes posés une question centrale : *comment pouvons-nous utiliser l'IA générative pour servir la démocratie plutôt que pour la fragiliser ?*",
      "Alors que les algorithmes des réseaux sociaux et les IA génératives utilisées sans contrôle ont tendance à enfermer chacun de nous dans des bulles de confirmation et informationnelles, nous avons fait le choix d'utiliser les agents conversationnels comme des outils de rigueur méthodologique. L'idée de Perlimpinpin est d'offrir un éclairage fiable, transparent, méthodique et associés à une supervision humaine.",
      "Ici, chaque fiche passe par une chaîne automatisée de recherche, d'analyse, de contradiction et de synthèse. *Claude intervient d'abord, puis Mistral, une intelligence artificielle française, travaille à son tour sur les informations et raisonnements produits afin de générer les fiches selon notre méthodologie.* Plusieurs opérations peuvent ainsi être nécessaires pour une seule proposition avant d'aboutir au résultat présenté au lecteur.",
      "Les IA travaillent à partir des informations accessibles sur Internet, mais également *d'un corpus documentaire interne construit par Perlimpinpin*. Il centralise aujourd'hui plus de 70 liens institutionnels et rapports de référence, notamment issus de l'INSEE, de la Cour des comptes, de RTE, de l'OCDE, de la DREES ou de l'IPP, et mémorise exactement 39 « Données Pivots », soit trois données fondamentales pour chacun des domaines couverts par notre algorithme.",
      "À cette base s'ajoutent des textes officiels, législatifs, institutionnels et scientifiques sélectionnés pour leur fiabilité. Imprimée, cette documentation représenterait déjà une longueur comparable à celle de Notre-Dame de Paris ; recopiée à la main sur une seule ligne, elle pourrait parcourir les Champs-Élysées.",
      "Et elle continuera de grandir.",
      "*Nous croyons à un déploiement responsable et progressif de l'intelligence artificielle dans le débat public.* De ce fait, Perlimpinpin répond à une problématique démocratique et n'est pas une boîte noire figée : notre méthode s'affine au contact du réel, mesure après mesure, sous le contrôle direct de nos utilisateurs. En exposant nos sources, en publiant notre méthode, nos biais potentiels et nos limites, nous permettons à la société civile d'apprendre à utiliser ces nouveaux outils pour renforcer le débat démocratique plutôt que pour le subir.",
    ],
  },
];

const methodologyParagraphs = [
  "Une méthode de notation secrète ne vaut rien. La nôtre est publique, accessible à tous, et chaque score renvoie aux éléments documentaires qui ont alimenté l'analyse.",
  "Elle repose sur cinq critères pondérés permettant notamment d'examiner la faisabilité (juridique, budgétaire et en termes de moyens humains), l'efficacité, les risques potentiels, la maturité et la cohérence de la proposition.",
  "Pour limiter les raisonnements trop rapides ou les biais d'un modèle unique, notre protocole sépare volontairement l'instruction initiale, la contradiction et la synthèse finale, avant une relecture humaine.",
  "*A cette fin, et pour améliorer nos contenus au fur et à mesure, plusieurs versions suivront dans les prochains mois afin d'aboutir à des analyses de plus en plus approfondies.* Il s'agit pour l'instant de la V1 de Perlimpinpin, nom de code \"Tagadaaa\".",
];

const governanceParagraphs = [
  "Perlimpinpin a par ailleurs fait le choix d'un statut associatif strict, loi 1901. Nous ne dépendons d'aucun parti, ne vendons pas d'espace publicitaire et ne recherchons pas la rentabilité. Une campagne de financement participatif doit nous permettre de couvrir notamment les coûts de développement, d'infrastructure et de calcul liés au fonctionnement de la plateforme.",
  "*Ce choix garantit que nos algorithmes et nos évaluations restent alignés avec une seule et unique priorité : l'intérêt général.*",
];

const closingSection = {
  title: "Le 10 septembre 2026 est un commencement",
  paragraphs: [
    "*La plateforme ouvre ses portes en septembre 2026, à quelques mois des grandes échéances politiques.* Chaque nouvelle mesure analysée viendra enrichir notre base publique de connaissances, avec ses sources, son score et ses limites méthodologiques.",
    "*Nous ne prétendons pas nous substituer au débat politique ou au choix des électeurs.* Nous voulons lui redonner un socle de faits vérifiables sur lequel construire des décisions plus éclairées.",
    "*Notre ambition ne s'arrête pas à notre propre plateforme.* Nous considérerons une partie de notre mission accomplie si nos travaux, nos données et notre méthodologie permettent demain à des journalistes, des chercheurs, des associations ou de simples citoyens d'élever leur niveau d'exigence face aux promesses politiques.",
    "*Nous ne cherchons pas à détenir le monopole du fait, mais à contribuer à construire l'infrastructure méthodologique et technologique dont la démocratie a aujourd'hui besoin.*",
  ],
};

export default function AProposPage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      {/* Bandeau plein cadre propre à cet édito (pas un template réutilisé
          par d'autres articles — /a-propos est une page dédiée) : bord à
          bord horizontalement, aucune bordure/coin arrondi/carte visible,
          contrairement à la première tentative. Les rubans diagonaux
          (indigo à gauche, corail à droite) sont dessinés en SVG plutôt
          qu'en radial-gradient CSS pour l'aspect "vagues qui se croisent"
          de la maquette — un radial-gradient ne peut produire que des
          taches, jamais des rubans obliques. Le fond se dilue vers le blanc
          en bas via mask-image (dégradé noir→transparent), jamais une
          simple coupure nette de couleur. */}
      <div className="relative w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-[300px] md:block"
          aria-hidden="true"
          style={{
            maskImage: "linear-gradient(to bottom, black, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
          }}
        >
          <svg
            viewBox="0 0 1600 320"
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <filter id="apropos-banner-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="28" />
              </filter>
            </defs>
            <g filter="url(#apropos-banner-blur)">
              <ellipse cx="260" cy="150" rx="430" ry="95" fill="#818cf8" opacity="0.55" transform="rotate(-18 260 150)" />
              <ellipse cx="410" cy="55" rx="380" ry="70" fill="#a5b4fc" opacity="0.45" transform="rotate(12 410 55)" />
              <ellipse cx="1340" cy="160" rx="430" ry="95" fill="#fb923c" opacity="0.5" transform="rotate(18 1340 160)" />
              <ellipse cx="1220" cy="60" rx="380" ry="70" fill="#fda4af" opacity="0.4" transform="rotate(-12 1220 60)" />
            </g>
          </svg>
        </div>

        <div className="relative mx-auto w-full max-w-3xl px-6 pb-4 pt-10 text-center sm:px-8 md:pt-20">
          {/* Calé à l'origine sur la maquette 440 (~90-100px de corps,
              comme HeroText/Thèmes), puis réduit de 30% à la demande
              explicite pour ce titre précis — les trois valeurs du clamp()
              sont donc chacune 70% de leur valeur mesurée sur la maquette,
              pas une nouvelle mesure. */}
          <h1 className="font-sans text-[clamp(1.575rem,0.77rem+3.64vw,4.2rem)] font-bold leading-tight tracking-tight text-zinc-900">
            Construire pour la démocratie
            <span className="text-indigo-400">.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
            Pourquoi Perlimpinpin existe
          </p>
        </div>
      </div>

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col items-center text-center">
            <div className="h-px w-10 bg-zinc-300" aria-hidden="true" />

            <p className="mt-6 text-sm font-medium text-zinc-500">
              Par{" "}
              <a
                href="https://www.linkedin.com/in/arno-fontaine-049a52100/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-blue-700"
              >
                Arno Fontaine
              </a>{" "}
              et{" "}
              <a
                href="https://www.linkedin.com/in/matisbrasca/?locale=fr"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-blue-700"
              >
                Matis Brasca
              </a>
            </p>

            <div className="mt-6 flex justify-center">
              <ShareButton />
            </div>
          </div>

          <hr className="mt-6 border-zinc-200" />

          <div className="mx-auto mt-10 mb-16 flex max-w-[68ch] flex-col gap-4">
            {introParagraphs.map((text) => (
              <Paragraph key={text.slice(0, 24)} text={text} />
            ))}

            {essaySections.map((section) => (
              <Section key={section.title} title={section.title}>
                {section.paragraphs.map((text) => (
                  <Paragraph key={text.slice(0, 24)} text={text} />
                ))}
              </Section>
            ))}

            <Section title="Une méthodologie 100 % ouverte et transparente">
              {methodologyParagraphs.map((text) => (
                <Paragraph key={text.slice(0, 24)} text={text} />
              ))}

              <p className="text-base leading-relaxed text-zinc-600">
                <strong className="font-bold text-zinc-900">
                  L&apos;intégralité de cette démarche est disponible sur
                  notre{" "}
                  <Link
                    href="/methode"
                    className="text-blue-600 transition-colors hover:text-blue-800"
                  >
                    page Méthodologie
                  </Link>
                  .
                </strong>
              </p>

              {governanceParagraphs.map((text) => (
                <Paragraph key={text.slice(0, 24)} text={text} />
              ))}
            </Section>

            <Section title={closingSection.title}>
              {closingSection.paragraphs.map((text) => (
                <Paragraph key={text.slice(0, 24)} text={text} />
              ))}
            </Section>
          </div>
        </article>
      </main>
    </div>
  );
}
