import Link from "next/link";
import Header from "@/components/Header";
import MonoTag from "@/components/MonoTag";
import { prisma } from "@/lib/prisma";
import { formatScore, getScoreBadge } from "@/lib/score";
import { editionConfiguree, isEditor } from "@/lib/test-auth";
import EditorBar from "./EditorBar";

// Toujours recalculée à chaque visite : on veut voir les brouillons du moment,
// pas une copie mise en cache (même choix que les autres pages du site).
export const dynamic = "force-dynamic";

// Page de travail, pas une page du site public : on demande aux moteurs de
// recherche de ne pas l'indexer et de ne pas suivre ses liens.
export const metadata = {
  title: "Brouillons — Perlimpinpin",
  robots: { index: false, follow: false },
};

// Même règle que sur le site public (voir displayTitle dans src/lib/queries.js) :
// le titre court s'il existe, sinon le début du texte d'origine.
function displayTitle(proposition) {
  if (proposition.titre) return proposition.titre;
  const text = proposition.texteOriginal;
  return text.length > 80 ? `${text.slice(0, 79).trimEnd()}…` : text;
}

function formatDate(date) {
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

// Les analyses en statut "brouillon" : celles que scripts/analyze.js enregistre
// à chaque nouvelle analyse, et que le site public ne montre jamais. On ne
// sélectionne que les champs utiles à la liste (pas le gros JSON complet).
async function getBrouillons() {
  return prisma.analyse.findMany({
    where: { statut: "brouillon" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      scoreFaisabilite: true,
      verdict: true,
      versionMethodologie: true,
      createdAt: true,
      proposition: {
        select: {
          id: true,
          titre: true,
          texteOriginal: true,
          theme: true,
          candidat: { select: { nom: true, parti: true } },
        },
      },
    },
  });
}

// Rubrique « Publications X » (mode édition) : chaque fiche publiée, avec un
// lien vers sa page de partage si ses tweets existent, sinon la commande à
// lancer. Lecture seule. Il n'y a pas de date de publication en base : la date
// affichée est celle de l'analyse (createdAt), comme sur la fiche publique.
function RubriquePubliees({ publiees, avecReseaux }) {
  return (
    <section aria-labelledby="rubrique-publications-x" className="mt-8 flex flex-col gap-4">
      <div>
        <MonoTag>Publications X</MonoTag>
        <h2 id="rubrique-publications-x" className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-900">
          Fiches publiées
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {publiees.length} fiche{publiees.length > 1 ? "s" : ""}, de la plus récente à la plus ancienne.
        </p>
      </div>
      {publiees.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white/60 p-6 text-sm text-zinc-500">Aucune fiche publiée.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {publiees.map((analyse) => {
            const { proposition } = analyse;
            const badge = getScoreBadge(analyse.scoreFaisabilite);
            return (
              <li
                key={analyse.id}
                className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-400">
                    {proposition.candidat.nom} · analyse du {formatDate(analyse.createdAt)} · Mesure #{proposition.id}
                  </p>
                  <Link
                    href={`/declarations/${proposition.id}`}
                    className="mt-0.5 block text-sm font-semibold text-zinc-900 hover:underline"
                  >
                    {displayTitle(proposition)}
                  </Link>
                </div>
                <div className="flex shrink-0 items-center gap-4 sm:text-right">
                  <span className={`text-lg font-extrabold ${badge.scoreClass}`}>
                    {formatScore(analyse.scoreFaisabilite)}
                    <span className="text-xs font-semibold text-zinc-400">/100</span>
                  </span>
                  {avecReseaux.has(analyse.id) ? (
                    <Link
                      href={`/test/reseaux/${proposition.id}`}
                      className="text-sm font-semibold text-zinc-800 underline underline-offset-2 hover:opacity-70"
                    >
                      Tweets prêts →
                    </Link>
                  ) : (
                    <span className="flex flex-col text-xs text-zinc-400 sm:items-end">
                      Pas encore de tweets
                      <code className="font-mono text-zinc-500">node scripts/reseaux.js {proposition.id}</code>
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Fiches publiées (mode édition seulement) : la dernière analyse publiée de
// chaque mesure, de la plus récente à la plus ancienne. Sans le gros JSON.
async function getPubliees() {
  const analyses = await prisma.analyse.findMany({
    where: { statut: "publie" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      scoreFaisabilite: true,
      createdAt: true,
      proposition: {
        select: { id: true, titre: true, texteOriginal: true, candidat: { select: { nom: true } } },
      },
    },
  });
  const vues = new Set();
  return analyses.filter(({ proposition }) => !vues.has(proposition.id) && vues.add(proposition.id));
}

// Analyses qui ont des publications X (clé reseaux de contenuComplet),
// calculé par Postgres sans charger le JSON. Lecture seule.
async function getAnalysesAvecReseaux() {
  const lignes = await prisma.$queryRaw`
    SELECT id FROM "Analyse"
    WHERE jsonb_exists("contenuComplet", 'reseaux')
  `;
  return new Set(lignes.map((ligne) => Number(ligne.id)));
}

export default async function TestPage() {
  const brouillons = await getBrouillons();
  // Liens vers les publications X : seulement pour les personnes déverrouillées.
  const editeur = editionConfiguree() && (await isEditor());
  const [publiees, avecReseaux] = editeur
    ? await Promise.all([getPubliees(), getAnalysesAvecReseaux()])
    : [[], new Set()];

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div>
            <MonoTag>Brouillons</MonoTag>
            <h1 className="mt-2 text-[clamp(1.875rem,1.2rem+2.6vw,3.75rem)] font-extrabold tracking-tight text-zinc-900">
              Analyses en brouillon
            </h1>
            <p className="mt-2 max-w-xl text-base text-zinc-500">
              Ces analyses ne sont pas publiées : elles n&rsquo;apparaissent
              nulle part sur le site public. Cette page sert à les relire avant
              publication.
            </p>
            {/* Mode édition : n'apparaît que si le code d'édition est configuré
                sur ce serveur. */}
            {editionConfiguree() ? (
              <div className="mt-4 text-zinc-700">
                <EditorBar editeur={editeur} />
              </div>
            ) : null}
          </div>

          {brouillons.length === 0 ? (
            <p className="rounded-xl border border-zinc-200 bg-white/60 p-6 text-sm text-zinc-500">
              Aucun brouillon pour le moment.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-zinc-700">
                {brouillons.length} brouillon{brouillons.length > 1 ? "s" : ""}
              </p>

              <ul className="flex flex-col gap-3">
                {brouillons.map((analyse) => {
                  const { proposition } = analyse;
                  const badge = getScoreBadge(analyse.scoreFaisabilite);

                  return (
                    <li key={analyse.id}>
                      {/* L'identifiant du lien est celui de la PROPOSITION,
                          comme pour /declarations/[id]. */}
                      <Link
                        href={`/test/${proposition.id}`}
                        className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white/70 p-5 transition-opacity hover:opacity-70 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-zinc-400">
                            {proposition.candidat.nom} · {proposition.theme}
                          </p>
                          <p className="mt-1 text-base font-semibold text-zinc-900">
                            {displayTitle(proposition)}
                          </p>
                          <p className="mt-1 font-mono text-xs text-zinc-400">
                            Analyse #{analyse.id} · Mesure #{proposition.id} ·{" "}
                            {formatDate(analyse.createdAt)} · méthodologie v
                            {analyse.versionMethodologie}
                          </p>
                        </div>

                        <div className="shrink-0 sm:text-right">
                          <p
                            className={`text-3xl font-extrabold tracking-tight ${badge.scoreClass}`}
                          >
                            {formatScore(analyse.scoreFaisabilite)}
                            <span className="text-sm font-semibold text-zinc-400">
                              /100
                            </span>
                          </p>
                          <p
                            className={`text-sm font-semibold ${badge.scoreClass}`}
                          >
                            {badge.label}
                          </p>
                        </div>
                      </Link>
                      {/* Hors de la carte-lien : pas de lien dans un lien. */}
                      {editeur ? (
                        <p className="mt-1 px-5 text-xs">
                          {avecReseaux.has(analyse.id) ? (
                            <Link
                              href={`/test/reseaux/${proposition.id}?brouillon=1`}
                              className="font-semibold text-zinc-700 underline underline-offset-2 hover:opacity-70"
                            >
                              Publications X →
                            </Link>
                          ) : (
                            <span className="text-zinc-400">Pas de publications X</span>
                          )}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {editeur ? <RubriquePubliees publiees={publiees} avecReseaux={avecReseaux} /> : null}
        </div>
      </main>
    </div>
  );
}
