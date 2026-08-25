"use client";

import { useEffect, useState } from "react";

const MESSAGE_MAX_LENGTH = 2000;
// Laisse le temps de lire la confirmation avant fermeture automatique.
const AUTO_CLOSE_DELAY_MS = 3000;

export default function ContactModal({ open, onClose }) {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | success | error

  // Verrouille le défilement de la page pendant que la modale est ouverte.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Ferme sur Échap.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Fermeture automatique après confirmation. Dépend de `open`, pas
  // seulement de `status` : le composant reste monté quand la modale se
  // ferme (Header ne fait que basculer la prop), donc sans cette
  // dépendance, un minuteur programmé lors d'un envoi précédent survivrait
  // à une fermeture manuelle et pourrait refermer une modale rouverte
  // entre-temps pour un tout autre message.
  useEffect(() => {
    if (!open || status !== "success") return;
    const timer = setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [open, status, onClose]);

  // Réinitialise le formulaire dès que la modale se ferme, quelle qu'en
  // soit la cause (bouton, fond, Échap, ou fermeture automatique
  // ci-dessus) — un seul endroit responsable de la remise à zéro, plutôt
  // que dupliquer la logique à chaque déclencheur de fermeture.
  useEffect(() => {
    if (open) return;
    setStatus("idle");
    setNom("");
    setEmail("");
    setMessage("");
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || trimmedMessage.length > MESSAGE_MAX_LENGTH) return;

    setSubmitting(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nom.trim(), email: email.trim(), message: trimmedMessage }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  // La remise à zéro du formulaire à la fermeture est centralisée dans
  // l'effet ci-dessus (dépendant de `open`) — ce gestionnaire n'a donc plus
  // qu'à déclencher la fermeture elle-même.
  const handleClose = onClose;

  const messageTooLong = message.length > MESSAGE_MAX_LENGTH;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" onClick={handleClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-modal-title"
        className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl sm:p-8"
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <h2 id="contact-modal-title" className="pr-8 font-serif text-xl font-bold text-zinc-900">
          Une question, une suggestion ?
        </h2>

        {status === "success" ? (
          <p className="mt-4 text-sm leading-relaxed text-zinc-700">
            Merci, votre message a bien été transmis.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
            <div>
              <label htmlFor="contact-nom" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nom (optionnel)
              </label>
              <input
                id="contact-nom"
                type="text"
                value={nom}
                onChange={(event) => setNom(event.target.value)}
                maxLength={200}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="contact-email" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Email (optionnel, utile si vous souhaitez une réponse)
              </label>
              <input
                id="contact-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={320}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div>
              <label htmlFor="contact-message" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Message
              </label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={MESSAGE_MAX_LENGTH}
                className="mt-1.5 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className={`mt-1 text-right text-xs ${messageTooLong ? "text-red-600" : "text-zinc-400"}`}>
                {message.length}/{MESSAGE_MAX_LENGTH}
              </p>
            </div>

            {status === "error" ? (
              <p className="text-xs text-red-600">
                Une erreur est survenue, votre message n&apos;a pas pu être envoyé. Réessayez.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting || !message.trim() || messageTooLong}
              className="mt-1 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
