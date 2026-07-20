import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import FeedbackWidget from "@/components/FeedbackWidget";
import { getDeclarationDetail } from "@/lib/queries";
import { getScoreBadge } from "@/lib/score";

export const dynamic = "force-dynamic";

const colorStyles = {
  red: { score: "text-red-600", badge: "bg-red-50 text-red-700" },
  orange: { score: "text-orange-600", badge: "bg-orange-50 text-orange-700" },
  green: { score: "text-green-600", badge: "bg-green-50 text-green-700" },
};

const criteriaLabels = {
  faisabilite_juridique: "Faisabilité juridique",
  faisabilite_operationnelle: "Faisabilité opérationnelle",
  soutenabilite_budgetaire: "Soutenabilité budgétaire",
  efficacite_probable: "Efficacité probable",
  pertinence_sociale_economique_ecologique: "Pertinence",
};

const notationLabels = [
  {
    key: "scoreSolidite",
    label: "Solidité factuelle",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
      />
    ),
  },
  {
    key: "scoreJuridique",
    label: "Faisabilité juridique",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v17.25m0-17.25c-1.472 0-2.882.265-4.185.75M12 3c1.472 0 2.882.265 4.185.75M18.75 21H5.25M4.5 8.25h4.5m6 0h4.5M3 8.25l2.25-4.5h3l-2.25 4.5H3Zm12 0 2.25-4.5h3l-2.25 4.5h-3Z"
      />
    ),
  },
  {
    key: "scoreOperationnel",
    label: "Faisabilité opérationnelle",
    icon: (
      <>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.558-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      </>
    ),
  },
  {
    key: "scoreBudgetaire",
    label: "Soutenabilité budgétaire",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
      />
    ),
  },
  {
    key: "scorePertinence",
    label: "Pertinence",
    icon: (
      <>
        <circle cx="12" cy="12" r="8.25" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="4.25" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="0.75" fill="currentColor" />
      </>
    ),
  },
];

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6">
      <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-zinc-600">
        {children}
      </div>
    </section>
  );
}

