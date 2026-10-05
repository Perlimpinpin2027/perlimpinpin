import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdherent } from "@/lib/relecture-auth";
import ClubShell from "../ClubShell";
import ConnexionForm from "./ConnexionForm";

export const metadata = {
  title: "Connexion — Club Perlimpinpin",
  robots: { index: false, follow: false },
};

export default async function RelectureConnexionPage() {
  // Déjà connecté : pas de formulaire, on va directement au Club
  if (await getAdherent()) redirect("/relectures");

  return (
    <ClubShell
      titre="Connexion"
      intro="Espace réservé aux adhérents de l'association Perlimpinpin."
      basDePage={
        <>
          Première connexion ?{" "}
          <Link href="/relectures/inscription" className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900">
            Créer mon mot de passe
          </Link>
        </>
      }
    >
      <ConnexionForm />
    </ClubShell>
  );
}
