import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getAdherent } from "@/lib/relecture-auth";
import ConnexionForm from "./ConnexionForm";

export const metadata = {
  title: "Connexion — Club Perlimpinpin",
  robots: { index: false, follow: false },
};

export default async function RelectureConnexionPage() {
  // Déjà connecté : pas de formulaire, on va directement au Club
  if (await getAdherent()) redirect("/relectures");

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header club />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 sm:px-8">
        <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">Club Perlimpinpin</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Espace réservé aux adhérents de l&apos;association Perlimpinpin.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <ConnexionForm />
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Première connexion ?{" "}
          <Link href="/relectures/inscription" className="font-medium text-zinc-900 underline underline-offset-2">
            Créer mon mot de passe
          </Link>
        </p>
      </main>
    </div>
  );
}
