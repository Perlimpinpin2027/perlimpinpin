import Link from "next/link";
import Header from "@/components/Header";
import AvancementDossier from "@/components/AvancementDossier";
import TitreAvecItalique from "@/components/TitreAvecItalique";
import { avancementHorsSerie, getHorsSeries, texteAvancement } from "@/lib/hors-series";

// Liste des dossiers (hors-séries) : un plan d'ensemble d'un candidat,
// analysé poste par poste dans plusieurs fiches notées. Page statique : le
// contenu vient des JSON de data/hors-series/ (src/lib/hors-series.js).
export const metadata = {
  title: "Dossiers | Perlimpinpin",
  description:
    "Les hors-séries de Perlimpinpin : les plans d'ensemble des candidats, analysés poste par poste.",
};

export default function DossiersPage() {
  const dossiers = getHorsSeries();

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10">
          <div className="flex max-w-3xl flex-col gap-5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
              {"// Dossiers"}
            </span>
            <h1 className="text-4xl font-extrabold leading-[1.04] tracking-[-0.035em] text-zinc-950 sm:text-5xl">
              Les <span className="mr-[0.15em] italic text-zinc-400">hors-séries</span> Perlimpinpin
            </h1>
            <p className="text-lg leading-relaxed text-slate-500 sm:text-xl">
              Quand un candidat présente un plan d&apos;ensemble, nous l&apos;analysons poste par poste : une
              fiche notée sur 100 pour chaque grande mesure, puis une note globale pour le plan.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {dossiers.map((dossier) => {
              const avancement = avancementHorsSerie(dossier);
              return (
                <Link
                  key={dossier.slug}
                  href={`/hors-serie/${dossier.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-30px_rgba(30,41,82,0.35)] ring-2 ring-pink-200 transition-shadow hover:ring-pink-300 sm:flex-row"
                >
                  <div className="relative aspect-[4/5] w-full shrink-0 bg-pink-50 sm:aspect-auto sm:w-2/5">
                    {dossier.photo?.src ? (
                      <img
                        src={dossier.photo.src}
                        alt={dossier.photo.alt ?? dossier.candidat.nom}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    ) : null}
                    <span className="absolute left-4 top-4 rounded-full bg-pink-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
                      Hors-série n°{dossier.numero}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-6 sm:p-8">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">
                      {`// ${dossier.etiquette}`}
                    </span>
                    <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-zinc-950 sm:text-[1.7rem]">
                      <TitreAvecItalique titre={dossier.titre} motItalique={dossier.motItalique} />
                    </h2>
                    <p className="text-base leading-snug text-slate-500">
                      {dossier.accueil?.accroche ?? dossier.description}
                    </p>
                    <AvancementDossier
                      avancement={avancement}
                      texte={texteAvancement(avancement)}
                      className="mt-auto border-t border-zinc-200 pt-4"
                    />
                    <span className="mt-1 text-sm font-semibold text-pink-700 group-hover:underline">
                      Lire le dossier <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
