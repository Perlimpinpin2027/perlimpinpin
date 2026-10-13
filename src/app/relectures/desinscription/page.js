import Header from "@/components/Header";
import { CHEMIN_API, lireJeton } from "@/lib/desinscription-core";
import { buttonClass } from "../ui";

// Désinscription des appels à relecture (lien en bas des mails envoyés par
// scripts/relecture.js). Accessible sans être connecté (PAGES_PUBLIQUES dans
// relecture-auth-core.js) : le jeton signé du lien suffit.
//
// À l'ouverture (GET), AUCUNE écriture : certains logiciels de messagerie
// ouvrent les liens tout seuls. La désinscription n'a lieu qu'au clic sur le
// bouton (POST vers /api/relectures/desinscription, qui revient ici avec ?fait=1).

export const metadata = {
  title: "Désinscription — Club Perlimpinpin",
  robots: { index: false, follow: false },
};

function Cadre({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 sm:px-8">
        <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">Club Perlimpinpin</h1>
        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-sm leading-relaxed text-zinc-700">
          {children}
        </div>
      </main>
    </div>
  );
}

export default async function DesinscriptionPage({ searchParams }) {
  const { t, fait } = await searchParams;

  if (fait === "1") {
    return (
      <Cadre>
        <p>C&apos;est noté, vous ne recevrez plus ces mails. Vous restez adhérent du Club.</p>
      </Cadre>
    );
  }

  // Message neutre : on ne dit jamais si un compte existe.
  const jeton = typeof t === "string" ? t : "";
  if (!lireJeton({ secret: process.env.AUTH_SECRET, jeton })) {
    return (
      <Cadre>
        <p>Ce lien de désinscription n&apos;est pas valide. Utilisez le lien complet reçu en bas du mail.</p>
      </Cadre>
    );
  }

  return (
    <Cadre>
      <p>Vous ne souhaitez plus recevoir les appels à relecture des nouvelles fiches ?</p>
      <form method="post" action={`${CHEMIN_API}?t=${encodeURIComponent(jeton)}`} className="mt-5">
        <button type="submit" className={buttonClass}>
          Me désinscrire des appels à relecture
        </button>
      </form>
      <p className="mt-4 text-xs text-zinc-500">Vous resterez adhérent du Club, avec le même accès à /relectures.</p>
    </Cadre>
  );
}
