"use client";

import { useRef, useState } from "react";
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

// Entrée prévue plus tard : affichée, inactive.
const FUTURE_INPUTS = [{ icon: "transcript", label: "Transcript" }];

// Fichiers acceptés pour « Fichier » (le serveur revérifie type et contenu).
const FILE_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const FILE_EXTENSIONS = ["pdf", "docx", "txt"];
// 4 Mo : les fonctions Vercel refusent les requêtes de plus de 4,5 Mo.
const FILE_MAX_BYTES = 4 * 1024 * 1024;

const SOURCE_BUTTON_CLASS =
  "flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50";

export default function LiveAnalyzer({ candidats = [] }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [candidatId, setCandidatId] = useState("");
  const [declaration, setDeclaration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Récupération de texte depuis un fichier ou une URL (Phase 5a)
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [extracting, setExtracting] = useState(null); // "fichier" | "url" | null
  const [sourceError, setSourceError] = useState(null);
  const [sourceNotice, setSourceNotice] = useState(null);
  const [pendingSource, setPendingSource] = useState(null); // texte en attente de confirmation

  // Place le texte extrait dans le textarea ; demande confirmation s'il
  // contenait déjà quelque chose.
  function applyExtraction({ texte, tronque, origine }) {
    const notice = tronque
      ? `Texte tronqué aux ${DECLARATION_MAX_LENGTH.toLocaleString("fr-FR")} premiers caractères (limite d'analyse). Relisez-le avant d'analyser.`
      : "Texte récupéré : relisez-le et corrigez-le si besoin avant d'analyser.";
    if (declaration.trim().length > 0) {
      setPendingSource({ texte, notice, origine });
      return;
    }
    setDeclaration(texte);
    setSourceNotice(notice);
  }

  async function handleExtractResponse(response, origine) {
    if (response.status === 401) {
      window.location.href = "/live/login";
      return;
    }
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      setSourceError(
        data?.error ??
          (response.status === 413
            ? "Ce fichier est trop volumineux (4 Mo maximum)."
            : "Impossible de récupérer le texte. Réessayez."),
      );
      return;
    }
    applyExtraction({ texte: data.texte, tronque: data.tronque, origine });
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permet de re-sélectionner le même fichier
    if (!file) return;
    setSourceError(null);
    setSourceNotice(null);
    setPendingSource(null);

    const extension = file.name.split(".").pop().toLowerCase();
    if (!FILE_EXTENSIONS.includes(extension)) {
      setSourceError(
        extension === "doc"
          ? "Le format Word ancien (.doc) n'est pas pris en charge : enregistrez le document en .docx."
          : "Type de fichier non pris en charge. Formats acceptés : PDF, DOCX ou TXT.",
      );
      return;
    }
    if (file.size > FILE_MAX_BYTES) {
      setSourceError("Ce fichier est trop volumineux (4 Mo maximum).");
      return;
    }

    setExtracting("fichier");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/live/extract/file", { method: "POST", body });
      await handleExtractResponse(response, file.name);
    } catch {
      setSourceError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setExtracting(null);
    }
  }

  async function handleUrlFetch() {
    const url = urlValue.trim();
    if (!url) return;
    setSourceError(null);
    setSourceNotice(null);
    setPendingSource(null);
    setExtracting("url");
    try {
      const response = await fetch("/api/live/extract/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      await handleExtractResponse(response, url);
    } catch {
      setSourceError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setExtracting(null);
    }
  }

  function confirmReplace() {
    setDeclaration(pendingSource.texte);
    setSourceNotice(pendingSource.notice);
    setPendingSource(null);
  }

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
              <input
                ref={fileInputRef}
                type="file"
                accept={FILE_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
                aria-label="Choisir un fichier PDF, DOCX ou TXT"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || extracting !== null}
                title="PDF, DOCX ou TXT, 4 Mo maximum"
                className={SOURCE_BUTTON_CLASS}
              >
                <Icon name="file" className="h-4 w-4" />
                {extracting === "fichier" ? "Lecture…" : "Fichier"}
              </button>
              <button
                type="button"
                onClick={() => setUrlOpen((open) => !open)}
                aria-expanded={urlOpen}
                disabled={loading || extracting !== null}
                className={`${SOURCE_BUTTON_CLASS} ${urlOpen ? "!border-zinc-400 !bg-zinc-100" : ""}`}
              >
                <Icon name="link" className="h-4 w-4" />
                URL
              </button>
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

            {urlOpen && (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  value={urlValue}
                  onChange={(event) => setUrlValue(event.target.value)}
                  onKeyDown={(event) => {
                    // Entrée récupère l'article, sans soumettre l'analyse
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleUrlFetch();
                    }
                  }}
                  disabled={loading || extracting !== null}
                  placeholder="https://www.exemple.fr/article"
                  aria-label="Adresse de l'article à récupérer"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={handleUrlFetch}
                  disabled={loading || extracting !== null || urlValue.trim().length === 0}
                  className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {extracting === "url" ? "Récupération…" : "Récupérer"}
                </button>
              </div>
            )}

            {pendingSource && (
              <div role="alertdialog" aria-label="Remplacer le texte actuel" className="mt-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p>
                  Le champ contient déjà du texte. Le remplacer par le contenu de{" "}
                  <strong className="break-all">{pendingSource.origine}</strong> ?
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={confirmReplace}
                    className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
                  >
                    Remplacer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingSource(null)}
                    className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {sourceError && (
              <p role="alert" className="mt-2 text-sm text-red-600">
                {sourceError}
              </p>
            )}
            {sourceNotice && !sourceError && (
              <p role="status" className="mt-2 text-sm text-emerald-700">
                {sourceNotice}
              </p>
            )}
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
