import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import { getCandidatDetail } from "@/lib/queries";
import { getScoreBadge } from "@/lib/score";

export const dynamic = "force-dynamic";

const colorStyles = {
  red: { score: "text-red-600", badge: "bg-red-50 text-red-700" },
  orange: { score: "text-orange-600", badge: "bg-orange-50 text-orange-700" },
  green: { score: "text-green-600", badge: "bg-green-50 text-green-700" },
};

// Blocs de contenu éditorial de la fiche candidat. Chaque entrée est vide
// pour le moment (contenu à rédiger) — il suffit de remplir `contenu` pour
// que le bloc s'affiche.
const contentBlocks = [
  { titre: "Parcours", contenu: "" },
  { titre: "Positions clés", contenu: "" },
  { titre: "Citation marquante", contenu: "" },
];

export default async function CandidatDetailPage({ params }) {
  const { id } = await params;
  const candidatId = Number(id);

  if (!Number.isInteger(candidatId)) {
    notFound();
  }

  const candidat = await getCandidatDetail(candidatId);

  if (!candidat) {
    notFound();
  }

  const badge =
    candidat.scoreMoyen == null ? null : getScoreBadge(candidat.scoreMoyen);
  const colors = badge ? colorStyles[badge.color] : null;

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
          <div className="flex flex-col items-start gap-6 sm:flex-row">
            <img
              src={candidat.photoUrl || "/avatar-placeholder.svg"}
              alt={candidat.nom}
              className="h-[300px] w-[300px] shrink-0 rounded-2xl object-cover"
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
                {candidat.scoreMoyen == null ? (
                  <p className="mt-2 text-sm text-zinc-500">
                    Pas encore de déclaration publiée.
                  </p>
                ) : (
                  <>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span
                        className={`text-5xl font-extrabold tracking-tight ${colors.score}`}
                      >
                        {Math.round(candidat.scoreMoyen)}
                      </span>
                      <span className="text-lg font-semibold text-zinc-400">
                        /100
                      </span>
                    </div>
                    <div
                      className={`mt-3 inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}
                    >
                      {badge.label}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {contentBlocks.map((block) => (
              <section
                key={block.titre}
                className="rounded-2xl border border-zinc-200 bg-white p-6"
              >
                <h2 className="text-lg font-bold text-zinc-900">
                  {block.titre}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {block.contenu || "Contenu à venir."}
                </p>
              </section>
            ))}
          </div>

          <Link
            href={`/declarations?candidat=${encodeURIComponent(candidat.nom)}`}
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
          >
            Voir toutes ses propositions
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
