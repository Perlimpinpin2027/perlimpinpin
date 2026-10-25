"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { liveThemeLabel } from "@/lib/live-themes";
import { MesureCard } from "./MesureDetail";
import ProgressBar, { DEEP_MESSAGES } from "./ProgressBar";
import { ComingSoon, GO_BUTTON, GO_CARD, Icon, SOON_BADGE } from "./ui";
import { loginUrl } from "@/lib/live-redirect";

const DECLARATION_MAX_LENGTH = 20000;
// Mode d'analyse, choisi avant « Analyser » et valable pour toutes les saisies
// (texte, fichier, URL). Le serveur borne l'analyse rapide à 90 s et l'approfondie à
// 270 s : au-delà de ces délais (+ marge) côté navigateur, plus rien à attendre.
const ANALYSE_MODES = [
  {
    value: "rapide",
    label: "Analyse rapide",
    duration: "~15 à 20 secondes",
    description: "À partir du texte de la déclaration seule. Estimation à vérifier avant diffusion.",
    timeoutMs: 100_000,
  },
  {
    value: "approfondie",
    label: "Analyse approfondie",
    duration: "~1 à 3 minutes",
    description: "Recherche de sources externes pour une analyse sourcée et vérifiée.",
    timeoutMs: 290_000,
  },
];

// Fichiers acceptés pour « Fichier » (le serveur revérifie type et contenu).
const FILE_ACCEPT =
  ".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const FILE_EXTENSIONS = ["pdf", "docx", "txt"];
// 4 Mo : les fonctions Vercel refusent les requêtes de plus de 4,5 Mo.
const FILE_MAX_BYTES = 4 * 1024 * 1024;

// Boutons Fichier / URL / Dictée sous le texte
const SOURCE_BUTTON_CLASS =
  "inline-flex h-11 items-center gap-2 rounded-xl border border-[#e6e4de] bg-[#f8f7f4] px-4 text-[15px] font-medium text-zinc-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50";
const INPUT_CLASS =
  "w-full rounded-xl border border-[#e6e4de] bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:opacity-60";

