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

// Convertit un marquage minimal **gras** en JSX (même logique que
// renderRichText dans declarations/[id]/page.js) : les segments entre **
// indiqués explicitement par l'auteur sont mis en gras, le reste en texte
// normal.
function renderBold(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
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
  "**Une campagne électorale se déroule presque toujours selon le même scénario.** Un candidat avance un chiffre. Un autre le conteste. Un troisième change de sujet. Le citoyen, lui, reste avec des questions simples et jamais résolues : Qui a raison ? Comment juger les propositions énoncées ? Comment comprendre et évaluer la crédibilité des promesses électorales qui engagent notre avenir ?",
  "**Perlimpinpin est né de cette frustration.** Non pas pour dire aux Français pour qui voter, mais pour leur donner les moyens de juger par eux-mêmes de la faisabilité des propositions.",
];

const essaySections = [
  {
    title: "Des discours électoraux qui doivent être pris au sérieux",
    paragraphs: [
      "Aujourd'hui, les discours politiques regorgent d'approximations, d'appels à la peur et de ressorts émotionnels. Ils s'appuient très souvent sur une perception subjective de la réalité plutôt que sur des faits documentés ou sur un analyse fiable des enjeux. **Face à cette surenchère nous proposons de réinjecter de la méthode.**",
      "Perlimpinpin consiste à mesurer la faisabilité réelle d'une proposition politique. Non pas pour juger de l'intention du candidat, mais pour vérifier la distance qui sépare l'ambition de sa réalisation. Une mesure peut être sincère et rester juridiquement bloquée. Une autre peut sembler modeste tout en étant parfaitement ancrée dans le réel et répondant à des problématiques centrales. Le rôle de Perlimpinpin est de faire cette distinction, mesure par mesure, en toute indépendance. Nous pensons que la démocratie a aujourd'hui besoin d'un espace neutre où l'on peut vérifier la viabilité d'une annonce rapidement et simplement.",
    ],
  },
  {
    title: "Pour des politiques publiques réellement efficaces",
    paragraphs: [
      "On déplore trop souvent l'inefficacité de l'action publique après coup, lorsque les lois sont votées, que les budgets sont engagés et que les réformes ne produisent pas les effets escomptés. Ce diagnostic tardif entretient la résignation des citoyens, la défiance envers le politique, le sentiment que les promesses n'engagent que ceux qui les reçoivent.",
      "Nous sommes convaincus que l'évaluation des politiques publiques ne doit pas être une simple analyse réalisée en fin de mandat : **le contrôle de crédibilité doit intervenir en amont, au moment même où la promesse est formulée.** Il s'agit de comprendre finement et objectivement le déploiement des lois, anticiper les effets rebonds (quand une mesure produit des conséquences secondaires indésirables), prévenir les effets de bord (les impacts collatéraux sur d'autres secteurs) et chiffrer les externalités éventuelles. **Perlimpinpin plaide pour une rupture avec les postures binaires et simplistes auxquelles nous sommes malheureusement souvent habitués.**",
      "De ce fait, évaluer la faisabilité budgétaire, l'architecture juridique et la viabilité opérationnelle d'une annonce avant le vote, c'est choisir de se focaliser sur le concret plutôt que sur le slogan. Sans oublier l'importance de la vision politique, nous souhaitons offrir aux citoyens le pouvoir d'exiger des comptes dès la campagne et aux candidats la volonté de concevoir des programmes réellement applicables. Documenter cette réalité en s'appuyant exclusivement sur des sources publiques et vérifiables, c'est notre manière d'encourager un débat politique plus honnête et responsable.",
    ],
  },
  {
    title: "L'intelligence artificielle au service de l'intérêt général",
    paragraphs: [
      "Pour mener à bien ce travail titanesque, l'IA offre des perspectives inédites. Mais nous avançons en connaissance de cause : entre souveraineté numérique, souveraineté énergétique, dérives de la désinformation, **l'impact sociétal de ces technologies est immense.** A cette fin, nous nous sommes posé une question centrale : **comment pouvons-nous utiliser l'IA générative pour servir la démocratie plutôt que pour la fragiliser ?**",
      "Alors que les algorithmes des réseaux sociaux et les IA génératives utilisés sans contrôle ont tendance à enfermer chacun de nous dans des bulles de confirmation et informationnelles, nous avons fait le choix d'utiliser les agents conversationnels comme des outils de rigueur méthodologique. L'idée de Perlimpinpin est d'offrir un éclairage fiable, transparent, méthodique et profondément ancré dans une supervision humaine.",
      "**Nous croyons à un déploiement responsable et progressif de l'intelligence artificielle dans le débat public.** De ce fait, Perlimpinpin répond à une problématique démocratique et n'est pas une boîte noire figée : notre méthode s'affine au contact du réel, mesure après mesure, sous le contrôle direct de nos utilisateurs. En exposant nos sources, en publiant notre méthode, nos biais potentiels et nos limites, nous permettons à la société civile d'apprendre à utiliser ces nouveaux outils pour renforcer le débat démocratique plutôt que pour le subir.",
    ],
  },
];

