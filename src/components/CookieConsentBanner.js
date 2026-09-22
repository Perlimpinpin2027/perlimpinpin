"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  getStoredConsent,
  storeConsent,
  REOPEN_CONSENT_EVENT,
} from "@/lib/cookieConsent";

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);
  const panelRef = useRef(null);

  useEffect(() => {
    function checkConsent() {
      if (!getStoredConsent()) setVisible(true);
    }
    checkConsent();
  }, []);

  // Permet de rouvrir le bandeau après coup (ex. futur lien "Gérer les
  // cookies" une fois le footer construit) sans recharger la page.
  useEffect(() => {
    function handleReopen() {
      setShowDetails(false);
      setAnalyticsAllowed(true);
      setVisible(true);
    }
    window.addEventListener(REOPEN_CONSENT_EVENT, handleReopen);
    return () => window.removeEventListener(REOPEN_CONSENT_EVENT, handleReopen);
  }, []);

  // Porte le focus sur le bandeau à son apparition, sans piéger le focus
  // (ce n'est pas une modale bloquante) : la page reste utilisable derrière.
  useEffect(() => {
    if (visible) panelRef.current?.focus();
  }, [visible]);

  if (!visible) return null;

  function acceptAll() {
    storeConsent({ analytics: true });
    setVisible(false);
  }

  function refuseAll() {
    storeConsent({ analytics: false });
    setVisible(false);
  }

  function saveChoices() {
    storeConsent({ analytics: analyticsAllowed });
    setVisible(false);
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      tabIndex={-1}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-zinc-800 bg-zinc-950 px-4 py-5 text-zinc-100 shadow-[0_-8px_30px_rgb(0_0_0/0.25)] focus:outline-none sm:px-8 sm:py-6"
    >
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
        <div>
          <h2 id="cookie-consent-title" className="text-sm font-semibold text-white">
            Respect de votre vie privée
          </h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-zinc-400">
            Nous utilisons des cookies de mesure d&apos;audience pour
            comprendre comment le site est utilisé. Vous pouvez tout
            accepter, tout refuser, ou personnaliser votre choix. Consultez
            notre{" "}
            <Link
              href="/confidentialite"
              className="underline underline-offset-2 hover:text-white"
            >
              politique de confidentialité
            </Link>{" "}
            pour en savoir plus.
          </p>
        </div>

        {showDetails ? (
          <div className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <label className="flex items-start gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={analyticsAllowed}
                onChange={(event) => setAnalyticsAllowed(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-600 bg-zinc-800 accent-white"
              />
              <span>
                <span className="font-medium text-white">Mesure d&apos;audience</span>
                <br />
                Statistiques de visite anonymisées (Vercel Analytics, Speed
                Insights).
              </span>
            </label>
            <p className="text-xs text-zinc-500">
              Cookies strictement nécessaires : toujours actifs, indispensables
              au fonctionnement du site.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => setShowDetails((current) => !current)}
            className="text-sm font-medium text-zinc-400 underline underline-offset-2 transition-colors hover:text-white sm:mr-auto"
          >
            {showDetails ? "Retour" : "Personnaliser"}
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            {showDetails ? (
              <button
                type="button"
                onClick={saveChoices}
                className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
              >
                Enregistrer mes choix
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={refuseAll}
                  className="inline-flex items-center justify-center rounded-full border border-zinc-600 bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
                >
                  Tout refuser
                </button>
                <button
                  type="button"
                  onClick={acceptAll}
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-200"
                >
                  Tout accepter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
