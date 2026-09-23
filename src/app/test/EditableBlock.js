"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { normaliserTexte, resoudreChamp, validerTexte } from "@/lib/test-edition";
import { enregistrerTexte } from "./actions";

// Petit crayon de modification d'un texte de la fiche (réservé au mode édition :
// la fiche n'utilise ce composant que pour un éditeur, jamais sur le site public).
// Au repos, il montre le rendu normal (`children`, fait côté serveur) et un crayon.
// Au clic, il le remplace par un champ pré-rempli avec le texte brut.
// Le vrai contrôle d'accès est dans l'action serveur enregistrerTexte.
export default function EditableBlock({
  champ,
  valeurBrute,
  analyseId,
  versionAttendue,
  libelle,
  children,
}) {
  const router = useRouter();
  const regles = resoudreChamp(champ).regles;
  const multiligne = regles.multiligne;

  const [edition, setEdition] = useState(false);
  const [texte, setTexte] = useState(valeurBrute);
  const [message, setMessage] = useState(null); // { type: "erreur" | "info", texte }
  const [enregistre, setEnregistre] = useState(false);
  const [enCours, startTransition] = useTransition();
  const champRef = useRef(null);

  // Version du brouillon que CETTE page a vue. Elle est partagée par tous les
  // blocs de la fiche : quand un autre bloc enregistre puis que la page se
  // rafraîchit, la prop change et on s'aligne dessus (sinon on serait en conflit
  // avec nous-mêmes). Après notre propre enregistrement, on prend tout de suite
  // la version renvoyée par le serveur.
  const [version, setVersion] = useState(versionAttendue);
  const [versionPropPrecedente, setVersionPropPrecedente] = useState(versionAttendue);
  if (versionAttendue !== versionPropPrecedente) {
    setVersionPropPrecedente(versionAttendue);
    setVersion(versionAttendue);
  }

  // « Enregistré ✓ » pendant 3 secondes.
  useEffect(() => {
    if (!enregistre) return undefined;
    const minuteur = setTimeout(() => setEnregistre(false), 3000);
    return () => clearTimeout(minuteur);
  }, [enregistre]);

  // Un champ désactivé pendant l'envoi perd le focus : on le lui rend une fois
  // l'envoi terminé (sinon Échap et Ctrl+Entrée ne seraient plus reçus).
  useEffect(() => {
    if (edition && !enCours) champRef.current?.focus();
  }, [edition, enCours]);

  // La zone de texte (résumé, verdict…) grandit avec son contenu.
  useEffect(() => {
    const zone = champRef.current;
    if (!edition || !multiligne || !zone) return;
    zone.style.height = "auto";
    zone.style.height = `${zone.scrollHeight}px`;
  }, [edition, multiligne, texte]);

  const controle = validerTexte(champ, texte);
  const inchange = normaliserTexte(texte) === normaliserTexte(valeurBrute);
  const longueur = normaliserTexte(texte).length;

  function ouvrir() {
    setTexte(valeurBrute);
    setMessage(null);
    setEnregistre(false);
    setEdition(true);
  }

  function annuler() {
    if (enCours) return;
    setEdition(false);
    setMessage(null);
  }

  function enregistrer() {
    if (enCours || !controle.ok || inchange) return;
    setMessage(null);
    startTransition(async () => {
      const resultat = await enregistrerTexte({ analyseId, champ, valeur: texte, versionAttendue: version });

      // Refus, conflit ou simulation : on reste dans le champ, le texte saisi est conservé.
      if (!resultat?.ok || resultat.simulation) {
        setMessage({
          type: resultat?.ok ? "info" : "erreur",
          texte: resultat?.message ?? "L'enregistrement a échoué. Réessaie.",
        });
        return;
      }

      // Succès : on retient la nouvelle version (pour enchaîner plusieurs
      // modifications), on referme le champ et on recharge la fiche.
      setVersion(resultat.versionSuivante);
      setEdition(false);
      setMessage(null);
      setEnregistre(true);
      router.refresh();
    });
  }

  function surTouche(evenement) {
    if (evenement.key === "Escape") {
      evenement.preventDefault();
      annuler();
    } else if (evenement.key === "Enter" && (evenement.ctrlKey || evenement.metaKey)) {
      evenement.preventDefault();
      enregistrer();
    }
  }

  if (!edition) {
    return (
      <div className="relative">
        {children}
        {enregistre ? (
          <span
            role="status"
            className="absolute right-11 top-2 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
          >
            Enregistré ✓
          </span>
        ) : null}
        <button
          type="button"
          onClick={ouvrir}
          aria-label="Modifier ce texte"
          title="Modifier ce texte"
          className="absolute right-2 top-2 rounded-full border border-zinc-300 bg-white/90 p-1.5 text-zinc-600 shadow-sm transition-colors hover:bg-white hover:text-zinc-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </button>
      </div>
    );
  }

  const idChamp = `edition-${champ}`;
  const classesChamp =
    "mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60";

  return (
    <div
      onKeyDown={surTouche}
      className="flex flex-col gap-2 rounded-2xl border border-zinc-300 bg-white p-4 sm:p-5"
    >
      <label htmlFor={idChamp} className="text-xs font-bold uppercase tracking-widest text-zinc-500">
        {libelle ?? regles.libelle}
      </label>

      {multiligne ? (
        <textarea
          id={idChamp}
          ref={champRef}
          value={texte}
          onChange={(evenement) => setTexte(evenement.target.value)}
          disabled={enCours}
          autoFocus
          rows={6}
          className={`${classesChamp} resize-none overflow-hidden text-base leading-relaxed`}
        />
      ) : (
        <input
          id={idChamp}
          ref={champRef}
          type="text"
          value={texte}
          onChange={(evenement) => setTexte(evenement.target.value)}
          disabled={enCours}
          autoFocus
          className={`${classesChamp} text-lg font-semibold`}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-zinc-500">
        <span className={longueur < regles.min || longueur > regles.max ? "font-semibold text-red-700" : ""}>
          {longueur} / {regles.max} caractères
        </span>
        <span>Échap pour annuler · Ctrl/Cmd + Entrée pour enregistrer</span>
      </div>

      {regles.aide ? <p className="text-xs text-zinc-500">{regles.aide}</p> : null}
      {champ === "titre_fiche" && longueur > 80 ? (
        <p className="text-xs text-zinc-500">Sur les cartes du site, le titre sera coupé à 80 caractères.</p>
      ) : null}

      {!controle.ok && texte.trim().length > 0 ? (
        <p className="text-xs font-semibold text-red-700">{controle.message}</p>
      ) : null}
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
        <button
          type="button"
          onClick={annuler}
          disabled={enCours}
          className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
