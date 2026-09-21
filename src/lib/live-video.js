// Lien de la source d'une analyse live (article, vidéo…) et reconnaissance des
// plateformes vidéo. L'adresse d'un lecteur intégré est TOUJOURS reconstruite à
// partir d'un identifiant strictement validé, jamais reprise telle quelle de la
// saisie : rien de ce que colle l'utilisateur n'arrive tel quel dans un iframe.

export const SOURCE_URL_MAX_LENGTH = 500;

const PLATFORM_LABELS = {
  youtube: "YouTube",
  dailymotion: "Dailymotion",
  x: "X",
  francetv: "France TV",
};

// Correspondance sur une frontière de point : « youtube.com » et
// « m.youtube.com » oui ; « youtube.com.evil.fr » et « evilyoutube.com » non.
function hostIs(host, domain) {
  return host === domain || host.endsWith(`.${domain}`);
}

// Valide le lien de la source saisi par la rédaction. Retourne l'adresse
// normalisée (http ou https uniquement), ou null si elle est invalide.
export function normalizeSourceUrl(input) {
  if (typeof input !== "string") return null;
  const text = input.trim();
  if (!text || text.length > SOURCE_URL_MAX_LENGTH) return null;
  let url;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password || !url.hostname) return null;
  return url.href;
}

// Libellé court d'une source : nom de domaine sans « www. ».
export function sourceLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./i, "") || null;
  } catch {
    return null;
  }
}

// « 90 », « 1m30s », « 1h2m3s » -> secondes (null si illisible)
function parseStart(value) {
  if (!value) return null;
  if (/^\d{1,6}$/.test(value)) return Number(value);
  const match = /^(?:(\d{1,3})h)?(?:(\d{1,4})m)?(?:(\d{1,6})s)?$/.exec(value);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

function youtube(url, host) {
  const YT_ID = /^[A-Za-z0-9_-]{11}$/;
  let id = null;
  if (hostIs(host, "youtu.be")) {
    id = url.pathname.split("/")[1] ?? null;
  } else if (hostIs(host, "youtube.com") || hostIs(host, "youtube-nocookie.com")) {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(first)) id = second ?? null;
  } else {
    return null;
  }
  if (!id || !YT_ID.test(id)) return null;
  const start = parseStart(url.searchParams.get("t") ?? url.searchParams.get("start"));
  return {
    platform: "youtube",
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`,
  };
}

function dailymotion(url, host) {
  let raw = null;
  if (hostIs(host, "dai.ly")) {
    raw = url.pathname.split("/")[1] ?? null;
  } else if (hostIs(host, "dailymotion.com")) {
    const parts = url.pathname.split("/");
    if (parts[1] === "video") raw = parts[2] ?? null;
    else if (parts[1] === "embed" && parts[2] === "video") raw = parts[3] ?? null;
  } else {
    return null;
  }
  // Anciennes adresses : « x7tgad0_titre-de-la-video » -> l'identifiant précède le « _ »
  const id = raw?.split("_")[0] ?? null;
  if (!id || !/^[A-Za-z0-9]{5,20}$/.test(id)) return null;
  return { platform: "dailymotion", embedUrl: `https://www.dailymotion.com/embed/video/${id}` };
}

function xPost(url, host) {
  if (!hostIs(host, "x.com") && !hostIs(host, "twitter.com")) return null;
  const match = /^\/(?:[A-Za-z0-9_]{1,15}|i(?:\/web)?)\/status(?:es)?\/(\d{5,25})(?:\/.*)?$/.exec(url.pathname);
  if (!match) return null;
  return { platform: "x", embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${match[1]}&dnt=true` };
}

// France TV : reconnue comme source vidéo, mais SANS lecteur intégré : leur
// intégration officielle repose sur un identifiant propre à chaque vidéo, non
// dérivable de l'adresse. La page ouvre donc la vidéo sur le site de France TV.
// (francetvinfo.fr est aussi un site d'articles : seules ses pages de replay et
// de vidéos sont reconnues.)
function franceTv(url, host) {
  if (hostIs(host, "france.tv")) return { platform: "francetv", embedUrl: null };
  if (hostIs(host, "francetvinfo.fr") && /^\/(replay[-\w]*|videos?)\//.test(url.pathname)) {
    return { platform: "francetv", embedUrl: null };
  }
  return null;
}

// Reconnaît une plateforme vidéo à partir du lien de la source. Retourne
// { platform, label, embedUrl } (embedUrl null quand aucun lecteur intégré n'est
// possible), ou null pour toute autre source (texte, fichier, article…).
export function detectVideoSource(input) {
  const normalized = normalizeSourceUrl(input);
  if (!normalized) return null;
  const url = new URL(normalized);
  const host = url.hostname.toLowerCase();
  const found = youtube(url, host) ?? dailymotion(url, host) ?? xPost(url, host) ?? franceTv(url, host);
  return found ? { ...found, label: PLATFORM_LABELS[found.platform] } : null;
}
