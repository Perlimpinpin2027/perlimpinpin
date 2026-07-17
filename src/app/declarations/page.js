import Link from "next/link";
import Header from "@/components/Header";
import { getPublishedDeclarations } from "@/lib/queries";
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

const sortOptions = [
  { value: "date", label: "Date" },
  { value: "score_desc", label: "Score ↓" },
  { value: "score_asc", label: "Score ↑" },
];

function buildHref(current, changes) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(changes)) {
    if (value == null) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `/declarations?${query}` : "/declarations";
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

  const currentParams = new URLSearchParams();
  if (candidat) currentParams.set("candidat", candidat);
  if (theme) currentParams.set("theme", theme);
  if (sort) currentParams.set("sort", sort);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">
              Toutes les déclarations
            </span>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
              Déclarations analysées
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {declarations.length} déclaration
              {declarations.length > 1 ? "s" : ""} publiée
              {declarations.length > 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Candidat
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildHref(currentParams, { candidat: null })}
                  className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                    !candidat
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  Tous
                </Link>
                {candidats.map((c) => (
                  <Link
                    key={c.nom}
                    href={buildHref(currentParams, {
                      candidat: candidat === c.nom ? null : c.nom,
                    })}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                      candidat === c.nom
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {c.nom}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Thème
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildHref(currentParams, { theme: null })}
                  className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                    !theme
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  Tous
                </Link>
                {themes.map((t) => (
                  <Link
                    key={t}
                    href={buildHref(currentParams, {
                      theme: theme === t ? null : t,
                    })}
                    className={`rounded-full px-3 py-1 text-sm font-semibold transition-colors ${
                      theme === t
                        ? "bg-zinc-900 text-white"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {t}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Trier par
              </p>
              <div className="flex flex-wrap gap-2">
                {sortOptions.map((option) => (
                  <Link
                    key={option.value}
                    href={buildHref(currentParams, { sort: option.value })}
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
                    className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={d.candidatPhotoUrl || "/avatar-placeholder.svg"}
                        alt={d.candidatNom}
                        className="h-9 w-9 shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-zinc-900">
                          {d.candidatNom}
                        </p>
                        <p className="text-xs text-zinc-400">{d.candidatParti}</p>
                      </div>
                    </div>

                    <p className="text-base font-semibold leading-snug text-zinc-900">
                      {d.titre}
                    </p>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400">
                        {d.theme} · {d.dateLabel}
                      </p>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`text-sm font-bold ${scoreTextStyles[badge.color]}`}
                        >
                          {d.score}
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
