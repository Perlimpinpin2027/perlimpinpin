import Link from "next/link";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";

export const metadata = {
  title: "À propos — Perlimpinpin",
  description: "Qui est derrière Perlimpinpin et pourquoi ce projet existe.",
};

// Chaque section de l'essai : séparateur fin au-dessus pour la distinguer
// du paragraphe précédent, puis titre + paragraphes dans un bloc à bordure
// gauche rouge (style callout) pour marquer visuellement le changement de
// sous-partie.
function Section({ title, children }) {
  return (
    <div className="pt-6">
      <hr className="border-zinc-200" />
      <div className="mt-6 flex flex-col gap-4 border-l-4 border-red-500 pl-5">
        <h2 className="text-xl font-bold text-zinc-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

// Met en gras la première phrase (jusqu'au premier point) d'un paragraphe,
// le reste en texte normal — appliqué uniformément à tous les paragraphes
// de l'essai, à la demande.
function LeadParagraph({ text }) {
  const match = text.match(/^(.*?\.)(\s|$)/);
  if (!match) {
    return <p className="text-base leading-relaxed text-zinc-600">{text}</p>;
  }
  const lead = match[1];
  const rest = text.slice(lead.length);
  return (
    <p className="text-base leading-relaxed text-zinc-600">
      <strong className="font-bold text-zinc-900">{lead}</strong>
      {rest}
    </p>
  );
}

const introParagraphs = [
  "Une campagne électorale se déroule presque toujours selon le même scénario. Un candidat avance un chiffre. Un autre le conteste. Un troisième change de sujet. Le citoyen, lui, reste avec des questions simples et jamais résolues : Qui a raison ? Comment juger les propositions énoncées ? Comment comprendre et évaluer la crédibilité des promesses électorales qui engagent notre avenir ?",
  "Perlimpinpin est né de cette frustration. Non pas pour dire aux Français pour qui voter, mais pour leur donner les moyens de juger par eux-mêmes de la faisabilité des propositions.",
];

const essaySections = [
  {
    title: "Des discours électoraux qui doivent être pris au sérieux",
    paragraphs: [
      "Aujourd'hui, les discours politiques regorgent d'approximations, d'appels à la peur et de ressorts émotionnels. Ils s'appuient très souvent sur une perception subjective de la réalité plutôt que sur des faits documentés ou sur un analyse fiable des enjeux. Face à cette surenchère nous proposons de réinjecter de la méthode.",
      "Perlimpinpin consiste à mesurer la faisabilité réelle d'une proposition politique. Pas pour juger de l'intention du candidat, mais pour vérifier la distance qui sépare l'ambition de sa réalisation. Une mesure peut être sincère et rester juridiquement incalculable. Une autre peut sembler modeste tout en étant parfaitement ancrée dans le réel. Le rôle de Perlimpinpin est de faire cette distinction, mesure par mesure, en toute indépendance. Nous pensons que la démocratie a aujourd'hui besoin d'un espace neutre où l'on peut vérifier la viabilité d'une annonce rapidement et simplement.",
    ],
  },
  {
    title: "Pour des politiques publiques réellement efficaces",
    paragraphs: [
      "On déplore trop souvent l'inefficacité de l'action publique après coup, lorsque les lois sont votées, que les budgets sont engagés et que les réformes ne produisent pas les effets escomptés. Ce diagnostic tardif entretient la résignation citoyenne, la défiance envers le politique, le sentiment que les promesses n'engagent que ceux qui les reçoivent.",
      "Nous sommes convaincus que l'évaluation des politiques publiques ne doit pas être un simple autopsie réalisée en fin de mandat : le contrôle de crédibilité doit intervenir en amont, au moment même où la promesse est formulée. Il s'agit de comprendre finement et objectivement le déploiement des lois, anticiper les effets rebonds (quand une mesure produit des conséquences secondaires indésirables), prévenir les effets de bord (les impacts collatéraux sur d'autres secteurs) et chiffrer les externalités éventuelles. Perlimpinpin plaide pour une rupture avec les postures binaires et simplistes auxquelles nous sommes malheureusement souvent habitués.",
      "De ce fait, évaluer la faisabilité budgétaire, l'architecture juridique et la viabilité opérationnelle d'une annonce avant le vote, c'est passer d'une démocratie du slogan à une démocratie d'impact. En éclairant la faisabilité d'une mesure avant qu'elle ne devienne une promesse électorale ferme, nous offrons aux citoyens le pouvoir d'exiger des comptes dès la campagne, et aux gouvernants la possibilité de concevoir des réformes réellement applicables. Documenter cette réalité en s'appuyant exclusivement sur des sources publiques et vérifiables, c'est notre manière d'encourager un débat politique plus honnête et responsable.",
    ],
  },
  {
    title: "L'intelligence artificielle au service de l'intérêt général",
    paragraphs: [
      "Pour mener à bien ce travail titanesque, l'IA offre des perspectives inédites. Mais nous avançons en connaissance de cause : entre souveraineté numérique, souveraineté énergétique, dérives de la désinformation, l'impact sociétal de ces technologies est immense. A cette fin, nous nous sommes posé une question centrale : comment utiliser l'IA générative pour servir la démocratie plutôt que pour la fragiliser ?",
      "Alors que les algorithmes des réseaux sociaux et les IA génératives utilisés sans contrôle de qualité ont tendance à enfermer chacun de nous dans des bulles de confirmation et informationnelles, nous avons fait le choix d'utiliser les agents conversationnels comme des outils de rigueur métrologique. L'idée de Perlimpinpin est d'offrir un éclairage fiable, transparent, méthodique et profondément ancré dans une supervision humaine.",
      "Nous croyons à un déploiement responsable et progressif de l'intelligence artificielle dans le débat public. Perlimpinpin n'est pas une boîte noire figée : notre méthode s'affine au contact du réel, mesure après mesure, sous le contrôle direct de nos utilisateurs. En exposant nos sources, en publiant notre méthode, nos biais potentiels et nos limites, nous permettons à la société civile d'apprendre à utiliser ces nouveaux outils pour renforcer le débat démocratique plutôt que pour le subir.",
    ],
  },
];

const methodologyIntro =
  "Une méthode de notation secrète ne vaut rien. La nôtre est entièrement publique, accessible à tous, et chaque score renvoie directement aux sources documentaires qui l'ont alimenté. Elle s'appuie sur cinq critères d'évaluation pondérés afin de refléter la complexité du réel, allant de la soutenabilité budgétaire, à l'efficacité attendue, en passant par la faisabilité juridique ou opérationnelle.";

const governanceParagraph =
  "De la même manière que certains grands modèles technologiques imposent des structures de gouvernance garantissant leur indépendance, Perlimpinpin a fait le choix d'un statut associatif strict (loi 1901). Notre gouvernance est conçue pour protéger notre charte d'analyse : nous ne dépendons d'aucun parti, ne vendons aucun espace publicitaire et ne recherchons pas la rentabilité. Ce choix garantit que nos algorithmes et nos évaluations restent alignés avec une seule et unique priorité : l'intérêt général.";

const closingSection = {
  title: "Le 1er septembre est un commencement",
  paragraphs: [
    "La plateforme ouvre ses portes à quelques mois des grandes échéances politiques. D'ici là, chaque mesure analysée s'ajoutera à notre base de connaissances publique, avec ses sources, son score et ses limites méthodologiques assumées.",
    "Nous ne prétendons pas nous substituer au débat politique ou au choix moral des électeurs. Nous cherchons simplement à redonner à la démocratie un socle de faits vérifiables sur lequel construire des décisions éclairées.",
    "Notre ambition ne s'arrête pas à notre propre plateforme. Nous considérerons la mission de Perlimpinpin accomplie si nos travaux, nos données et notre méthodologie permettent à des journalistes, des chercheurs, des associations ou de simples citoyens d'élever le niveau d'exigence du débat politique. Nous ne cherchons pas à détenir le monopole du fait, mais à fournir l'infrastructure méthodologique dont la démocratie a besoin.",
  ],
};

const founders = [
  {
    nom: "Matis Brasca",
    role: "Responsable associatif",
  },
  {
    nom: "Arno Fontaine",
    role: "Conseiller en économie comportementale",
    linkedin: "https://www.linkedin.com/in/arno-fontaine-049a52100/",
  },
];

export default function AProposPage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto w-full max-w-3xl">
          {/* Bandeau en tête de page */}
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-red-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="h-3.5 w-3.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 21h18M4.5 21V9.75m3.75 11.25V9.75m3.75 11.25V9.75m3.75 11.25V9.75M2.25 9.75 12 3.75l9.75 6"
                />
              </svg>
              Démocratie
            </span>

            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              Construire pour la démocratie
              <span className="text-red-600">.</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
              Pourquoi Perlimpinpin existe
            </p>

            <div className="mt-6 h-px w-10 bg-zinc-300" aria-hidden="true" />

            <p className="mt-6 text-sm font-medium text-zinc-500">
              Par Arno Fontaine et Matis Brasca
            </p>
          </div>

          <hr className="mt-6 border-zinc-200" />

          <div className="mt-4 flex justify-end">
            <ShareButton />
          </div>

          <div className="mx-auto mt-10 flex max-w-[68ch] flex-col gap-4">
            {introParagraphs.map((text) => (
              <LeadParagraph key={text.slice(0, 24)} text={text} />
            ))}

            {essaySections.map((section) => (
              <Section key={section.title} title={section.title}>
                {section.paragraphs.map((text) => (
                  <LeadParagraph key={text.slice(0, 24)} text={text} />
                ))}
              </Section>
            ))}

            <Section title="Une méthodologie 100 % ouverte et transparente">
              <LeadParagraph text={methodologyIntro} />

              <p className="text-base leading-relaxed text-zinc-600">
                <strong className="font-bold text-zinc-900">
                  Pour garantir une rigueur absolue, chaque analyse est
                  soumise à un protocole strict qui associe trois niveaux
                  d&apos;intelligence artificielle et une repasse humaine
                  systématique.
                </strong>{" "}
                Ce processus découple délibérément le temps de
                l&apos;instruction initiale, celui du débat contradictoire et
                celui de la synthèse finale. Nous avons fait le choix
                d&apos;exposer l&apos;intégralité de cette démarche :
                découvrez l&apos;ensemble de nos critères et notre grille de
                calcul sur notre{" "}
                <Link
                  href="/methode"
                  className="font-semibold text-blue-600 transition-colors hover:text-blue-800"
                >
                  page Méthodologie
                </Link>
                .
              </p>

              <LeadParagraph text={governanceParagraph} />
            </Section>

            <Section title={closingSection.title}>
              {closingSection.paragraphs.map((text) => (
                <LeadParagraph key={text.slice(0, 24)} text={text} />
              ))}
            </Section>
          </div>

          <h2 className="mt-16 text-2xl font-bold text-zinc-900">
            Fondateurs
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {founders.map((founder) => (
              <div
                key={founder.nom}
                className="rounded-xl border border-zinc-200 bg-white/60 p-5"
              >
                {founder.linkedin ? (
                  <a
                    href={founder.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-lg font-bold text-zinc-900 transition-colors hover:text-blue-700"
                  >
                    {founder.nom}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="h-3.5 w-3.5 opacity-60"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                ) : (
                  <p className="text-lg font-bold text-zinc-900">
                    {founder.nom}
                  </p>
                )}
                <p className="mt-1 text-sm text-zinc-500">{founder.role}</p>
              </div>
            ))}
          </div>

          <p className="mt-16 text-xs text-zinc-400">
            Perlimpinpin est porté par une association loi 1901.
          </p>
        </article>
      </main>
    </div>
  );
}
