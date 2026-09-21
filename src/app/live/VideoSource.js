"use client";

import { useState } from "react";
import { Icon } from "./ui";

// « Voir l'extrait vidéo » : lecteur intégré de la plateforme d'origine (YouTube,
// Dailymotion, X). L'adresse du lecteur (video.embedUrl) est reconstruite côté
// serveur à partir d'un identifiant validé (src/lib/live-video.js) ; l'iframe est
// en plus isolé (sandbox) et n'est chargé qu'au clic (aucune requête vers la
// plateforme tant que la personne n'a pas demandé la vidéo).
// France TV : pas de lecteur intégré possible ; le lien ouvre la vidéo sur son site.
const BUTTON =
  "inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50";

export default function VideoSource({ video, sourceUrl, titre }) {
  const [open, setOpen] = useState(false);

  if (!video.embedUrl) {
    return (
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={BUTTON}>
        <Icon name="play" className="h-4 w-4" />
        Voir la vidéo sur {video.label}
        <Icon name="external" className="h-3.5 w-3.5 text-zinc-400" />
      </a>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="lecteur-video"
        className={BUTTON}
      >
        <Icon name="play" className="h-4 w-4" />
        {open ? "Masquer l'extrait vidéo" : "Voir l'extrait vidéo"}
      </button>
      {open && (
        <div id="lecteur-video" className="mt-3 overflow-hidden rounded-xl border border-zinc-200 bg-black">
          <div className={video.platform === "x" ? "mx-auto max-w-[550px]" : "aspect-video"}>
            <iframe
              src={video.embedUrl}
              title={`Extrait vidéo ${video.label} : ${titre}`}
              className={video.platform === "x" ? "h-[500px] w-full" : "h-full w-full"}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            />
          </div>
          <p className="bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
            Lecteur {video.label}.{" "}
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
              Ouvrir sur {video.label}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
