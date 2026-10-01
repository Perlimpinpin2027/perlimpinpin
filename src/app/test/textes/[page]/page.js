import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import MonoTag from "@/components/MonoTag";
import { prisma } from "@/lib/prisma";
import { editionConfiguree, isEditor } from "@/lib/test-auth";
import { PAGES_EDITABLES } from "@/lib/textes-site";
import EditorBar from "../../EditorBar";
import ChampTexte from "../ChampTexte";

// Toujours recalculée : on veut voir les textes du moment.
export const dynamic = "force-dynamic";

// Page de travail : masquée des moteurs de recherche.
export const metadata = {
  title: "Textes du site — Perlimpinpin",
  robots: { index: false, follow: false },
};

// Édition des textes d'une page publique. Réservée au code d'édition de /test
// (même cookie, même déverrouillage que pour les brouillons).
export default async function EditionTextesPage({ params }) {
  const { page } = await params;
  if (!Object.hasOwn(PAGES_EDITABLES, page)) notFound();
  const definition = PAGES_EDITABLES[page];

  const configuree = editionConfiguree();
  const editeur = configuree && (await isEditor());

  // Les textes en base ne sont lus que pour un éditeur déverrouillé.
  let enregistres = new Map();
  if (editeur) {
    const lignes = await prisma.texteSite.findMany({
      where: { page },
      select: { cle: true, valeur: true, version: true },
    });
    enregistres = new Map(lignes.map((ligne) => [ligne.cle, ligne]));
  }

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <div>
            <Link
              href="/test/textes"
              className="text-sm font-semibold text-zinc-500 underline underline-offset-2 hover:opacity-70"
            >
              ← Toutes les pages
            </Link>
            <div className="mt-4">
              <MonoTag>Textes du site</MonoTag>
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
              {definition.nom}
            </h1>
            <p className="mt-2 text-base text-zinc-500">
              Chaque modification est en ligne dès que tu cliques sur « Enregistrer ».{" "}
              <a
                href={definition.chemin}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-zinc-700 underline underline-offset-2 hover:opacity-70"
              >
                Voir la page ↗
              </a>
            </p>

            <div className="mt-4 text-zinc-700">
              {configuree ? (
                <EditorBar editeur={editeur} />
              ) : (
                <p className="text-sm text-zinc-500">
                  Le mode édition n&rsquo;est pas configuré sur ce serveur (TEST_EDIT_CODE manquant).
                </p>
              )}
            </div>
          </div>

          {editeur ? (
            <div className="flex flex-col gap-4">
              {definition.champs.map((champ, index) => {
                const ligne = enregistres.get(champ.cle);
                const version = ligne?.version ?? 0;
                // Titre de rubrique quand on change de groupe.
                const nouveauGroupe =
                  champ.groupe && champ.groupe !== definition.champs[index - 1]?.groupe;
                return (
                  <Fragment key={`${champ.cle}-${version}`}>
                    {nouveauGroupe ? (
                      <h2 className="mt-6 border-b border-zinc-200 pb-2 text-xl font-extrabold tracking-tight text-zinc-900">
                        {champ.groupe}
                      </h2>
                    ) : null}
                    <ChampTexte
                      page={page}
                      cle={champ.cle}
                      libelle={champ.libelle}
                      defaut={champ.defaut}
                      riche={Boolean(champ.riche)}
                      valeurEnregistree={ligne?.valeur ?? null}
                      version={version}
                    />
                  </Fragment>
                );
              })}
            </div>
          ) : configuree ? (
            <p className="rounded-xl border border-zinc-200 bg-white/60 p-6 text-sm text-zinc-500">
              Clique sur « Mode édition » et entre le code d&rsquo;édition pour modifier les textes.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
