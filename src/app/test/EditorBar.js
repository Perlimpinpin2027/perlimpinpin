"use client";

import { useActionState, useState } from "react";
import { deverrouiller, verrouiller } from "./actions";

// Barre du « mode édition » de /test. Le serveur décide de l'afficher (seulement si
// le code d'édition est configuré) et dit si la personne est déjà déverrouillée.
// Ici on ne fait que l'interface : le vrai contrôle est dans les actions serveur.
export default function EditorBar({ editeur }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, formAction, enCours] = useActionState(deverrouiller, null);

  if (editeur) {
    return (
      <form action={verrouiller} className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
          Mode édition activé
        </span>
        <button
          type="submit"
          className="text-xs font-semibold underline underline-offset-2 transition-opacity hover:opacity-70"
        >
          Se verrouiller
        </button>
      </form>
    );
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="text-xs font-medium underline underline-offset-2 opacity-70 transition-opacity hover:opacity-100"
      >
        Mode édition
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <label htmlFor="test-edit-code" className="sr-only">
        Code d&rsquo;édition
      </label>
      <input
        id="test-edit-code"
        name="code"
        type="password"
        required
        autoFocus
        autoComplete="off"
        placeholder="Code d'édition"
        className="w-48 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      <button
        type="submit"
        disabled={enCours}
        className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enCours ? "Vérification…" : "Déverrouiller"}
      </button>
      {etat?.ok === false ? (
        <p role="alert" className="text-xs font-semibold text-red-700">
          {etat.message}
        </p>
      ) : null}
    </form>
  );
}
