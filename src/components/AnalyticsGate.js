"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { getStoredConsent, CONSENT_CHANGED_EVENT } from "@/lib/cookieConsent";

// Ne monte Vercel Analytics / Speed Insights (les seuls scripts non
// essentiels du site) qu'après consentement explicite à la catégorie
// "analytics" — tant qu'aucun choix n'est enregistré, ou en cas de refus,
// rien n'est chargé.
export default function AnalyticsGate() {
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    function checkConsent() {
      setAnalyticsAllowed(getStoredConsent()?.categories?.analytics === true);
    }
    checkConsent();

    function handleChange(event) {
      setAnalyticsAllowed(event.detail?.categories?.analytics === true);
    }
    window.addEventListener(CONSENT_CHANGED_EVENT, handleChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, handleChange);
  }, []);

  if (!analyticsAllowed) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
