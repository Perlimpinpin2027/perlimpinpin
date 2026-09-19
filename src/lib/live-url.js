import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";

// Récupération d'une page web depuis /live, protégée contre le SSRF : un lien
// collé par un utilisateur ne doit jamais servir à sonder le réseau interne
// du serveur. Contrôles :
//   - http/https uniquement, ports 80/443 uniquement, pas d'identifiants ;
//   - adresses locales/privées refusées, qu'elles soient écrites en clair
//     (127.0.0.1, [::1]) ou obtenues par DNS (le contrôle a lieu à la
//     connexion, sur l'adresse réellement utilisée : pas de fenêtre entre
//     « vérifier » et « se connecter » pour un DNS rebinding) ;
//   - redirections suivies à la main, chacune revalidée ;
//   - délai global, taille maximale, pas de résolution hors de ces règles.
//
// Même principe de délai que fetchWithTimeout dans scripts/analyze.js
// (privé à ce script, qui instancie Prisma à l'import et n'est donc pas
// importable ici).

// Erreur dont le message peut être montré tel quel à l'utilisateur.
export class ExtractError extends Error {}

export const URL_UNREACHABLE_MESSAGE = "Impossible de récupérer le contenu de cette URL.";
const URL_BLOCKED_MESSAGE =
  "Cette adresse n'est pas autorisée : seuls les sites publics en http ou https sont acceptés.";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;
export const MAX_PAGE_BYTES = 5 * 1024 * 1024;

// --- Adresses privées / réservées ------------------------------------------

function ipv4Octets(ip) {
  const parts = ip.split(".").map(Number);
  return parts.length === 4 && parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? parts : null;
}

function isPrivateIpv4(ip) {
  const octets = ipv4Octets(ip);
  if (!octets) return true; // illisible : refusé par prudence
  const [a, b, c] = octets;
  return (
    a === 0 || // « ce réseau »
    a === 10 || // privé
    (a === 100 && b >= 64 && b <= 127) || // partage d'adresses opérateur (CGNAT)
    a === 127 || // boucle locale
    (a === 169 && b === 254) || // lien local (dont métadonnées cloud 169.254.169.254)
    (a === 172 && b >= 16 && b <= 31) || // privé
    (a === 192 && b === 0 && c === 0) || // protocole IETF
    (a === 192 && b === 0 && c === 2) || // documentation
    (a === 192 && b === 168) || // privé
    (a === 198 && (b === 18 || b === 19)) || // tests de performance
    (a === 198 && b === 51 && c === 100) || // documentation
    (a === 203 && b === 0 && c === 113) || // documentation
    a >= 224 // multicast, réservé, broadcast
  );
}

// Transforme une adresse IPv6 en 8 groupes de 16 bits (null si illisible).
function ipv6Groups(ip) {
  let address = ip.split("%")[0]; // retire un éventuel identifiant de zone
  // Forme mixte (::ffff:1.2.3.4) : la partie IPv4 vaut deux groupes.
  const lastColon = address.lastIndexOf(":");
  const tail = address.slice(lastColon + 1);
  if (tail.includes(".")) {
    const octets = ipv4Octets(tail);
    if (!octets) return null;
    address =
      address.slice(0, lastColon + 1) +
      ((octets[0] << 8) | octets[1]).toString(16) +
      ":" +
      ((octets[2] << 8) | octets[3]).toString(16);
  }
  const halves = address.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 0) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...rest].map((g) =>
    parseInt(g, 16),
  );
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

