"use client";

import { useEffect, useRef, useState } from "react";
import { PROGRESS_PROFILES, messageIndex, simulatedProgress } from "@/lib/live-progress";

// Barre de progression SIMULÉE, réutilisable pour toute action IA de /live
// (analyse, questions d'interview, segmentation de transcript…). Elle ne mesure
// pas l'avancement du serveur : elle monte vite jusqu'à ~60 %, ralentit
// vers ~93 % sans jamais l'atteindre, puis se complète à 100 % dès que la
// réponse est arrivée (`finished`). Les messages sont une rotation temporisée,
// non liée à de vraies étapes.
//
// Usage : monter le composant au lancement de l'action (`<ProgressBar key=… />`),
// passer `finished` à true à l'arrivée de la réponse, puis afficher le résultat
// dans `onFinished` (appelé une fois la barre à 100 %). En cas d'échec,
// démonter simplement le composant.

const TICK_MS = 100;
const COMPLETE_MS = 400;
const HOLD_MS = 250;

export const DEFAULT_MESSAGES = [
  "Lecture de la déclaration…",
  "Identification des mesures…",
  "Analyse des critères…",
  "Vérification des points sensibles…",
  "Calcul du score…",
  "Finalisation…",
];

// Messages de l'analyse approfondie (recherche web) : rotation plus lente, adaptée à
// un temps d'attente de 1 à 3 minutes. Comme les autres, non liés à de vraies étapes.
export const DEEP_MESSAGES = [
  "Lecture de la déclaration…",
  "Identification des mesures…",
  "Recherche de sources externes…",
  "Lecture des sources trouvées…",
  "Croisement des chiffres et des textes…",
  "Analyse des critères…",
  "Vérification des points sensibles…",
  "Calcul du score…",
  "Finalisation…",
];

// `profile` : rythme de la simulation ("rapide" par défaut, "approfondie" pour une
// attente de plusieurs minutes).
export default function ProgressBar({
  finished = false,
  onFinished,
  messages = DEFAULT_MESSAGES,
  label = "Traitement en cours",
  profile = "rapide",
}) {
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const progressRef = useRef(0);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onFinishedRef.current = onFinished;
  });

  useEffect(() => {
    if (!finished) {
      // Phase de simulation : la progression ne dépend que du temps écoulé
      const start = Date.now();
      const id = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        progressRef.current = simulatedProgress(elapsed, profile);
        setProgress(progressRef.current);
        setSeconds(elapsed);
      }, TICK_MS);
      return () => clearInterval(id);
    }

    // Réponse arrivée : on complète rapidement jusqu'à 100 %, puis on rend la main
    const from = progressRef.current;
    const start = Date.now();
    let hold;
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / COMPLETE_MS);
      setProgress(from + (100 - from) * k);
      if (k >= 1) {
        clearInterval(id);
        hold = setTimeout(() => onFinishedRef.current?.(), HOLD_MS);
      }
    }, 40);
    return () => {
      clearInterval(id);
      clearTimeout(hold);
    };
  }, [finished, profile]);

  const messageEvery = (PROGRESS_PROFILES[profile] ?? PROGRESS_PROFILES.rapide).messageEvery;
  const message = finished ? messages[messages.length - 1] : messages[messageIndex(seconds, messages.length, messageEvery)];

  return (
    <div className="w-full">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="h-2 w-full overflow-hidden rounded-full bg-zinc-100"
      >
        <div
          className="h-full rounded-full bg-indigo-500 transition-[width] duration-150 ease-linear motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p aria-live="polite" className="mt-2 text-sm text-zinc-500">
        {message}
      </p>
    </div>
  );
}
