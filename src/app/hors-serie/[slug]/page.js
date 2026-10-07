import { permanentRedirect } from "next/navigation";

// Ancienne adresse des dossiers (/hors-serie/[slug]), renommés « dossiers »
// en octobre 2026 : redirection permanente vers /dossiers/[slug], pour que
// les liens déjà partagés continuent de fonctionner.
export default async function AncienneAdresseDossier({ params }) {
  const { slug } = await params;
  permanentRedirect(`/dossiers/${slug}`);
}
