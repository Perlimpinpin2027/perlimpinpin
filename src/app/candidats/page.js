import Link from "next/link";
import Header from "@/components/Header";
import MonoTag from "@/components/MonoTag";
import { getAllCandidats } from "@/lib/queries";
import { formatScore, getScoreBadge } from "@/lib/score";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Les candidats | Perlimpinpin",
  description:
    "Le niveau moyen de solidité des propositions de chaque candidat à la présidentielle 2027, selon la méthode Perlimpinpin.",
};

export default async function CandidatsPage() {
  const candidats = await getAllCandidats();

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div>
            <MonoTag>Candidats</MonoTag>
            {/* text-3xl/sm:text-4xl (30-36px) mesuré trop petit sur la
                maquette 456 : le "L" de "Les candidats" y fait ~41px de
                capitale pour un rendu ~1604px de large, soit un corps
                ~57px — plus petit que les gros titres héros (accueil, À
                propos, Thèmes) mais tout de même nettement au-dessus de
                sm:text-4xl. Paragraphe aussi élargi (text-sm → text-base),
                la maquette le montre à la même taille que le corps de texte
                courant du site, pas en petit texte secondaire. */}
            <h1 className="mt-2 text-[clamp(1.875rem,1.2rem+2.6vw,3.75rem)] font-extrabold tracking-tight text-zinc-900">
              Les candidats
            </h1>
            <p className="mt-2 max-w-xl text-base text-zinc-500">
              Découvrez les déclarations analysées et leur niveau moyen de
              solidité selon la méthode Perlimpinpin.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-3">
            {candidats.map((candidat) => {
              const badge =
                candidat.scoreMoyen == null
                  ? null
                  : getScoreBadge(candidat.scoreMoyen);

              return (
                <Link
                  key={candidat.id}
                  href={`/declarations?candidat=${encodeURIComponent(candidat.nom)}`}
                  className="flex flex-col gap-4 border-b border-zinc-200 pb-6 transition-opacity hover:opacity-70"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={candidat.photoUrl || "/avatar-placeholder.svg"}
                      alt={candidat.nom}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover object-top"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">
                        {candidat.nom}
                      </p>
                      <p className="text-xs text-zinc-400">{candidat.parti}</p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {candidat.declarationsPubliees} déclaration
                        {candidat.declarationsPubliees > 1 ? "s" : ""} analysée
                        {candidat.declarationsPubliees > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-end justify-between">
                    {badge ? (
                      <div>
                        <p className={`text-3xl font-extrabold tracking-tight ${badge.scoreClass}`}>
                          {formatScore(candidat.scoreMoyen)}
                          <span className="text-sm font-semibold text-zinc-400">
                            /100
                          </span>
                        </p>
                        <p className={`text-sm font-semibold ${badge.scoreClass}`}>
                          {badge.label}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-zinc-400">
                        Pas encore noté
                      </span>
                    )}
                    <span aria-hidden="true" className="shrink-0 text-zinc-400">
                      →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <p className="border-t border-zinc-200 pt-6 text-xs leading-relaxed text-zinc-400">
            Ce score est une moyenne arithmétique des mesures actuellement
            analysées par l&rsquo;outil. Il ne constitue ni un jugement sur la
            personne, ni un indice général de crédibilité politique, et
            évolue au fur et à mesure des analyses.
          </p>
        </div>
      </main>
    </div>
  );
}
