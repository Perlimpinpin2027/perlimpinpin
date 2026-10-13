import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { editionConfiguree, isEditor } from "@/lib/test-auth";
import EditorBar from "../../EditorBar";
import PublicationsX from "../../PublicationsX";

// Toujours recalculée à chaque visite (comme les autres pages /test).
export const dynamic = "force-dynamic";

// Page de travail, pas une page du site public.
export const metadata = {
  title: "Publications X — Perlimpinpin",
  robots: { index: false, follow: false },
};

// Page de partage d'une fiche PUBLIÉE : les trois publications X, prêtes à
// poster à la main (rien n'est publié automatiquement). Réservée aux
// personnes déverrouillées sur /test (même code d'édition).
export default async function PartageReseauxPage({ params, searchParams }) {
  const { id } = await params;
  const propositionId = Number(id);
  if (!Number.isInteger(propositionId)) notFound();

  const configuree = editionConfiguree();
  const editeur = configuree && (await isEditor());
  const { publiee } = await searchParams;

  const proposition = editeur
    ? await prisma.proposition.findUnique({
        where: { id: propositionId },
        select: {
          id: true,
          titre: true,
          texteOriginal: true,
          candidat: { select: { nom: true, photoUrl: true } },
          analyses: {
            where: { statut: "publie" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, scoreFaisabilite: true, contenuComplet: true },
          },
        },
      })
    : null;
  const analyse = proposition?.analyses[0];
  if (editeur && !analyse) notFound();

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-8 text-zinc-900 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Link href="/test" className="font-semibold underline underline-offset-2 hover:opacity-70">
            ← Tous les brouillons
          </Link>
          {configuree ? <EditorBar editeur={editeur} /> : null}
        </div>

        {!editeur ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {configuree
              ? "Page réservée aux personnes déverrouillées : saisissez le code d’édition ci-dessus."
              : "Le mode édition n’est pas configuré sur ce site."}
          </p>
        ) : (
          <>
            {publiee === "1" ? (
              <p role="status" className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                Analyse publiée.{" "}
                <Link href={`/declarations/${proposition.id}`} className="underline underline-offset-2">
                  Voir la fiche publique
                </Link>
              </p>
            ) : null}

            <header className="flex flex-col gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Publications X</h1>
              <p className="text-sm text-zinc-600">
                <Link href={`/declarations/${proposition.id}`} className="underline underline-offset-2">
                  {proposition.titre ?? `Fiche ${proposition.id}`}
                </Link>{" "}
                · {proposition.candidat.nom}
              </p>
              <p className="rounded-xl border border-zinc-200 bg-white p-3 text-sm">
                Calendrier conseillé : carte le jour J, chiffre à J+2, tient / tient pas à J+4.
              </p>
            </header>

            <PublicationsX proposition={proposition} analyse={analyse} partage />
          </>
        )}
      </div>
    </main>
  );
}
