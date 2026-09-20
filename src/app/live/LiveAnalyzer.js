"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { liveThemeLabel } from "@/lib/live-themes";
import { MesureCard } from "./MesureDetail";
import ProgressBar from "./ProgressBar";
import { ComingSoon, Icon } from "./ui";

const DECLARATION_MAX_LENGTH = 20000;
// La route d'analyse s'arrête à 90 s (maxDuration) : au-delà de 100 s côté
// navigateur, plus aucune réponse n'est à attendre.
const ANALYSE_TIMEOUT_MS = 100_000;

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
  // Résultat déjà reçu, affiché une fois la barre de progression complétée
  const [finishing, setFinishing] = useState(null);

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
    setFinishing(null);

    // Délai maximal : sans réponse, on arrête la barre et on affiche une erreur
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ANALYSE_TIMEOUT_MS);

    try {
      const response = await fetch("/api/live/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ declaration, candidatId: candidatId ? Number(candidatId) : undefined }),
        signal: controller.signal,
      });
      if (response.status === 401) {
        window.location.href = "/live/login";
        return;
      }
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        setError(data?.error ?? "L'analyse a échoué. Réessayez.");
        setLoading(false);
        return;
      }
      // Réponse arrivée : la barre se complète à 100 %, puis handleFinished
      // affiche le résultat.
      setFinishing(data);
    } catch (caught) {
      setError(
        caught?.name === "AbortError"
          ? "L'analyse prend trop de temps. Réessayez, éventuellement avec un extrait plus court."
          : "Connexion impossible. Vérifiez votre réseau et réessayez.",
      );
      setLoading(false);
    } finally {
      clearTimeout(timer);
    }
  }

  // Appelé par la barre une fois à 100 % : on montre le résultat
  function handleFinished() {
    // Analyse enregistrée : on ouvre sa page dédiée (la barre reste à 100 % le
    // temps de la navigation). Le résultat n'est affiché sur place que si elle
    // n'a pas de page (aucune mesure analysable, ou enregistrement impossible).
    if (finishing?.id) {
      router.push(`/live/analyses/${finishing.id}`);
      return;
    }
    setResult(finishing);
    setFinishing(null);
    setLoading(false);
    // L'analyse est enregistrée côté serveur : recharge historique et cartes.
    router.refresh();
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
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          {loading && (
            <ProgressBar
              label="Analyse en cours"
              finished={finishing !== null}
              onFinished={handleFinished}
            />
          )}
        </form>
      </div>

      {result && (
        <section className="mt-8 flex flex-col gap-4" aria-live="polite">
          <p className="rounded-lg border border-zinc-200 bg-white/70 px-4 py-3 text-sm text-zinc-600">
            <strong className="text-zinc-800">Estimation préliminaire.</strong>{" "}
            Réalisée sans recherche externe, à partir
            de la seule déclaration : à vérifier avant toute diffusion. {result.id ? "Elle est enregistrée dans l'historique de l'équipe." : "Elle n'a pas été enregistrée dans l'historique."}
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
