import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { editionConfiguree, isEditor } from "@/lib/test-auth";
import DeclarationDetailPage from "@/app/declarations/[id]/page";
import EditorBar from "../EditorBar";
import PublishBox from "../PublishBox";

// Toujours recalculée à chaque visite (même choix que la liste /test).
export const dynamic = "force-dynamic";

// Page de relecture, pas une page du site public : masquée des moteurs de recherche.
export const metadata = {
  title: "Brouillon — Perlimpinpin",
  robots: { index: false, follow: false },
};

// Prévisualisation d'un brouillon : on réutilise la fiche publique telle quelle
// (mode `preview`, sans les blocs de vote ni de feedback), précédée d'un bandeau.
// La lecture reste ouverte à tous ; seule la publication demande le code d'édition.
export default async function TestDetailPage({ params }) {
  const { id } = await params;
  const propositionId = Number(id);

  if (!Number.isInteger(propositionId)) {
    notFound();
  }

  // On ne regarde que l'analyse la plus récente de la mesure, comme la fiche
  // publique. Pas d'analyse, ou analyse déjà publiée : 404 (les fiches
  // publiées se voient sur /declarations/[id]).
  const derniere = await prisma.analyse.findFirst({
    where: { propositionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      statut: true,
      proposition: { select: { candidat: { select: { nom: true } } } },
    },
  });

  if (!derniere || derniere.statut !== "brouillon") {
    notFound();
  }

  const configuree = editionConfiguree();
  const editeur = configuree && (await isEditor());

  return (
    <>
      <div className="border-b border-amber-300 bg-amber-100 px-6 py-3 text-sm text-amber-900 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="font-semibold">
              Brouillon : analyse non publiée. Elle n&rsquo;est visible que par les
              personnes qui ont ce lien.
            </p>
            <Link
              href="/test"
              className="shrink-0 font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
            >
              ← Tous les brouillons
            </Link>
          </div>

          {/* Mode édition : n'apparaît que si le code d'édition est configuré. */}
          {configuree ? (
            <div className="flex flex-col gap-3">
              <EditorBar editeur={editeur} />
              {editeur ? (
                <PublishBox
                  analyseId={derniere.id}
                  candidatNom={derniere.proposition.candidat.nom}
                  simulation={process.env.TEST_DRY_RUN === "1"}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <DeclarationDetailPage params={params} preview />
    </>
  );
}
