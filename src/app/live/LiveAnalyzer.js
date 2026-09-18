"use client";

import { useState } from "react";

const DECLARATION_MAX_LENGTH = 20000;

export default function LiveAnalyzer() {
  const [declaration, setDeclaration] = useState("");
  const [message, setMessage] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    // Phase 1 : aucun appel d'analyse, uniquement la validation du formulaire.
    setMessage("Analyse à venir — Phase 2");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="live-declaration" className="text-sm font-medium text-zinc-700">
          Déclaration du candidat
        </label>
        <textarea
          id="live-declaration"
          required
          rows={10}
          value={declaration}
          onChange={(event) => setDeclaration(event.target.value)}
          maxLength={DECLARATION_MAX_LENGTH}
          placeholder="Collez ou tapez la déclaration à analyser…"
          className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!declaration.trim()}
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Analyser
        </button>
        {message && (
          <p role="status" className="text-sm text-zinc-600">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
