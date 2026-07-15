import Link from "next/link";
import Header from "@/components/Header";
import { getAllCandidats } from "@/lib/queries";
import { getScoreBadge } from "@/lib/score";

export const dynamic = "force-dynamic";

const badgeStyles = {
  green: "bg-green-50 text-green-700",
  orange: "bg-orange-50 text-orange-700",
  red: "bg-red-50 text-red-700",
};

const scoreTextStyles = {
  green: "text-green-600",
  orange: "text-orange-600",
  red: "text-red-600",
};

export default async function CandidatsPage() {
  const candidats = await getAllCandidats();

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">
              Présidentielle 2027
            </span>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
              Les candidats
            </h1>
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
                      className="h-14 w-14 shrink-0 rounded-full object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900">
                        {candidat.nom}
                      </p>
                      <p className="text-xs text-zinc-400">{candidat.parti}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">
                      {candidat.declarationsPubliees} déclaration
                      {candidat.declarationsPubliees > 1 ? "s" : ""} analysée
                      {candidat.declarationsPubliees > 1 ? "s" : ""}
                    </p>
                    {badge ? (
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`text-sm font-bold ${scoreTextStyles[badge.color]}`}
                        >
                          {candidat.scoreMoyen}
                          <span className="text-xs font-medium text-zinc-400">
                            /100
                          </span>
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeStyles[badge.color]}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-zinc-400">
                        Pas encore noté
                      </span>
                    )}
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
