import Header from "@/components/Header";
import MonoTag from "@/components/MonoTag";

export const metadata = {
  title: "Objectifs de référence — Perlimpinpin",
  description:
    "Nos objectifs de référence par thématique, utilisés pour comparer chaque mesure à un repère neutre.",
};

// Stub minimal : la page complète (un objectif de référence par
// thématique, sourcé) n'existe pas encore — voir le lien depuis /methode,
// étape "Comparer à un repère neutre" (MethodeAnalysisSteps). Même
// squelette que les autres pages de premier niveau du site (Tag + h1 + un
// paragraphe), pour rester cohérent visuellement en attendant le contenu.
export default function ObjectifsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto w-full max-w-3xl">
          <MonoTag>Objectifs de référence</MonoTag>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            Bientôt disponible
          </h1>

          <p className="mt-6 text-base leading-relaxed text-zinc-600">
            Cette page réunira, thématique par thématique, les objectifs de
            référence — juridiques, budgétaires ou issus de la recherche —
            auxquels nous comparons chaque mesure analysée, indépendamment
            du cadrage choisi par chaque candidat (voir notre{" "}
            <a
              href="/methode"
              className="font-semibold text-blue-600 transition-colors hover:text-blue-800"
            >
              méthode
            </a>
            ). Elle est en cours de rédaction.
          </p>
        </div>
      </main>
    </div>
  );
}
