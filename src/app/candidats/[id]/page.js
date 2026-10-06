import { notFound } from "next/navigation";
import Header from "@/components/Header";
import DeclarationCarte from "@/components/DeclarationCarte";
import { getCandidatAvecDeclarations } from "@/lib/queries";
import { getScoreBadge } from "@/lib/score";

// ISR : chaque page est calculée à sa première visite, puis servie depuis le
// cache du CDN et recalculée au plus toutes les 5 minutes. generateStaticParams
// renvoie [] : le build ne lit pas Neon, et dynamicParams = true laisse
// générer n'importe quelle adresse à la demande.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export default async function CandidatDetailPage({ params }) {
  const { id } = await params;
  const candidatId = Number(id);

  if (!Number.isInteger(candidatId)) {
    notFound();
  }

  // Candidat, score moyen et déclarations publiées, chargés en une fois côté
  // serveur : aucune requête supplémentaire au clic ou au défilement.
  const candidat = await getCandidatAvecDeclarations(candidatId);

  if (!candidat) {
    notFound();
  }

  const { declarations } = candidat;
  const badge =
    candidat.scoreMoyen == null ? null : getScoreBadge(candidat.scoreMoyen);

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <img
              src={candidat.photoUrl || "/avatar-placeholder.svg"}
              alt={candidat.nom}
              className="aspect-square w-full max-w-[300px] shrink-0 rounded-2xl object-cover object-top"
            />

            <div className="flex flex-col justify-center gap-3">
              <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-zinc-900">
                {candidat.nom}
              </h1>
              <p className="text-base text-zinc-500">{candidat.parti}</p>

              <div className="mt-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Score Perlimpinpin moyen
                </span>
                {badge ? (
                  <>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span
                        className={`text-5xl font-extrabold tracking-tight ${badge.scoreClass}`}
                      >
                        {candidat.scoreMoyen}
                      </span>
                      <span className="text-lg font-semibold text-zinc-400">
                        /100
                      </span>
                    </div>
                    <div
                      className={`mt-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.badgeClass}`}
                    >
                      {badge.label}
                    </div>
                    <p className="mt-2 text-sm text-zinc-500">
                      sur {declarations.length} proposition
                      {declarations.length > 1 ? "s" : ""} analysée
                      {declarations.length > 1 ? "s" : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-zinc-500">Analyse en cours</p>
                )}
              </div>
            </div>
          </div>

          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-zinc-900">
              Ses propositions analysées
            </h2>
            {declarations.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {declarations.map((d) => (
                  <DeclarationCarte key={d.analyseId} d={d} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-zinc-200 bg-white px-6 py-10 text-center text-sm text-zinc-500">
                Les propositions de ce candidat sont en cours d&rsquo;analyse.
              </p>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
