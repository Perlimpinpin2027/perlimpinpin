"use client";

import { useCallback, useState } from "react";
import ContactModal from "./ContactModal";

// Lien « Nous contacter » de la barre du bas du pied de page (déplacé depuis
// l'en-tête, oct. 2026). Le pied de page reste un composant serveur : seule
// cette petite partie est côté client, comme ManageCookiesButton.
export default function ContactFooterButton({ className }) {
  const [open, setOpen] = useState(false);
  // Identité stable : ContactModal l'a en dépendance de ses effets.
  const fermer = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Nous contacter
      </button>
      <ContactModal open={open} onClose={fermer} />
    </>
  );
}
