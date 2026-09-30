import Link from "next/link";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { PASSWORD_MIN_LENGTH } from "@/lib/live-password";
import { getAdherent } from "@/lib/relecture-auth";
import InscriptionForm from "./InscriptionForm";

export const metadata = {
  title: "Première connexion — Club Perlimpinpin",
  robots: { index: false, follow: false },
};

export default async function RelectureInscriptionPage() {
  if (await getAdherent()) redirect("/relectures");

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 sm:px-8">
        <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">Première connexion</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Adhérent de l&apos;association Perlimpinpin ? Choisissez votre mot de passe pour entrer dans le Club Perlimpinpin, avec l&apos;adresse e-mail donnée lors de votre
          adhésion.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <InscriptionForm minLength={PASSWORD_MIN_LENGTH} />
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Déjà un mot de passe ?{" "}
          <Link href="/relectures/connexion" className="font-medium text-zinc-900 underline underline-offset-2">
            Se connecter
          </Link>
        </p>
      </main>
    </div>
  );
}
