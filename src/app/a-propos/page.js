import Header from "@/components/Header";

export const metadata = {
  title: "À propos — Perlimpinpin",
  description: "Qui est derrière Perlimpinpin et pourquoi ce projet existe.",
};

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
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto w-full max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-widest text-red-600">
            Présidentielle 2027
          </span>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
            À propos
          </h1>

          <p className="mt-6 text-base leading-relaxed text-zinc-600">
            Perlimpinpin est un projet indépendant qui évalue la faisabilité
            et la rigueur factuelle des promesses des candidats à l&apos;élection
            présidentielle 2027. Chaque déclaration est analysée avec l&apos;aide
            de l&apos;intelligence artificielle, à partir de sources publiques
            (INSEE, Cour des comptes, Légifrance, rapports parlementaires...),
            puis relue par des humains avant publication.
          </p>

          <p className="mt-4 text-base leading-relaxed text-zinc-600">
            Notre objectif n&apos;est pas de dire pour qui voter, mais de
            donner à chacun les moyens de juger sur pièces : est-ce que cette
            mesure est chiffrée, juridiquement solide, budgétairement
            soutenable ?
          </p>

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
