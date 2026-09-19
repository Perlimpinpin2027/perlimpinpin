"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getScoreBadge } from "@/lib/score";
import { liveThemeLabel } from "@/lib/live-themes";
import { ComingSoon, Icon } from "./ui";

const DECLARATION_MAX_LENGTH = 20000;

const PILIERS = { juridique: "juridique", budgetaire: "budgétaire", moyens_humains: "moyens humains" };

// Critères du barème (mêmes libellés et maximums que les fiches publiées).
function criteres(notation) {
  return [
    { label: "Opérationnalité & moyens", note: notation.operationnalite_moyens_total, max: 30 },
    { label: "Efficacité", note: notation.efficacite, max: 30 },
    { label: "Effets rebonds & externalités", note: notation.effets_rebonds_externalites, max: 20 },
    { label: "Degré de préparation", note: notation.degre_preparation, max: 10 },
    { label: "Alignement & logique", note: notation.alignement_logique, max: 10 },
  ];
}

function MesureCard({ mesure, index }) {
  const notation = mesure.notation_detaillee;
  const badge = getScoreBadge(notation.score_total);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-zinc-400">Mesure {index + 1}</p>
          <h3 className="mt-1 text-lg font-bold leading-snug text-zinc-900">{mesure.mesure_reformulee}</h3>
          <p className="mt-2 text-sm italic text-zinc-500">« {mesure.passage} »</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`text-3xl font-bold ${badge.scoreClass}`}>
            {notation.score_total}
            <span className="text-base font-normal text-zinc-400">/100</span>
          </p>
          <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.badgeClass}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-zinc-800">{mesure.verdict_court}</p>

      <dl className="mt-4 grid gap-3 text-sm leading-relaxed text-zinc-600 sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-zinc-800">Ce qui est établi</dt>
          <dd className="mt-0.5">{mesure.ce_qui_est_etabli}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-800">Ce qui est discutable</dt>
          <dd className="mt-0.5">{mesure.ce_qui_est_discutable}</dd>
        </div>
      </dl>

      <ul className="mt-5 flex flex-col gap-1.5">
        {criteres(notation).map((critere) => (
          <li key={critere.label} className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="w-52 shrink-0">{critere.label}</span>
            <span className="h-1.5 flex-1 rounded-full bg-zinc-100">
              <span
                className="block h-1.5 rounded-full bg-indigo-400"
                style={{ width: `${(critere.note / critere.max) * 100}%` }}
              />
            </span>
            <span className="w-10 shrink-0 text-right font-mono">
              {critere.note}/{critere.max}
            </span>
          </li>
        ))}
      </ul>
      {notation.plafond_applique && (
        <p className="mt-2 text-xs text-amber-700">
          Plafond appliqué à l&apos;opérationnalité (pilier {PILIERS[notation.plafond_declencheur]} fragile).
        </p>
      )}

      {mesure.points_a_verifier.length > 0 && (
        <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">À vérifier avant diffusion</p>
          <ul className="mt-1.5 list-disc pl-4 text-sm text-amber-900">
            {mesure.points_a_verifier.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

// Entrées prévues plus tard (fichier, URL, transcript) : affichées, inactives.
const FUTURE_INPUTS = [
  { icon: "file", label: "Fichier" },
  { icon: "link", label: "URL" },
  { icon: "transcript", label: "Transcript" },
];

export default function LiveAnalyzer({ candidats = [] }) {
  const router = useRouter();
  const [candidatId, setCandidatId] = useState("");
  const [declaration, setDeclaration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/live/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declaration, candidatId: candidatId ? Number(candidatId) : undefined }),
      });
      if (response.status === 401) {
        window.location.href = "/live/login";
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error ?? "L'analyse a échoué. Réessayez.");
        return;
      }
      setResult(data);
      // L'analyse est enregistrée côté serveur : recharge historique et cartes.
      router.refresh();
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="live-declaration" className="text-sm font-medium text-zinc-700">
              Déclaration du candidat
            </label>
            <div className="mt-1.5 flex flex-col gap-3 sm:flex-row">
            <textarea
              id="live-declaration"
              required
              rows={10}
              value={declaration}
              onChange={(event) => setDeclaration(event.target.value)}
              maxLength={DECLARATION_MAX_LENGTH}
              disabled={loading}
              placeholder="Collez ou tapez la déclaration à analyser…"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
            />
            <div className="flex shrink-0 flex-row gap-2 sm:flex-col">
              {FUTURE_INPUTS.map((input) => (
                <ComingSoon key={input.label}>
                  <button
                    type="button"
                    disabled
                    className="flex w-full cursor-not-allowed items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-400"
                  >
                    <Icon name={input.icon} className="h-4 w-4" />
                    {input.label}
                  </button>
                </ComingSoon>
              ))}
            </div>
            </div>
          </div>

          <div>
            <label htmlFor="live-candidat" className="text-sm font-medium text-zinc-700">
              Candidat <span className="font-normal text-zinc-400">(facultatif)</span>
            </label>
            <select
              id="live-candidat"
              value={candidatId}
              onChange={(event) => setCandidatId(event.target.value)}
              disabled={loading}
              className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60 sm:w-72"
            >
              <option value="">Non précisé</option>
              {candidats.map((candidat) => (
                <option key={candidat.id} value={candidat.id}>
                  {candidat.nom}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={loading || declaration.trim().length < 20}
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? "Analyse en cours…" : "Analyser"}
            </button>
            {loading && <p className="text-sm text-zinc-500">Comptez 20 à 60 secondes.</p>}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        </form>
      </div>

      {result && (
        <section className="mt-8 flex flex-col gap-4" aria-live="polite">
          <p className="rounded-lg border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-600">
            <strong className="text-zinc-800">Estimation préliminaire.</strong>{" "}
            Réalisée sans recherche externe, à partir
            de la seule déclaration : à vérifier avant toute diffusion. Elle est enregistrée dans l&apos;historique de l&apos;équipe.
            {result.mesures.length > 0 && <> Dossier : <strong className="text-zinc-800">{liveThemeLabel(result.theme)}</strong>.</>}
          </p>

          {result.mesures.length === 0 && (
            <p className="text-sm text-zinc-600">Aucune mesure analysable dans cette déclaration.</p>
          )}
          {result.mesures.map((mesure, index) => (
            <MesureCard key={index} mesure={mesure} index={index} />
          ))}

          {result.remarque && <p className="text-sm text-zinc-500">{result.remarque}</p>}

          {result.avertissements.length > 0 && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-semibold">Incohérence de calcul détectée dans la réponse du modèle</p>
              <ul className="mt-1 list-disc pl-4">
                {result.avertissements.map((avertissement) => (
                  <li key={avertissement}>{avertissement}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </>
  );
}
