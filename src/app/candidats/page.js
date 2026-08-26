import Link from "next/link";
import Header from "@/components/Header";
import { getAllCandidats } from "@/lib/queries";
import { getScoreBadge } from "@/lib/score";

export const dynamic = "force-dynamic";

export default async function CandidatsPage() {
  const candidats = await getAllCandidats();

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
              // Candidats
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Les candidats
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-500">
              Découvrez les déclarations analysées et leur niveau moyen de
              solidité selon la méthode Perlimpinpin.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidats.map((candidat) => {
              const badge =
                candidat.scoreMoyen == null
                  ? null
                  : getScoreBadge(candidat.scoreMoyen);

              return (
                <Link
                  key={candidat.id}
                  href={`/candidats/${candidat.id}`}
                  className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={candidat.photoUrl || "/avatar-placeholder.svg"}
                      alt={candidat.nom}
                      className="h-14 w-14 shrink-0 rounded-lg object-cover object-top"
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
                          {candidat.scoreMoyen}
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
        </div>
      </main>
    </div>
  );
}
