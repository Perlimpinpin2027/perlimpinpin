import Link from "next/link";
import Header from "@/components/Header";
import { getFeedbackLeaderboard, getScoreExtremes } from "@/lib/queries";
import { getScoreBadge } from "@/lib/score";

export const dynamic = "force-dynamic";

const sections = [
  { key: "general", title: "Classement général", subtitle: "Toutes périodes confondues" },
  { key: "last30", title: "30 derniers jours", subtitle: "Votes des 30 derniers jours" },
  { key: "last10", title: "10 derniers jours", subtitle: "Votes des 10 derniers jours" },
];

const podiumStyles = {
  green: {
    card: "border-2 border-green-200 bg-green-50/60 hover:border-green-300 hover:bg-green-50",
    empty: "border-2 border-green-200 bg-green-50/60",
  },
  red: {
    card: "border-2 border-red-200 bg-red-50/60 hover:border-red-300 hover:bg-red-50",
    empty: "border-2 border-red-200 bg-red-50/60",
  },
};

function PodiumCard({ card, tint }) {
  const styles = podiumStyles[tint];

  if (!card) {
    return (
      <div className={`flex h-full items-center justify-center rounded-3xl p-8 text-center ${styles.empty}`}>
        <p className="text-sm text-zinc-500">
          Pas encore assez de déclarations publiées.
        </p>
      </div>
    );
  }

  const badge = getScoreBadge(card.score);

  return (
    <Link
      href={`/declarations/${card.propositionId}`}
      className={`flex flex-col gap-4 rounded-3xl p-8 transition-colors ${styles.card}`}
    >
      <div className="flex items-center gap-3">
        <img
          src={card.candidatPhotoUrl || "/avatar-placeholder.svg"}
          alt={card.candidatNom}
          className="h-10 w-10 shrink-0 rounded-lg object-cover object-top"
        />
        <p className="text-sm font-semibold text-zinc-900">{card.candidatNom}</p>
      </div>

      <p className="text-lg font-semibold leading-snug text-zinc-900">
        {card.titre}
      </p>

      {card.excerpt ? (
        <p className="text-sm leading-relaxed text-zinc-600">{card.excerpt}</p>
      ) : null}

      <div className="mt-auto flex items-center gap-2 pt-2">
        <span className={`text-2xl font-extrabold tracking-tight ${badge.scoreClass}`}>
          {card.score}
          <span className="text-sm font-semibold text-zinc-400">/100</span>
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.badgeClass}`}
        >
          {badge.label}
        </span>
      </div>
    </Link>
  );
}

function LeaderboardCard({ card, voteLabel, voteIcon }) {
  if (!card) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-zinc-200 bg-white p-6 text-center">
        <p className="text-sm text-zinc-500">
          Pas encore assez de votes sur cette période.
        </p>
      </div>
    );
  }

  const badge = getScoreBadge(card.score);

  return (
    <Link
      href={`/declarations/${card.propositionId}`}
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
    >
      <div className="flex items-center gap-3">
        <img
          src={card.candidatPhotoUrl || "/avatar-placeholder.svg"}
          alt={card.candidatNom}
          className="h-10 w-10 shrink-0 rounded-lg object-cover object-top"
        />
        <p className="text-sm font-semibold text-zinc-900">{card.candidatNom}</p>
      </div>

      <p className="text-base font-semibold leading-snug text-zinc-900">
        {card.titre}
      </p>

      {card.excerpt ? (
        <p className="text-sm leading-relaxed text-zinc-500">{card.excerpt}</p>
      ) : null}

      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${badge.scoreClass}`}>
            {card.score}
            <span className="text-xs font-medium text-zinc-400">/100</span>
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.badgeClass}`}
          >
            {badge.label}
          </span>
        </div>
        <span className="text-sm font-semibold text-zinc-600">
          {voteIcon} {voteLabel}
        </span>
      </div>
    </Link>
  );
}

export default async function PrixPerlimpinpinPage() {
  const [leaderboard, scoreExtremes] = await Promise.all([
    getFeedbackLeaderboard(),
    getScoreExtremes(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-14">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-red-600">
              Présidentielle 2027
            </span>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
              Prix Perlimpinpin
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Le classement des déclarations les plus (et les moins) plébiscitées
              par les visiteurs.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  🏆 La plus fiable
                </span>
                <PodiumCard card={scoreExtremes.highest} tint="green" />
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  🚩 La moins fiable
                </span>
                <PodiumCard card={scoreExtremes.lowest} tint="red" />
              </div>
            </div>

            <p className="border-b border-zinc-200 pb-6 text-center text-xs text-zinc-400">
              Classement par score Perlimpinpin — ci-dessous, le classement par
              votes des visiteurs
            </p>
          </div>

          {sections.map((section) => {
            const data = leaderboard[section.key];
            return (
              <div key={section.key} className="flex flex-col gap-4">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900">
                    {section.title}
                  </h2>
                  <p className="text-xs text-zinc-400">{section.subtitle}</p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Le plus apprécié
                    </span>
                    <LeaderboardCard
                      card={data.topLiked}
                      voteLabel={data.topLiked?.likes ?? 0}
                      voteIcon="👍"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Le plus contesté
                    </span>
                    <LeaderboardCard
                      card={data.topDisliked}
                      voteLabel={data.topDisliked?.dislikes ?? 0}
                      voteIcon="👎"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