function isPrivateIpv6(ip) {
  const g = ipv6Groups(ip);
  if (!g) return true;
  const zeros = (from, to) => g.slice(from, to).every((x) => x === 0);
  const v4 = (hi, lo) => `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;

  if (zeros(0, 8)) return true; // ::
  if (zeros(0, 7) && g[7] === 1) return true; // ::1
  // IPv4-mappée (::ffff:a.b.c.d) ou compatible (::a.b.c.d) : on juge l'IPv4 embarquée
  if (zeros(0, 5) && (g[5] === 0xffff || g[5] === 0)) return isPrivateIpv4(v4(g[6], g[7]));
  // NAT64 (64:ff9b::/96) : idem
  if (g[0] === 0x64 && g[1] === 0xff9b && zeros(2, 6)) return isPrivateIpv4(v4(g[6], g[7]));
  // 6to4 (2002::/16) : l'IPv4 est dans les groupes 1 et 2
  if (g[0] === 0x2002) return isPrivateIpv4(v4(g[1], g[2]));
  if (g[0] === 0x2001 && g[1] === 0) return true; // Teredo
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true; // documentation
  if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 lien local
  if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10 site local (obsolète)
  if ((g[0] & 0xff00) === 0xff00) return true; // multicast
  return false;
}

// true si l'adresse (IPv4 ou IPv6, en clair) est locale, privée ou réservée.
export function isPrivateAddress(ip) {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) return isPrivateIpv6(ip);
  return true; // ni IPv4 ni IPv6 valide : refusé
}

// --- Validation de l'URL ------------------------------------------------------

// Retourne l'URL parsée si elle est acceptable, sinon lève ExtractError.
export function assertPublicUrl(input) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    throw new ExtractError("Cette URL n'est pas valide. Collez un lien complet, par exemple https://www.exemple.fr/article.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ExtractError("Seules les adresses http et https sont acceptées.");
  }
  if (url.username || url.password) throw new ExtractError(URL_BLOCKED_MESSAGE);
  if (url.port && url.port !== "80" && url.port !== "443") throw new ExtractError(URL_BLOCKED_MESSAGE);

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new ExtractError(URL_BLOCKED_MESSAGE);
  }
  // Adresse IP écrite en clair (les formes décimales/octales/hexa sont déjà
  // normalisées par le parseur d'URL) : contrôlée ici, car la connexion
  // directe à une IP ne passe pas par la résolution DNS.
  if (net.isIP(host) && isPrivateAddress(host)) throw new ExtractError(URL_BLOCKED_MESSAGE);
  return url;
}

// Résolution DNS utilisée pour la connexion : refuse tout nom qui pointe
// vers une adresse privée, sur l'adresse même qui sera utilisée.
function safeLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error);
    if (addresses.some((entry) => isPrivateAddress(entry.address))) {
      return callback(new ExtractError(URL_BLOCKED_MESSAGE));
    }
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}

// --- Requête ---------------------------------------------------------------------

function requestOnce(url, signal) {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PerlimpinpinGo/1.0)",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.8,application/pdf;q=0.7",
          "Accept-Language": "fr,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (response) => {
        const chunks = [];
        let size = 0;
        response.on("data", (chunk) => {
          size += chunk.length;
          if (size > MAX_PAGE_BYTES) {
            request.destroy(new ExtractError("Cette page est trop volumineuse."));
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end();
  });
}

function decompress(body, encoding) {
  const limit = { maxOutputLength: MAX_PAGE_BYTES * 3 };
  switch ((encoding ?? "").toLowerCase()) {
    case "gzip":
      return zlib.gunzipSync(body, limit);
    case "deflate":
      return zlib.inflateSync(body, limit);
    case "br":
      return zlib.brotliDecompressSync(body, limit);
    default:
      return body;
  }
}

// Récupère une page publique. Retourne { url (finale), contentType, body }.
// Lève ExtractError (message affichable) pour tout échec.
export async function fetchPublicPage(input) {
  let url = assertPublicUrl(input);
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await requestOnce(url, signal);

      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.location;
        if (!location) throw new ExtractError(URL_UNREACHABLE_MESSAGE);
        // Chaque redirection est revalidée comme une nouvelle URL.
        url = assertPublicUrl(new URL(location, url).toString());
        continue;
      }
      if (response.status < 200 || response.status >= 300) {
        throw new ExtractError(URL_UNREACHABLE_MESSAGE);
      }
      return {
        url,
        contentType: String(response.headers["content-type"] ?? "").toLowerCase(),
        body: decompress(response.body, response.headers["content-encoding"]),
      };
    }
    throw new ExtractError("Trop de redirections pour cette adresse.");
  } catch (error) {
    if (error instanceof ExtractError) throw error;
    // Adresse refusée à la connexion (DNS vers une IP privée), remontée par Node
    if (error?.cause instanceof ExtractError) throw error.cause;
    console.error("[live] récupération d'URL impossible :", error?.message ?? error);
    throw new ExtractError(URL_UNREACHABLE_MESSAGE);
  }
}
