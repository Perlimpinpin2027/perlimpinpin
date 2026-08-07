import Link from "next/link";
import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";

export const metadata = {
  title: "À propos — Perlimpinpin",
  description: "Qui est derrière Perlimpinpin et pourquoi ce projet existe.",
};

function SectionTitle({ children }) {
  return (
    <h2 className="mt-2 text-xl font-bold text-zinc-900">{children}</h2>
  );
}

const founders = [
  {
    nom: "Matis Brasca",
    role: "Responsable associatif",
    bio: "Biographie à venir.",
  },
  {
    nom: "Arno Fontaine",
    role: "Conseiller en économie comportementale",
    bio: "Diplômé en économie et sciences politiques (Paris II Panthéon-Assas, Sciences Po Grenoble), Arno est conseiller en économie comportementale. Il a travaillé au sein du département de gouvernance publique de l'OCDE sur l'impact de l'intelligence artificielle sur le cerveau humain et les processus décisionnels et a auparavant développé un programme de sciences comportementales appliqué aux opérations de développement au sein de l'Agence française de développement.\n\nIl s'intéresse particulièrement à la manière dont se forment nos systèmes de croyance et notre rapport à l'information, grâce aux apports de la psychologie sociale. C'est cette conviction qui l'a poussé à cofonder Perlimpinpin : donner au public des repères factuels clairs face aux promesses politiques.",
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
          </div>

          <hr className="mt-8 border-zinc-200" />

          <p className="mt-4 text-center text-sm font-medium text-zinc-500">
            Par Arno Fontaine et Matis Brasca
          </p>

          <div className="mt-3 flex justify-end">
            <ShareButton />
          </div>

          <div className="mx-auto mt-10 flex max-w-[68ch] flex-col gap-4">
            <p className="text-base leading-relaxed text-zinc-600">
              Une campagne électorale se déroule presque toujours selon le
              même scénario. Un candidat avance un chiffre. Un autre le
              conteste. Un troisième change de sujet. Le citoyen, lui, reste
              avec des questions simples et jamais résolues : Qui a raison ?
              Comment juger les propositions énoncées ? Comment comprendre et
              évaluer la crédibilité des promesses électorales qui engagent
              notre avenir ?
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              <strong className="font-bold text-zinc-900">
                Perlimpinpin est né de cette frustration.
              </strong>{" "}
              Non pas pour dire aux Français pour qui voter, mais pour leur
              donner les moyens de juger par eux-mêmes de la faisabilité des
              propositions.
            </p>

            <SectionTitle>
              Des discours électoraux qui doivent être pris au sérieux
            </SectionTitle>

            <p className="text-base leading-relaxed text-zinc-600">
              Aujourd&apos;hui, les discours politiques regorgent
              d&apos;approximations, d&apos;appels à la peur et de ressorts
              émotionnels. Ils s&apos;appuient très souvent sur une perception
              subjective de la réalité plutôt que sur des faits documentés ou
              sur un analyse fiable des enjeux. Face à cette surenchère nous
              proposons de réinjecter de la méthode.
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              Perlimpinpin consiste à mesurer la faisabilité réelle
              d&apos;une proposition politique. Pas pour juger de
              l&apos;intention du candidat, mais pour vérifier la distance qui
              sépare l&apos;ambition de sa réalisation. Une mesure peut être
              sincère et rester juridiquement incalculable. Une autre peut
              sembler modeste tout en étant parfaitement ancrée dans le réel.
              Le rôle de Perlimpinpin est de faire cette distinction, mesure
              par mesure, en toute indépendance. Nous pensons que la
              démocratie a aujourd&apos;hui besoin d&apos;un espace neutre où
              l&apos;on peut vérifier la viabilité d&apos;une annonce
              rapidement et simplement.
            </p>

            <SectionTitle>
              Pour des politiques publiques réellement efficaces
            </SectionTitle>

            <p className="text-base leading-relaxed text-zinc-600">
              On déplore trop souvent l&apos;inefficacité de l&apos;action
              publique après coup, lorsque les lois sont votées, que les
              budgets sont engagés et que les réformes ne produisent pas les
              effets escomptés. Ce diagnostic tardif entretient la
              résignation citoyenne, la défiance envers le politique, le
              sentiment que les promesses n&apos;engagent que ceux qui les
              reçoivent.
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              Nous sommes convaincus que l&apos;évaluation des politiques
              publiques ne doit pas être un simple autopsie réalisée en fin
              de mandat : le contrôle de crédibilité doit intervenir en
              amont, au moment même où la promesse est formulée. Il
              s&apos;agit de comprendre finement et objectivement le
              déploiement des lois, anticiper les effets rebonds (quand une
              mesure produit des conséquences secondaires indésirables),
              prévenir les effets de bord (les impacts collatéraux sur
              d&apos;autres secteurs) et chiffrer les externalités
              éventuelles. Perlimpinpin plaide pour une rupture avec les
              postures binaires et simplistes auxquelles nous sommes
              malheureusement souvent habitués.
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              De ce fait, évaluer la faisabilité budgétaire, l&apos;architecture
              juridique et la viabilité opérationnelle d&apos;une annonce
              avant le vote, c&apos;est passer d&apos;une démocratie du
              slogan à une démocratie d&apos;impact. En éclairant la
              faisabilité d&apos;une mesure avant qu&apos;elle ne devienne une
              promesse électorale ferme, nous offrons aux citoyens le pouvoir
              d&apos;exiger des comptes dès la campagne, et aux gouvernants la
              possibilité de concevoir des réformes réellement applicables.
              Documenter cette réalité en s&apos;appuyant exclusivement sur
              des sources publiques et vérifiables, c&apos;est notre manière
              d&apos;encourager un débat politique plus honnête et
              responsable.
            </p>

            <SectionTitle>
              L&apos;intelligence artificielle au service de l&apos;intérêt
              général
            </SectionTitle>

            <p className="text-base leading-relaxed text-zinc-600">
              Pour mener à bien ce travail titanesque, l&apos;IA offre des
              perspectives inédites. Mais nous avançons en connaissance de
              cause : entre souveraineté numérique, souveraineté
              énergétique, dérives de la désinformation, l&apos;impact
              sociétal de ces technologies est immense. A cette fin, nous
              nous sommes posé une question centrale : comment utiliser
              l&apos;IA générative pour servir la démocratie plutôt que pour
              la fragiliser ?
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              Alors que les algorithmes des réseaux sociaux et les IA
              génératives utilisés sans contrôle de qualité ont tendance à
              enfermer chacun de nous dans des bulles de confirmation et
              informationnelles, nous avons fait le choix d&apos;utiliser les
              agents conversationnels comme des outils de rigueur
              métrologique. L&apos;idée de Perlimpinpin est d&apos;offrir un
              éclairage fiable, transparent, méthodique et profondément
              ancré dans une supervision humaine.
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              Nous croyons à un déploiement responsable et progressif de
              l&apos;intelligence artificielle dans le débat public.
              Perlimpinpin n&apos;est pas une boîte noire figée : notre
              méthode s&apos;affine au contact du réel, mesure après mesure,
              sous le contrôle direct de nos utilisateurs. En exposant nos
              sources, en publiant notre méthode, nos biais potentiels et nos
              limites, nous permettons à la société civile d&apos;apprendre
              à utiliser ces nouveaux outils pour renforcer le débat
              démocratique plutôt que pour le subir.
            </p>

            <SectionTitle>
              Une méthodologie 100 % ouverte et transparente
            </SectionTitle>

            <p className="text-base leading-relaxed text-zinc-600">
              Une méthode de notation secrète ne vaut rien. La nôtre est
              entièrement publique, accessible à tous, et chaque score
              renvoie directement aux sources documentaires qui l&apos;ont
              alimenté. Elle s&apos;appuie sur cinq critères d&apos;évaluation
              pondérés afin de refléter la complexité du réel, allant de la
              soutenabilité budgétaire, à l&apos;efficacité attendue, en
              passant par la faisabilité juridique ou opérationnelle.
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              Pour garantir une rigueur absolue, chaque analyse est soumise à
              un protocole strict qui associe trois niveaux
              d&apos;intelligence artificielle et une repasse humaine
              systématique. Ce processus découple délibérément le temps de
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

            <p className="text-base leading-relaxed text-zinc-600">
              De la même manière que certains grands modèles technologiques
              imposent des structures de gouvernance garantissant leur
              indépendance, Perlimpinpin a fait le choix d&apos;un statut
              associatif strict (loi 1901). Notre gouvernance est conçue pour
              protéger notre charte d&apos;analyse : nous ne dépendons
              d&apos;aucun parti, ne vendons aucun espace publicitaire et ne
              recherchons pas la rentabilité. Ce choix garantit que nos
              algorithmes et nos évaluations restent alignés avec une seule
              et unique priorité : l&apos;intérêt général.
            </p>

            <SectionTitle>Le 1er septembre est un commencement</SectionTitle>

            <p className="text-base leading-relaxed text-zinc-600">
              La plateforme ouvre ses portes à quelques mois des grandes
              échéances politiques. D&apos;ici là, chaque mesure analysée
              s&apos;ajoutera à notre base de connaissances publique, avec
              ses sources, son score et ses limites méthodologiques
              assumées.
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              Nous ne prétendons pas nous substituer au débat politique ou au
              choix moral des électeurs. Nous cherchons simplement à
              redonner à la démocratie un socle de faits vérifiables sur
              lequel construire des décisions éclairées.
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              Notre ambition ne s&apos;arrête pas à notre propre plateforme.
              Nous considérerons la mission de Perlimpinpin accomplie si nos
              travaux, nos données et notre méthodologie permettent à des
              journalistes, des chercheurs, des associations ou de simples
              citoyens d&apos;élever le niveau d&apos;exigence du débat
              politique. Nous ne cherchons pas à détenir le monopole du fait,
              mais à fournir l&apos;infrastructure méthodologique dont la
              démocratie a besoin.
            </p>
          </div>

          <h2 className="mt-16 text-2xl font-bold text-zinc-900">
            Fondateurs
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-10 sm:grid-cols-2">
            {founders.map((founder) => (
              <div key={founder.nom} className="flex flex-col gap-4">
                <img
                  src="/avatar-placeholder.svg"
                  alt={founder.nom}
                  className="h-40 w-40 shrink-0 rounded-2xl object-cover"
                />

                <div>
                  <p className="text-lg font-bold text-zinc-900">
                    {founder.nom}
                  </p>
                  <p className="text-sm text-zinc-500">{founder.role}</p>
                </div>

                <div className="flex flex-col gap-3">
                  {founder.bio.split("\n\n").map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-sm leading-relaxed text-zinc-600"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
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
