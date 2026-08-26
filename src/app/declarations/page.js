import Link from "next/link";
import Header from "@/components/Header";
import FilterPillGroup from "@/components/FilterPillGroup";
import { getPublishedDeclarations } from "@/lib/queries";
import { getScoreBadge } from "@/lib/score";

export const dynamic = "force-dynamic";

const sortOptions = [
  { value: "date", label: "Date ↓" },
  { value: "score_desc", label: "Score ↓" },
  { value: "score_asc", label: "Score ↑" },
];

function buildSortHref(currentParams, value) {
  const params = new URLSearchParams(currentParams);
  params.set("sort", value);
  return `/declarations?${params.toString()}`;
}

export default async function DeclarationsPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const candidat = resolvedParams?.candidat || undefined;
  const theme = resolvedParams?.theme || undefined;
  const sort = resolvedParams?.sort || "date";

  const { declarations, candidats, themes } = await getPublishedDeclarations({
    candidat,
    theme,
    sort,
  });

  const currentParams = {};
  if (candidat) currentParams.candidat = candidat;
  if (theme) currentParams.theme = theme;
  if (sort) currentParams.sort = sort;

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-400">
              // Déclarations
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
              Déclarations analysées
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {declarations.length} déclaration
              {declarations.length > 1 ? "s" : ""} publiée
              {declarations.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
            <FilterPillGroup
              label="Candidat"
              options={candidats.map((c) => ({ value: c.nom, label: c.nom }))}
              activeValue={candidat}
              paramKey="candidat"
              currentParams={currentParams}
            />

            <FilterPillGroup
              label="Thème"
              options={themes.map((t) => ({ value: t, label: t }))}
              activeValue={theme}
              paramKey="theme"
              currentParams={currentParams}
            />

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Trier
              </p>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={buildSortHref(currentParams, option.value)}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                      sort === option.value
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {option.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {declarations.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Aucune déclaration ne correspond à ces filtres.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {declarations.map((d) => {
                const badge = getScoreBadge(d.score);
                return (
                  <Link
                    key={d.id}
                    href={`/declarations/${d.id}`}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={d.candidatPhotoUrl || "/avatar-placeholder.svg"}
                          alt={d.candidatNom}
                          className="h-9 w-9 shrink-0 rounded-lg object-cover object-top"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-zinc-900">
                            {d.candidatNom}
                          </p>
                          <p className="text-xs text-zinc-400">{d.candidatParti}</p>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-zinc-400">
                        {`// ANALYSE_${String(d.analyseId).padStart(3, "0")}`}
                      </span>
                    </div>

                    <p className="line-clamp-2 text-base font-semibold leading-snug text-zinc-900">
                      {d.titre}
                    </p>

                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-extrabold tracking-tight ${badge.scoreClass}`}>
                        {d.score}
                        <span className="text-sm font-semibold text-zinc-400">/100</span>
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.badgeClass}`}
                      >
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">
                        {d.theme} · {d.dateLabel}
                      </p>
                      <span aria-hidden="true" className="text-zinc-400">
                        →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
