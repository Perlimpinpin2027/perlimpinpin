"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TEXTE_SITE_MAX, normaliserTexteSite, validerTexteSite } from "@/lib/textes-site";
import { enregistrerTexteSite, reinitialiserTexteSite } from "./actions";

// Un texte modifiable de la page : un champ, « Enregistrer » et, si le texte a
// déjà été modifié, « Revenir au texte par défaut ». Le vrai contrôle d'accès
// est dans les actions serveur.
// Après chaque enregistrement, la page se recharge et ce composant est recréé
// (sa clé contient la version) : il repart donc toujours du texte en base.
export default function ChampTexte({ page, cle, libelle, defaut, valeurEnregistree, version }) {
  const router = useRouter();
  const valeurActuelle = valeurEnregistree ?? defaut;
  const modifie = valeurEnregistree !== null;

  const [texte, setTexte] = useState(valeurActuelle);
  const [message, setMessage] = useState(null); // { type: "erreur" | "info", texte }
  const [enCours, startTransition] = useTransition();

  const propre = normaliserTexteSite(texte);
  const controle = validerTexteSite(propre);
  const inchange = propre === normaliserTexteSite(valeurActuelle);
  const lignes = Math.max(2, texte.split("\n").length + 1);

  function traiter(resultat) {
    if (!resultat?.ok || resultat.simulation) {
      setMessage({
        type: resultat?.ok ? "info" : "erreur",
        texte: resultat?.message ?? "L'opération a échoué. Réessaie.",
      });
      return;
    }
    setMessage(null);
    router.refresh();
  }

  function enregistrer() {
    if (enCours || !controle.ok || inchange) return;
    setMessage(null);
    startTransition(async () => {
      traiter(await enregistrerTexteSite({ page, cle, valeur: texte, versionAttendue: version }));
    });
  }

  function reinitialiser() {
    if (enCours || !modifie) return;
    setMessage(null);
    startTransition(async () => {
      traiter(await reinitialiserTexteSite({ page, cle, versionAttendue: version }));
    });
  }

  function surTouche(evenement) {
    if (evenement.key === "Enter" && (evenement.ctrlKey || evenement.metaKey)) {
      evenement.preventDefault();
      enregistrer();
    }
  }

  const idChamp = `texte-${cle}`;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={idChamp} className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {libelle}
        </label>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            modifie ? "bg-blue-100 text-blue-800" : "bg-zinc-100 text-zinc-500"
          }`}
        >
          {modifie ? "Modifié" : "Texte par défaut"}
        </span>
      </div>

      <textarea
        id={idChamp}
        value={texte}
        onChange={(evenement) => setTexte(evenement.target.value)}
        onKeyDown={surTouche}
        disabled={enCours}
        rows={lignes}
        className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base leading-relaxed text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className={propre.length > TEXTE_SITE_MAX ? "font-semibold text-red-700" : ""}>
          {propre.length} / {TEXTE_SITE_MAX} caractères · une ligne = un paragraphe
        </span>
        <span>Ctrl/Cmd + Entrée pour enregistrer</span>
      </div>

      {!controle.ok ? <p className="text-xs font-semibold text-red-700">{controle.message}</p> : null}
      {message ? (
        <p
          role={message.type === "erreur" ? "alert" : "status"}
          className={`text-sm font-semibold ${message.type === "erreur" ? "text-red-700" : "text-emerald-800"}`}
        >
          {message.texte}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={enregistrer}
          disabled={enCours || !controle.ok || inchange}
          className="rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enCours ? "Envoi…" : "Enregistrer"}
        </button>
        {!inchange ? (
          <button
            type="button"
            onClick={() => {
              setTexte(valeurActuelle);
              setMessage(null);
            }}
            disabled={enCours}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
          >
            Annuler mes changements
          </button>
        ) : null}
        {modifie ? (
          <button
            type="button"
            onClick={reinitialiser}
            disabled={enCours}
            className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40"
          >
            Revenir au texte par défaut
          </button>
        ) : null}
      </div>
    </div>
  );
}
