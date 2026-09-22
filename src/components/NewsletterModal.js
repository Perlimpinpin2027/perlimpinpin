"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ArrowRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export default function NewsletterModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  // Honeypot : champ caché aux humains, rempli seulement par les bots qui
  // remplissent tous les champs du formulaire sans lire le CSS.
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | success | already | error
  const [fieldError, setFieldError] = useState("");
  const dialogRef = useRef(null);

  // Verrouille le défilement de la page pendant que la modale est ouverte.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Ferme sur Échap et piège le focus (Tab/Shift+Tab) à l'intérieur de la modale.
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Place le focus dans la modale à l'ouverture.
  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const firstField = dialogRef.current.querySelector("input");
    firstField?.focus();
  }, [open]);

  // Réinitialise le formulaire dès que la modale se ferme.
  useEffect(() => {
    if (open) return;
    setStatus("idle");
    setEmail("");
    setConsent(false);
    setWebsite("");
    setFieldError("");
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event) {
    event.preventDefault();
    setFieldError("");

    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setFieldError("Merci de renseigner une adresse e-mail valide.");
      return;
    }
    if (!consent) {
      setFieldError("Merci d'accepter la politique de confidentialité pour vous inscrire.");
      return;
    }

    setSubmitting(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, consent, website }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setStatus(data?.alreadySubscribed ? "already" : "success");
    } catch {
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  const showForm = status !== "success" && status !== "already";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" aria-hidden="true" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-modal-title"
        className="relative w-full max-w-lg rounded-[2rem] border-2 border-zinc-900 bg-[#fdfbf9] px-6 py-10 text-center shadow-xl sm:px-10 sm:py-12"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
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

        <p className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          <span className="h-px w-6 bg-zinc-300" aria-hidden="true" />
          Restez informé
          <span className="h-px w-6 bg-zinc-300" aria-hidden="true" />
        </p>

        <h2 id="newsletter-modal-title" className="mt-4 font-serif text-3xl font-bold text-zinc-900 sm:text-4xl">
          Recevez la <span className="font-normal text-zinc-400">newsletter</span>
        </h2>

        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-zinc-600">
          Analyses, nouvelles déclarations et coulisses de Perlimpinpin, directement dans votre boîte mail.
        </p>

        {status === "success" ? (
          <p className="mt-8 text-sm font-medium text-zinc-700">Merci, vous êtes inscrit·e !</p>
        ) : status === "already" ? (
          <p className="mt-8 text-sm font-medium text-zinc-700">
            Cette adresse est déjà inscrite à la newsletter.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
            {/* Honeypot : caché visuellement et aux lecteurs d'écran, jamais rempli par un humain. */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="newsletter-website">Site web</label>
              <input
                id="newsletter-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 rounded-full border-2 border-zinc-900 bg-white p-1.5 pl-5">
              <label htmlFor="newsletter-email" className="sr-only">
                Votre adresse e-mail
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="Votre adresse e-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={submitting}
                className="flex shrink-0 items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Envoi…" : "S'inscrire"}
                <ArrowRightIcon />
              </button>
            </div>

            <label className="flex items-start gap-2 text-left text-xs leading-relaxed text-zinc-500">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                aria-label="J'accepte de recevoir les communications de Perlimpinpin et confirme avoir lu et accepté la politique de confidentialité."
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-zinc-900 focus:ring-2 focus:ring-blue-200"
              />
              <span>
                J&apos;accepte de recevoir les communications de Perlimpinpin et confirme avoir lu et accepté
                la{" "}
                <Link
                  href="/confidentialite"
                  className="text-zinc-700 underline underline-offset-2 transition-colors hover:text-zinc-950"
                >
                  politique de confidentialité
                </Link>
                .
              </span>
            </label>

            {fieldError ? <p className="text-xs text-red-600">{fieldError}</p> : null}
            {status === "error" ? (
              <p className="text-xs text-red-600">
                Une erreur est survenue, votre inscription n&apos;a pas pu être prise en compte. Réessayez.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