export default function LiveAnalyzer({ candidats = [] }) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState("rapide");
  const [candidatId, setCandidatId] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
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

  // Panneaux sous la zone de saisie : candidat et source, aide « Comment ça marche ? »
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [aideOpen, setAideOpen] = useState(false);

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
      window.location.href = loginUrl(window.location.pathname + window.location.search);
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
    const timer = setTimeout(() => controller.abort(), ANALYSE_MODES.find((option) => option.value === mode).timeoutMs);

    try {
      const response = await fetch("/api/live/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          declaration,
          mode,
          candidatId: candidatId ? Number(candidatId) : undefined,
          sourceUrl: sourceUrl.trim() || undefined,
        }),
        signal: controller.signal,
      });
      if (response.status === 401) {
        window.location.href = loginUrl(window.location.pathname + window.location.search);
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
          ? mode === "approfondie"
            ? "L'analyse approfondie prend trop de temps. Réessayez, ou lancez une analyse rapide."
            : "L'analyse prend trop de temps. Réessayez, éventuellement avec un extrait plus court."
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

  const modeActif = ANALYSE_MODES.find((option) => option.value === mode);
  const candidatChoisi = candidats.find((candidat) => String(candidat.id) === candidatId) ?? null;

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className={`${GO_CARD} rounded-3xl p-3 sm:p-5`}>
          <div className="rounded-2xl border border-[#e6e4de] bg-[#fbfaf8] transition-shadow focus-within:border-zinc-300 focus-within:ring-4 focus-within:ring-blue-100">
            <label htmlFor="live-declaration" className="sr-only">
              Déclaration du candidat
            </label>
            <textarea
              id="live-declaration"
              required
              rows={4}
              value={declaration}
              onChange={(event) => setDeclaration(event.target.value)}
              maxLength={DECLARATION_MAX_LENGTH}
              disabled={loading}
              placeholder="Collez une déclaration politique à analyser…"
              className="block min-h-[120px] w-full resize-y bg-transparent px-5 pb-2 pt-4 text-lg leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:opacity-60"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 px-3 pb-3">
              <div className="flex flex-wrap gap-2">
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
                  <Icon name="paperclip" className="h-[18px] w-[18px]" />
                  {extracting === "fichier" ? "Lecture…" : "Fichier"}
                </button>
                <button
                  type="button"
                  onClick={() => setUrlOpen((open) => !open)}
                  aria-expanded={urlOpen}
                  disabled={loading || extracting !== null}
                  className={`${SOURCE_BUTTON_CLASS} ${urlOpen ? "!border-zinc-400 !bg-white" : ""}`}
                >
                  <Icon name="link" className="h-[18px] w-[18px]" />
                  URL
                </button>
                <ComingSoon>
                  <button type="button" disabled className={`${SOURCE_BUTTON_CLASS} !opacity-100 text-zinc-400`}>
                    <Icon name="microphone" className="h-[18px] w-[18px]" />
                    Dictée
                    <span className={SOON_BADGE}>Bientôt</span>
                  </button>
                </ComingSoon>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Type d'analyse : rapide (texte seul) ou approfondie (recherche de sources) */}
                <fieldset disabled={loading} className="min-w-0">
                  <legend className="sr-only">Type d&apos;analyse</legend>
                  <div className="inline-flex rounded-full border border-[#e6e4de] bg-[#f1f0ec] p-1">
                    {ANALYSE_MODES.map((option) => {
                      const selected = mode === option.value;
                      return (
                        <label
                          key={option.value}
                          title={`${option.label} : ${option.duration}`}
                          className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-200 has-[:disabled]:cursor-not-allowed ${
                            selected ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"
                          }`}
                        >
                          <input
                            type="radio"
                            name="live-mode"
                            value={option.value}
                            checked={selected}
                            onChange={() => setMode(option.value)}
                            className="sr-only"
                          />
                          {option.value === "rapide" ? "Rapide" : "Approfondie"}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <button
                  type="submit"
                  disabled={loading || declaration.trim().length < 20}
                  className="inline-flex h-[52px] items-center gap-3 rounded-full bg-zinc-900 px-7 text-[17px] font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {loading ? "Analyse en cours…" : "Analyser les faits"}
                  <Icon name="arrowRight" className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <p className="px-2 pt-3 text-xs text-zinc-500">
            <span className="font-semibold text-zinc-700">{modeActif.label}</span> · {modeActif.duration} ·{" "}
            {modeActif.description}
          </p>

          {urlOpen && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
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
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={handleUrlFetch}
                disabled={loading || extracting !== null || urlValue.trim().length === 0}
                className="shrink-0 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {extracting === "url" ? "Récupération…" : "Récupérer le texte"}
              </button>
            </div>
          )}

          {pendingSource && (
            <div role="alertdialog" aria-label="Remplacer le texte actuel" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
            <p role="alert" className="mt-3 px-2 text-sm text-red-600">
              {sourceError}
            </p>
          )}
          {sourceNotice && !sourceError && (
            <p role="status" className="mt-3 px-2 text-sm text-emerald-700">
              {sourceNotice}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 px-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {loading && (
            <div className="mt-4 px-2">
              <ProgressBar
                key={mode}
                label={mode === "approfondie" ? "Analyse approfondie en cours" : "Analyse en cours"}
                profile={mode}
                {...(mode === "approfondie" ? { messages: DEEP_MESSAGES } : {})}
                finished={finishing !== null}
                onFinished={handleFinished}
              />
              {mode === "approfondie" && finishing === null && (
                <p className="mt-1 text-xs text-zinc-400">
                  La recherche de sources prend de 1 à 3 minutes. Gardez cette page ouverte.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Ligne sous la carte : candidat et source (facultatifs), aide */}
        <div className="mt-3 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <span className="hidden sm:block" />
          <button
            type="button"
            onClick={() => setExtrasOpen((open) => !open)}
            aria-expanded={extrasOpen}
            aria-controls="live-extras"
            className={`${GO_BUTTON} h-11 justify-center rounded-full px-5`}
          >
            <Icon name={extrasOpen ? "chevronDown" : "plus"} className="h-[18px] w-[18px]" />
            {candidatChoisi ? (
              <span>
                Candidat : <strong className="font-semibold">{candidatChoisi.nom}</strong>
                {sourceUrl.trim() ? " · source ajoutée" : ""}
              </span>
            ) : sourceUrl.trim() ? (
              "Source ajoutée · ajouter un candidat"
            ) : (
              "Ajouter un candidat ou une source"
            )}
          </button>
          <button
            type="button"
            onClick={() => setAideOpen((open) => !open)}
            aria-expanded={aideOpen}
            aria-controls="live-aide"
            className="inline-flex items-center gap-2 justify-self-center text-sm text-zinc-500 transition-colors hover:text-zinc-900 sm:justify-self-end"
          >
            <Icon name="question" className="h-5 w-5" />
            Comment ça marche ?
          </button>
        </div>

        {extrasOpen && (
          <div id="live-extras" className={`${GO_CARD} mt-3 grid gap-4 p-5 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]`}>
            <div>
              <label htmlFor="live-candidat" className="text-sm font-medium text-zinc-700">
                Candidat <span className="font-normal text-zinc-400">(facultatif)</span>
              </label>
              <select
                id="live-candidat"
                value={candidatId}
                onChange={(event) => setCandidatId(event.target.value)}
                disabled={loading}
                className={`mt-1.5 ${INPUT_CLASS}`}
              >
                <option value="">Non précisé</option>
                {candidats.map((candidat) => (
                  <option key={candidat.id} value={candidat.id}>
                    {candidat.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="live-source-url" className="text-sm font-medium text-zinc-700">
                Lien de la source <span className="font-normal text-zinc-400">(facultatif)</span>
              </label>
              <input
                id="live-source-url"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                disabled={loading}
                placeholder="https://… (article, vidéo YouTube, Dailymotion, X, France TV)"
                className={`mt-1.5 ${INPUT_CLASS}`}
              />
              <p className="mt-1 text-xs text-zinc-400">
                Pour une vidéo, un lecteur s&apos;affichera sur la page de l&apos;analyse.
              </p>
            </div>
          </div>
        )}

        {aideOpen && (
          <div id="live-aide" className={`${GO_CARD} mt-3 p-5 text-sm leading-relaxed text-zinc-700`}>
            <p className="flex items-center gap-2 font-semibold text-zinc-900">
              <Icon name="bulb" className="h-5 w-5 text-amber-500" />
              Conseil
            </p>
            <p className="mt-2">
              Collez la déclaration telle que le candidat l&apos;a prononcée, avec ses chiffres exacts et son
              contexte (sujet, date, interlocuteur). Plus le passage est précis et complet, plus l&apos;estimation
              est fiable : évitez les paraphrases et les citations tronquées.
            </p>
            <p className="mt-2">
              <strong className="font-semibold text-zinc-900">Analyse rapide</strong> (~15 à 20 secondes) : à partir
              du seul texte de la déclaration, une estimation à vérifier avant diffusion.{" "}
              <strong className="font-semibold text-zinc-900">Analyse approfondie</strong> (~1 à 3 minutes) : avec une
              recherche de sources externes, pour une analyse sourcée.
            </p>
          </div>
        )}
      </form>

      {result && (
        <section className="mt-8 flex flex-col gap-4" aria-live="polite">
          <p className={`${GO_CARD} px-4 py-3 text-sm text-zinc-600`}>
            {result.mode === "approfondie" ? (
              <>
                <strong className="text-zinc-800">Analyse approfondie.</strong> Réalisée avec une recherche de sources externes
                {result.niveau_confiance && <> (niveau de confiance : <strong className="text-zinc-800">{result.niveau_confiance}</strong>)</>}.
              </>
            ) : (
              <>
                <strong className="text-zinc-800">Estimation préliminaire.</strong> Réalisée sans recherche externe, à partir
                de la seule déclaration : à vérifier avant toute diffusion.
              </>
            )}{" "}
            {result.id ? "Elle est enregistrée dans l'historique de l'équipe." : "Elle n'a pas été enregistrée dans l'historique."}
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
