import Header from "@/components/Header";
import MonoTag from "@/components/MonoTag";
import CandidatsGrille from "@/components/CandidatsGrille";
import { getScoresCandidats } from "@/lib/queries";
import { getAllParcours } from "@/lib/parcours";

// ISR : servie depuis le cache du CDN, recalculée au plus toutes les 5 minutes.
export const revalidate = 300;

export const metadata = {
  title: "Les candidats | Perlimpinpin",
  description:
    "Le niveau moyen de solidité des propositions de chaque candidat à la présidentielle 2027, selon la méthode Perlimpinpin.",
};

export default async function CandidatsPage() {
  // Un candidat par entrée de data/candidats-parcours.json, rattaché à la base
  // par son nom complet. Recherche et tri : dans le navigateur
  // (CandidatsGrille), sur ces données, sans nouvelle requête.
  const scores = await getScoresCandidats();
  const cartes = getAllParcours().map((parcours) => ({
    parcours,
    score: scores.get(`${parcours.prenom} ${parcours.nom}`) ?? null,
  }));

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div>
            <MonoTag>Candidats</MonoTag>
            {/* text-3xl/sm:text-4xl (30-36px) mesuré trop petit sur la
                maquette 456 : le "L" de "Les candidats" y fait ~41px de
                capitale pour un rendu ~1604px de large, soit un corps
                ~57px — plus petit que les gros titres héros (accueil, À
                propos, Thèmes) mais tout de même nettement au-dessus de
                sm:text-4xl. Paragraphe aussi élargi (text-sm → text-base),
                la maquette le montre à la même taille que le corps de texte
                courant du site, pas en petit texte secondaire. */}
            <h1 className="mt-2 text-[clamp(1.875rem,1.2rem+2.6vw,3.75rem)] font-extrabold tracking-tight text-zinc-900">
              Les candidats
            </h1>
            <p className="mt-2 max-w-xl text-base text-zinc-500">
              Découvrez les déclarations analysées et leur niveau moyen de
              solidité selon la méthode Perlimpinpin.
            </p>
          </div>

          <CandidatsGrille cartes={cartes} />

          <p className="border-t border-zinc-200 pt-6 text-xs leading-relaxed text-zinc-400">
            Ce score est une moyenne arithmétique des mesures actuellement
            analysées par l&rsquo;outil. Il ne constitue ni un jugement sur la
            personne, ni un indice général de crédibilité politique, et
            évolue au fur et à mesure des analyses.
          </p>
        </div>
      </main>
    </div>
  );
}
