import Header from "@/components/Header";
import ShareButton from "@/components/ShareButton";

export const metadata = {
  title: "À propos — Perlimpinpin",
  description: "Qui est derrière Perlimpinpin et pourquoi ce projet existe.",
};

// Callout éditorial (bordure gauche accent + sous-titre en gras) : prêt à
// l'emploi pour les deux blocs du corps de page ("Une promesse n'est pas
// qu'une intention", "Distinguer le droit du rapport de force") dès que
// leur texte définitif sera fourni — voir TODO plus bas.
function Callout({ title, children }) {
  return (
    <div className="border-l-4 border-red-500 pl-5">
      <p className="font-bold text-zinc-900">{title}</p>
      <div className="mt-2 flex flex-col gap-3 text-base leading-relaxed text-zinc-600">
        {children}
      </div>
    </div>
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
                  d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                />
              </svg>
              Notre projet
            </span>

            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              Pourquoi Perlimpinpin existe
              <span className="text-red-600">.</span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
              Donner aux citoyens les moyens de juger une promesse avant de
              voter.
            </p>
          </div>

          <hr className="mt-8 border-zinc-200" />

          <p className="mt-4 text-center text-sm font-medium text-zinc-500">
            Par Arno Fontaine et Matis Brasca
          </p>

          <div className="mt-3 flex justify-end">
            <ShareButton />
          </div>

          {/* Corps de page : texte définitif à venir (voir Callout
              ci-dessus, prêt pour les deux blocs "Une promesse n'est pas
              qu'une intention" / "Distinguer le droit du rapport de force").
              Paragraphes actuels conservés en attendant, largeur de colonne
              déjà resserrée pour le confort de lecture. */}
          <div className="mx-auto mt-10 flex max-w-[68ch] flex-col gap-4">
            <p className="text-base leading-relaxed text-zinc-600">
              Perlimpinpin est un projet indépendant qui évalue la faisabilité
              et la rigueur factuelle des promesses des candidats à l&apos;élection
              présidentielle 2027. Chaque déclaration est analysée avec l&apos;aide
              de l&apos;intelligence artificielle, à partir de sources publiques
              (INSEE, Cour des comptes, Légifrance, rapports parlementaires...),
              puis relue par des humains avant publication.
            </p>

            <p className="text-base leading-relaxed text-zinc-600">
              Notre objectif n&apos;est pas de dire pour qui voter, mais de
              donner à chacun les moyens de juger sur pièces : est-ce que cette
              mesure est chiffrée, juridiquement solide, budgétairement
              soutenable ?
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
