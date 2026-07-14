import Link from "next/link";
import Header from "@/components/Header";

export const metadata = {
  title: "Thèmes — Perlimpinpin",
  description:
    "Les 11 grands thèmes d'analyse de Perlimpinpin pour la présidentielle 2027.",
};

const themes = [
  {
    slug: "logement",
    name: "Logement",
    description:
      "Construction, logement social, encadrement des loyers, rénovation énergétique, crédit immobilier.",
    sources: [
      "Fondation pour le Logement (Rapport sur le mal-logement)",
      "SDES — Compte du Logement",
      "INSEE (parc locatif social)",
      "Banque de France / HCSF",
    ],
  },
  {
    slug: "economie",
    name: "Perspectives économiques, pouvoir d'achat, inflation & fiscalité",
    description:
      "Budget de l'État, déficit public, pouvoir d'achat, TVA, fiscalité des entreprises.",
    sources: [
      "PLF (Assemblée nationale)",
      "Cour des comptes",
      "INSEE (notes de conjoncture, IPC)",
      "IPP",
      "OCDE (recettes publiques)",
      "Banque de France",
    ],
  },
  {
    slug: "ia-numerique",
    name: "IA & Numérique",
    description:
      "Régulation de l'IA, protection des données, cybersécurité, souveraineté numérique.",
    sources: ["AI Act européen", "CGE", "CNIL", "ANSSI", "SGPI", "CNPEN"],
  },
  {
    slug: "education",
    name: "Éducation nationale",
    description:
      "Niveau des élèves, effectifs enseignants, pénurie de professeurs, laïcité, public/privé.",
    sources: [
      "DEPP (L'état de l'école)",
      "PLF — Mission Enseignement scolaire",
      "OCDE (PISA)",
      "Cnesco",
    ],
  },
  {
    slug: "securite-justice",
    name: "Sécurité & Justice",
    description:
      "Délinquance, effectifs policiers, places de prison, indépendance de la justice, réponse pénale.",
    sources: [
      "SSMSI",
      "SDSE (Ministère de la Justice)",
      "DAP",
      "Sénat",
      "Conseil de l'Europe (CEPEJ)",
    ],
  },
  {
    slug: "sante",
    name: "Santé & Hôpital",
    description:
      "Fermeture de lits, déserts médicaux, financement de l'hôpital, urgences, reste à charge.",
    sources: [
      "DREES (panorama des établissements de santé)",
      "PLFSS",
      "CNOM (démographie médicale)",
    ],
  },
  {
    slug: "retraites",
    name: "Retraites",
    description:
      "Équilibre financier, âge de départ, pauvreté des retraités, comparaisons européennes.",
    sources: [
      "COR (rapport annuel)",
      "Cour des comptes",
      "PLFSS",
      "DREES",
      "OCDE (Pensions at a Glance)",
    ],
  },
  {
    slug: "emploi",
    name: "Emploi & Chômage",
    description:
      "Taux de chômage, précarité, allocations chômage, réforme du plein emploi.",
    sources: [
      "INSEE (Enquête Emploi)",
      "DARES (France Travail)",
      "Banque de France",
      "Unédic",
    ],
  },
  {
    slug: "energie-climat",
    name: "Énergie & Climat",
    description:
      "Mix énergétique, nucléaire vs renouvelables, objectifs climatiques, réseau électrique européen.",
    sources: [
      "RTE (Futurs énergétiques 2050)",
      "Haut Conseil pour le Climat",
      "SNBC 3",
      "CRE",
    ],
  },
  {
    slug: "alimentation-agriculture",
    name: "Alimentation & Agriculture",
    description:
      "Prix agricoles, souveraineté alimentaire, PAC, circuits courts.",
    sources: [
      "Agreste (Ministère de l'Agriculture)",
      "OFPM",
      "Chambres d'agriculture",
      "Agence Bio",
    ],
  },
  {
    slug: "immigration",
    name: "Immigration",
    description:
      "Démographie, immigration irrégulière, droit d'asile, OQTF, flux légaux.",
    sources: [
      "DGEF (Ministère de l'Intérieur)",
      "Cour des comptes",
      "OFPRA/CNDA",
      "INSEE",
      "DARES",
    ],
  },
];

export default function ThemesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto w-full max-w-[1280px]">
          <div className="mx-auto max-w-3xl">
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">
              Thèmes
            </span>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              Nos thèmes d&apos;analyse
            </h1>

            <p className="mt-6 text-base leading-relaxed text-zinc-600">
              Perlimpinpin structure ses analyses autour de 11 grands
              thèmes de la présidentielle 2027. Chaque thème s&apos;appuie
              sur des sources publiques de référence et des points de
              vigilance méthodologiques propres à son domaine.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {themes.map((theme) => (
              <Link
                key={theme.slug}
                href={`/themes/${theme.slug}`}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-blue-300 hover:bg-blue-50/30"
              >
                <h2 className="text-base font-bold text-zinc-900">
                  {theme.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {theme.description}
                </p>

                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Sources clés
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {theme.sources.map((source) => (
                    <span
                      key={source}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>

          <p className="mx-auto mt-12 mb-4 max-w-3xl text-sm leading-relaxed text-zinc-500">
            Chaque analyse publiée sur Perlimpinpin est rattachée à
            l&apos;un de ces thèmes, et mobilise en priorité les sources
            listées ci-dessus, complétées par une recherche ciblée si
            nécessaire.
          </p>
        </div>
      </main>
    </div>
  );
}