function TextOrList({ value }) {
  if (!value) {
    return <p className="text-zinc-400">Non renseigné.</p>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="flex flex-col gap-2">
        {value.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400"
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  return <p>{value}</p>;
}

// Première phrase de resumeAccueil, pour le court commentaire sous le
// badge dans la carte score de la sidebar (pas de nouveau champ IA).
function firstSentence(text) {
  if (!text) return null;
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return match ? match[0] : text;
}

export default async function DeclarationDetailPage({ params }) {
  const { id } = await params;
  const propositionId = Number(id);

  if (!Number.isInteger(propositionId)) {
    notFound();
  }

  const declaration = await getDeclarationDetail(propositionId);

  if (!declaration || !declaration.analyse) {
    notFound();
  }

  const { analyse } = declaration;
  const contenu = analyse.contenuComplet ?? {};
  const badge = getScoreBadge(analyse.scoreFaisabilite);
  const colors = colorStyles[badge.color];
  const notation = contenu.notation_detaillee ?? {};
  const scoreComment = firstSentence(analyse.resumeAccueil);

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start lg:gap-x-8">
          {/* En-tête : pleine largeur sur desktop, premier bloc sur mobile */}
          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-1">
            <Link
              href="/declarations"
              className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
            >
              ← Retour
            </Link>

            <span className="mt-6 block text-xs font-bold uppercase tracking-widest text-red-600">
              {declaration.theme}
            </span>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl">
              {declaration.titre}
            </h1>

            <div className="mt-6 flex items-center gap-3">
              <img
                src={declaration.candidat.photoUrl || "/avatar-placeholder.svg"}
                alt={declaration.candidat.nom}
                className="h-11 w-11 shrink-0 rounded-lg object-cover object-top"
              />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-900">
                  {declaration.candidat.nom}
                </span>
                <span className="text-xs text-zinc-500">
                  {declaration.candidat.parti} · {declaration.dateLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar : carte score — tôt sur mobile, colonne droite sticky sur desktop */}
          <aside className="lg:col-start-3 lg:row-start-1 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Score Perlimpinpin
              </span>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span
                  className={`text-5xl font-extrabold tracking-tight ${colors.score}`}
                >
                  {analyse.scoreFaisabilite}
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

              {scoreComment ? (
                <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                  {scoreComment}
                </p>
              ) : null}

              <Link
                href="#raisonnement-complet"
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
              >
                Lire l&apos;analyse détaillée
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </aside>

          {/* Extrait analysé */}
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 lg:col-span-2 lg:col-start-1 lg:row-start-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-4 w-4 text-zinc-400"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 8.25h9m-9 3.75h4.5m-8.55 5.865c.5.196 1.032.336 1.582.412a10.5 10.5 0 0 0 9.4-4.5.75.75 0 0 0-.05-.87A10.457 10.457 0 0 0 12 3.75c-5.799 0-10.5 4.701-10.5 10.5 0 1.442.291 2.816.818 4.067a.75.75 0 0 1-.06.727l-1.045 1.567a.375.375 0 0 0 .343.564 4.483 4.483 0 0 0 2.694-.914Z"
                  />
                </svg>
                Extrait analysé
              </h2>
              <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                Sources publiques
              </span>
            </div>

            <blockquote className="mt-4 text-base leading-relaxed text-zinc-700">
              &ldquo;{declaration.texteOriginal}&rdquo;
            </blockquote>
          </section>

          {/* Le résumé de Perlimpinpin IA */}
          <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:p-8 lg:col-span-2 lg:col-start-1 lg:row-start-3">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
                />
              </svg>
              Le résumé de Perlimpinpin IA
            </h2>
            <p className="mt-3 text-lg leading-relaxed text-zinc-800 sm:text-xl">
              {analyse.teaser || "Résumé à venir."}
            </p>
            <Link
              href="#raisonnement-complet"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
            >
              Voir le raisonnement complet
              <span aria-hidden="true">→</span>
            </Link>
          </section>

          {/* Like / dislike */}
          <div className="lg:col-span-2 lg:col-start-1 lg:row-start-4">
            <FeedbackWidget
              analyseId={analyse.id}
              initialLikes={declaration.feedbackCounts.likes}
              initialDislikes={declaration.feedbackCounts.dislikes}
            />
          </div>

          {/* Détail du score */}
          <div className="lg:col-start-3 lg:row-start-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Détail du score
              </span>

              <div className="mt-4 flex flex-col divide-y divide-zinc-100">
                {notationLabels.map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="h-4.5 w-4.5"
                        aria-hidden="true"
                      >
                        {icon}
                      </svg>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-zinc-900">
                        {notation[key] ?? "—"}
                        <span className="text-xs font-medium text-zinc-400">
                          /20
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              <Link
                href="/methode"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
              >
                Voir comment nous notons
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* Raisonnement complet */}
          <div
            id="raisonnement-complet"
            className="flex scroll-mt-24 flex-col gap-6 lg:col-span-2 lg:col-start-1 lg:row-start-5"
          >
            <h2 className="font-serif text-2xl font-bold text-zinc-900">
              Le raisonnement complet
            </h2>

            <Section title="Mesure reformulée">
              <TextOrList value={contenu.mesure_reformulee} />
            </Section>

            <Section title="Mise en contexte dans le programme">
              <TextOrList value={contenu.mise_en_contexte_dans_le_programme} />
            </Section>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <Section title="Contexte local">
                <TextOrList value={contenu.contexte_local} />
              </Section>
              <Section title="Contexte national">
                <TextOrList value={contenu.contexte_national} />
              </Section>
              <Section title="Contexte international">
                <TextOrList value={contenu.contexte_international} />
              </Section>
            </div>

            <Section title="Analyse par critères">
              <div className="flex flex-col gap-4">
                {Object.entries(contenu.analyse_par_criteres ?? {}).map(
                  ([key, value]) => (
                    <div key={key}>
                      <p className="font-semibold text-zinc-900">
                        {criteriaLabels[key] ?? key}
                      </p>
                      <p className="mt-1">{value}</p>
                    </div>
                  ),
                )}
              </div>
            </Section>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Section title="Ce qui est établi">
                <TextOrList value={contenu.ce_qui_est_etabli} />
              </Section>
              <Section title="Ce qui est probable">
                <TextOrList value={contenu.ce_qui_est_probable} />
              </Section>
              <Section title="Ce qui est discutable">
                <TextOrList value={contenu.ce_qui_est_discutable} />
              </Section>
              <Section title="Ce qui est inconnu">
                <TextOrList value={contenu.ce_qui_est_inconnu} />
              </Section>
            </div>

            <Section title="Angles morts et effets de bord">
              <TextOrList value={contenu.angles_morts_et_effets_de_bord} />
            </Section>

            <Section title="Verdict final">
              <TextOrList value={contenu.verdict_final} />
            </Section>

            <Section title="Sources utilisées">
              <TextOrList value={contenu.sources_utilisees} />
            </Section>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Section title="Niveau de confiance">
                <TextOrList value={contenu.niveau_de_confiance} />
              </Section>
              <Section title="Limites">
                <TextOrList value={contenu.limites} />
              </Section>
            </div>
          </div>

          {/* Bandeau de confiance */}
          <div className="grid grid-cols-1 gap-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:grid-cols-3 sm:p-8 lg:col-span-3 lg:col-start-1 lg:row-start-6">
            <Link
              href="/methode"
              className="flex items-start gap-3 transition-colors hover:text-blue-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  Méthode transparente
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Notre méthode de notation est publique.
                </p>
              </div>
            </Link>

            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                />
              </svg>
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  Sources publiques
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Données vérifiées et citables.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="mt-0.5 h-6 w-6 shrink-0 text-blue-600"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
              <div>
                <p className="text-sm font-bold text-zinc-900">
                  Analyse relue
                </p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                  Par des experts et journalistes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