const methodologyIntro =
  "Une méthode de notation secrète ne vaut rien. La nôtre est entièrement publique, accessible à tous, et chaque score renvoie directement aux sources documentaires qui l'ont alimenté. Elle s'appuie sur cinq critères d'évaluation pondérés afin de refléter la complexité du réel, allant de la soutenabilité budgétaire, à l'efficacité attendue, en passant par la faisabilité juridique ou opérationnelle.";

const governanceParagraph =
  "Perlimpinpin a fait le choix d'un statut associatif strict, loi 1901. Notre gouvernance est conçue pour protéger notre charte d'analyse : nous ne dépendons d'aucun parti, ne vendons pas d'espace publicitaire et ne recherchons pas la rentabilité. Nous organisons une campagne de financement participatif afin de permettre de couvrir nos coûts actuels et à venir. **Ce choix garantit que nos algorithmes et nos évaluations restent alignés avec une seule et unique priorité : l'intérêt général.**";

const closingSection = {
  title: "Le 1er septembre est un commencement",
  paragraphs: [
    "**La plateforme ouvre ses portes à quelques mois des grandes échéances politiques.** D'ici là, chaque mesure analysée s'ajoutera à notre base de connaissances publique, avec ses sources, son score et ses limites méthodologiques assumées.",
    "**Nous ne prétendons pas nous substituer au débat politique ou au choix des électeurs.** Nous cherchons simplement à redonner à la démocratie un socle de faits vérifiables sur lequel construire des décisions éclairées.",
    "**Notre ambition ne s'arrête pas à notre propre plateforme.** Nous considérerons la mission de Perlimpinpin accomplie si nos travaux, nos données et notre méthodologie permettent à des journalistes, des chercheurs, des associations ou de simples citoyens d'élever le niveau d'exigence du débat politique.",
    "**Nous ne cherchons pas à détenir le monopole du fait, mais à développer l'infrastructure méthodologique dont la démocratie a aujourd'hui besoin.**",
  ],
};

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

            <h1 className="mt-4 font-sans text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              {/* Petit trait décoratif (swoosh) au-dessus du C, cohérent
                  avec le point bleu/indigo qui clôt le titre. */}
              <span className="relative inline-block">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="absolute -top-3 left-0.5 h-3 w-6 text-indigo-400"
                  aria-hidden="true"
                >
                  <path d="M2 10C7 4 15 2 22 2" />
                </svg>
                C
              </span>
              onstruire pour la démocratie
              <span className="text-indigo-400">.</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
              Pourquoi Perlimpinpin existe
            </p>

            <div className="mt-6 h-px w-10 bg-zinc-300" aria-hidden="true" />

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
              et Matis Brasca
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
              <Paragraph text={methodologyIntro} />

              <p className="text-base leading-relaxed text-zinc-600">
                Pour garantir une rigueur absolue, chaque analyse est soumise
                à un protocole strict qui associe trois niveaux
                d&apos;intelligence artificielle et une repasse humaine
                systématique. Ce processus découple délibérément le temps de
                l&apos;instruction initiale, celui du débat contradictoire et
                celui de la synthèse finale.{" "}
                <strong className="font-bold text-zinc-900">
                  L&apos;intégralité de cette démarche est présente sur notre{" "}
                  <Link
                    href="/methode"
                    className="text-blue-600 transition-colors hover:text-blue-800"
                  >
                    page Méthodologie
                  </Link>
                  .
                </strong>
              </p>

              <Paragraph text={governanceParagraph} />
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
