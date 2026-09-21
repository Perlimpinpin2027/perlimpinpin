"use client";

import { useState } from "react";
import { logout } from "./login/actions";

// Déconnexion : supprime le cookie de session (action serveur), puis charge la page de
// connexion par une navigation complète.
export default function LogoutButton({ className = "" }) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);
    try {
      await logout();
    } finally {
      window.location.assign("/live/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`text-xs text-zinc-400 underline-offset-2 transition-colors hover:text-zinc-700 hover:underline disabled:opacity-60 ${className}`}
    >
      {pending ? "Déconnexion…" : "Se déconnecter"}
    </button>
  );
}
