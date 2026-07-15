import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import {
  getDeclarationDetail,
  scoreToFlag,
  scoreToVerdictLabel,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const flagStyles = {
  red: { score: "text-red-600", badge: "bg-red-50 text-red-700" },
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
  { key: "scoreSolidite", label: "Solidité factuelle" },
  { key: "scoreJuridique", label: "Faisabilité juridique" },
  { key: "scoreOperationnel", label: "Faisabilité opérationnelle" },
  { key: "scoreBudgetaire", label: "Soutenabilité budgétaire" },
  { key: "scorePertinence", label: "Pertinence" },
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
  const flagColor = scoreToFlag(analyse.scoreFaisabilite);
  const colors = flagStyles[flagColor];
  const notation = contenu.notation_detaillee ?? {};

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <article className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div>
            <Link
              href="/"
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
              <div
                className="h-11 w-11 shrink-0 rounded-full bg-zinc-200"
                aria-hidden="true"
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

          <blockquote className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 text-base leading-relaxed text-zinc-700">
            &ldquo;{declaration.texteOriginal}&rdquo;
          </blockquote>

          <div className="flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
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
                className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colors.badge}`}
              >
                <span aria-hidden="true">🚩</span>
                {flagColor === "green" ? "Green Flag" : "Red Flag"}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 sm:justify-end">
              {notationLabels.map(({ key, label }) => (
                <div key={key} className="text-center">
                  <p className="text-lg font-bold text-zinc-900">
                    {notation[key] ?? "—"}
                    <span className="text-xs font-medium text-zinc-400">
                      /20
                    </span>
                  </p>
                  <p className="mt-0.5 max-w-[6rem] text-xs text-zinc-500">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Section title="Résumé">
            <TextOrList value={contenu.resume_court} />
          </Section>

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
        </article>
      </main>
    </div>
  );
}
