"use client";

import { reopenConsentBanner } from "@/lib/cookieConsent";

// Seule partie interactive du footer (qui reste un composant serveur) :
// efface le choix enregistré et rouvre le bandeau de consentement.
export default function ManageCookiesButton({ className }) {
  return (
    <button type="button" onClick={reopenConsentBanner} className={className}>
      Gérer les cookies
    </button>
  );
}
