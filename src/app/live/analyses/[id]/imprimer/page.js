import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getScoreBadge } from "@/lib/score";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import { getLiveAnalyseDetail } from "@/lib/live-history";
import { MesureCard } from "../../../MesureDetail";
import PrintControls from "../../../PrintControls";
import { Avatar, SCORE_BAR_CLASS, VerdictDot, VerdictLabel } from "../../../ui";

// Vue imprimable d'une analyse (Exporter) : mise en page simplifiée, sans barre
// latérale ni boutons d'action. Elle lance l'impression à l'ouverture (sauf avec
// ?apercu=1) pour enregistrer l'analyse en PDF depuis le navigateur.

export const metadata = {
  title: "Analyse — impression",
  robots: { index: false, follow: false },
};

const AXES = [
  { key: "chiffrage", label: "Chiffrage" },
  { key: "faisabilite", label: "Faisabilité" },
  { key: "impact", label: "Impact" },
];

const printDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

function Section({ titre, children }) {
  return (
    <section className="mt-7 break-inside-avoid-page">
      <h2 className="border-b border-zinc-300 pb-1.5 text-base font-bold text-zinc-900">{titre}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function QuestionList({ titre, questions }) {
  if (questions.length === 0) return null;
  return (
    <div className="mt-3 first:mt-0">
      <h3 className="text-sm font-semibold text-zinc-800">
        {titre} ({questions.length})
      </h3>
      <ol className="mt-2 flex flex-col gap-2.5">
        {questions.map((question, index) => (
          <li key={index} className="break-inside-avoid text-sm">
            <p className="font-medium text-zinc-900">
              {index + 1}. {question.texte}
            </p>
            {question.justification && <p className="mt-0.5 pl-4 text-xs text-zinc-500">{question.justification}</p>}
            {question.relance && (
              <p className="mt-0.5 pl-4 text-xs text-zinc-700">
                <span className="font-semibold">Relance :</span> {question.relance}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

export default async function ImprimerPage({ params, searchParams }) {
  // Le proxy filtre déjà /live/* ; on revérifie ici, au plus près du contenu.
  const token = (await cookies()).get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) redirect("/live/login");

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const analyse = await getLiveAnalyseDetail(id);
  if (!analyse) notFound();

  const query = await searchParams;
  const auto = query.apercu === undefined;

  const badge = getScoreBadge(analyse.score);
  const resume = analyse.syntheseGlobale ?? analyse.mesures[0]?.verdict_court ?? null;
  const candidatNom = analyse.candidat?.nom ?? null;
  const sourceLibelle = analyse.video
    ? `Vidéo ${analyse.video.label}`
    : (analyse.sourceLabel ?? "Déclaration collée par l'équipe");
  const hasAxes = AXES.some((axe) => analyse.syntheses[axe.key]);
  const { essentielles, difficiles } = analyse.questions;
  const hasQuestions = essentielles.length + difficiles.length > 0;

  return (
    <main className="mx-auto w-full max-w-3xl bg-white px-6 py-8 font-sans text-zinc-800 print:max-w-none print:px-0 print:py-0">
      {/* Marges de page et impression des couleurs (badges, barre de score, verdicts) */}
      <style>{`@media print { @page { margin: 14mm; } * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>

      <PrintControls retourHref={`/live/analyses/${analyse.id}`} auto={auto} />

      <p className="font-mono text-xs font-bold tracking-widest text-zinc-500">PERLIMPINPIN GO · ANALYSE</p>

      <header className="mt-3 flex items-start gap-4">
        <Avatar nom={candidatNom} photoUrl={analyse.candidat?.photoUrl ?? null} size={72} rounded="rounded-lg" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-zinc-800">{candidatNom ?? "Candidat non précisé"}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {analyse.dateLabel} · {sourceLibelle} · {analyse.themeLabel}
          </p>
          {analyse.sourceUrl && <p className="mt-0.5 break-all text-xs text-zinc-400">{analyse.sourceUrl}</p>}
          <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-zinc-900">{analyse.titre}</h1>
        </div>
      </header>

      <p className="mt-4 rounded-lg border border-zinc-300 px-4 py-2.5 text-xs text-zinc-600">
        <strong className="text-zinc-800">Estimation préliminaire.</strong> Réalisée sans recherche externe, à partir de la
        seule déclaration : à vérifier avant toute diffusion.
      </p>

      <Section titre="Évaluation globale">
        <div className="flex flex-wrap items-center gap-4">
          <p className="text-4xl font-bold leading-none text-zinc-900">
            {analyse.score}
            <span className="text-base font-normal text-zinc-400">/100</span>
          </p>
          <span className={`rounded-full px-3 py-1 text-sm font-semibold ${badge.badgeClass}`}>{badge.label}</span>
          {analyse.nbMesures > 1 && (
            <span className="text-xs text-zinc-500">Score moyen de {analyse.nbMesures} mesures analysées</span>
          )}
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full ${SCORE_BAR_CLASS[badge.color] ?? "bg-zinc-400"}`}
            style={{ width: `${Math.min(100, Math.max(0, analyse.score))}%` }}
          />
        </div>
        {resume && <p className="mt-3 text-sm leading-relaxed text-zinc-700">{resume}</p>}
        {hasAxes && (
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {AXES.map((axe) => (
              <div key={axe.key} className="break-inside-avoid rounded-lg border border-zinc-200 p-3">
                <dt className="text-sm font-semibold text-zinc-900">{axe.label}</dt>
                <dd className="mt-1 text-xs leading-relaxed text-zinc-600">{analyse.syntheses[axe.key] ?? "Non renseigné."}</dd>
              </div>
            ))}
          </dl>
        )}
        {!analyse.enrichi && (
          <p className="mt-3 text-xs text-zinc-500">
            Analyse antérieure au format enrichi : affirmations, sources et synthèses par axe non disponibles.
          </p>
        )}
      </Section>

      {analyse.affirmations.length > 0 && (
        <Section titre={`Affirmations analysées (${analyse.affirmations.length})`}>
          <ul className="flex flex-col gap-2.5">
            {analyse.affirmations.map((affirmation, index) => {
              const noms = affirmation.sources
                .map((sourceId) => analyse.sources.find((source) => source.id === sourceId)?.nom)
                .filter(Boolean);
              return (
                <li key={index} className="flex items-start gap-2.5 break-inside-avoid text-sm">
                  <VerdictDot verdict={affirmation.verdict} />
                  <div className="min-w-0 flex-1">
                    <p className="text-zinc-900">{`« ${affirmation.texte} »`}</p>
                    {noms.length > 0 && <p className="mt-0.5 text-xs text-zinc-500">Sources : {noms.join(" ; ")}</p>}
                  </div>
                  <VerdictLabel verdict={affirmation.verdict} />
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {hasQuestions && (
        <Section titre="Questions à poser">
          <QuestionList titre="Questions essentielles" questions={essentielles} />
          <QuestionList titre="Questions difficiles" questions={difficiles} />
        </Section>
      )}

      {analyse.sources.length > 0 && (
        <Section titre={`Sources (${analyse.sources.length})`}>
          <p className="mb-2 text-xs text-zinc-500">
            Pistes de vérification issues des connaissances de l&apos;analyse (aucune recherche web) : à vérifier avant toute
            diffusion.
          </p>
          <ol className="flex flex-col gap-1.5 text-sm">
            {[...analyse.sources]
              .sort((a, b) => a.id - b.id)
              .map((source) => (
                <li key={source.id} className="break-inside-avoid">
                  <span className="font-medium text-zinc-900">
                    {source.id}. {source.nom}
                  </span>
                  {source.date ? <span className="text-zinc-500"> ({source.date})</span> : null}
                  {source.url && <span className="block break-all pl-4 text-xs text-zinc-500">{source.url}</span>}
                </li>
              ))}
          </ol>
        </Section>
      )}

      {analyse.mesures.length > 0 && (
        <Section titre="Détail de l'analyse par mesure">
          <div className="flex flex-col gap-4">
            {analyse.mesures.map((mesure, index) => (
              <div key={index} className="break-inside-avoid-page">
                <MesureCard mesure={mesure} index={index} />
              </div>
            ))}
          </div>
          {analyse.remarque && <p className="mt-3 text-xs text-zinc-500">{analyse.remarque}</p>}
        </Section>
      )}

      <Section titre="Déclaration analysée">
        <p className="whitespace-pre-line text-xs leading-relaxed text-zinc-600">{analyse.declaration}</p>
      </Section>

      <p className="mt-8 border-t border-zinc-200 pt-3 text-[11px] text-zinc-400">
        Analyse n° {analyse.id} — imprimée le {printDateFormatter.format(new Date())} depuis PerlimpinpinGo. Estimation
        préliminaire, à vérifier avant diffusion.
      </p>
    </main>
  );
}
