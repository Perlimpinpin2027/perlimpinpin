import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { ExtractError, URL_UNREACHABLE_MESSAGE, fetchPublicPage } from "./live-url.js";

// Extraction de texte brut pour /live : fichier (PDF, DOCX, TXT) ou page web.
// Le texte extrait est simplement placé dans le textarea (relecture par le
// journaliste) : aucune analyse ici.

// 4 Mo : les fonctions Vercel refusent les requêtes de plus de 4,5 Mo.
export const MAX_FILE_BYTES = 4 * 1024 * 1024;
// Même plafond que la déclaration analysable (voir live-analyse.js).
export const MAX_TEXT_LENGTH = 20000;
const MIN_ARTICLE_LENGTH = 200;

const FILE_TYPES_MESSAGE = "Type de fichier non pris en charge. Formats acceptés : PDF, DOCX ou TXT.";

// --- Normalisation ------------------------------------------------------------

// Nettoie le texte (retours à la ligne, espaces, lignes vides multiples) et le
// tronque au plafond. Retourne { texte, tronque }.
export function normalizeText(raw) {
  const texte = raw
    .replace(/\r\n?/g, "\n")
    .replace(/\x00/g, "")
    .replace(/[^\S\n]+/g, " ") // espaces, tabulations, insécables, BOM (tout sauf \n)
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (texte.length <= MAX_TEXT_LENGTH) return { texte, tronque: false };
  return { texte: texte.slice(0, MAX_TEXT_LENGTH).trimEnd(), tronque: true };
}

function requireText(texte, message) {
  if (texte.length < 20) throw new ExtractError(message);
  return texte;
}

// --- Fichiers ------------------------------------------------------------------

function startsWith(buffer, bytes) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

async function extractPdf(buffer) {
  let pdf;
  try {
    pdf = await getDocumentProxy(new Uint8Array(buffer));
  } catch (error) {
    if (error?.name === "PasswordException") {
      throw new ExtractError("Ce PDF est protégé par un mot de passe : impossible de le lire.");
    }
    throw new ExtractError("Ce PDF est illisible ou corrompu.");
  }
  const { text } = await extractText(pdf, { mergePages: true });
  return requireText(
    text,
    "Aucun texte trouvé dans ce PDF. S'il s'agit d'un scan (image), copiez le texte à la main.",
  );
}

async function extractDocx(buffer) {
  let value;
  try {
    ({ value } = await mammoth.extractRawText({ buffer }));
  } catch {
    throw new ExtractError("Ce document Word est illisible ou corrompu.");
  }
  return requireText(value, "Aucun texte trouvé dans ce document Word.");
}

function extractPlainText(buffer) {
  if (buffer.subarray(0, 8192).includes(0)) {
    throw new ExtractError("Ce fichier n'est pas un fichier texte lisible.");
  }
  let texte;
  try {
    texte = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    // Fichier texte historique non UTF-8 (ex. Windows-1252, fréquent en français)
    texte = new TextDecoder("windows-1252").decode(buffer);
  }
  return requireText(texte, "Ce fichier texte est vide.");
}

// Extrait le texte d'un fichier déposé. Le type est déduit de l'extension ET
// vérifié sur le contenu (signature), jamais du seul type MIME annoncé.
export async function extractFromFile({ buffer, name }) {
  if (buffer.length === 0) throw new ExtractError("Ce fichier est vide.");
  if (buffer.length > MAX_FILE_BYTES) {
    throw new ExtractError(`Ce fichier dépasse la taille maximale (${MAX_FILE_BYTES / 1024 / 1024} Mo).`);
  }

  const extension = (name.split(".").pop() ?? "").toLowerCase();
  let brut;
  if (extension === "pdf") {
    if (!startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d])) throw new ExtractError("Ce fichier n'est pas un vrai PDF.");
    brut = await extractPdf(buffer);
  } else if (extension === "docx") {
    if (!startsWith(buffer, [0x50, 0x4b, 0x03, 0x04])) throw new ExtractError("Ce fichier n'est pas un vrai document Word (.docx).");
    brut = await extractDocx(buffer);
  } else if (extension === "txt") {
    brut = extractPlainText(buffer);
  } else if (extension === "doc") {
    throw new ExtractError("Le format Word ancien (.doc) n'est pas pris en charge : enregistrez le document en .docx.");
  } else {
    throw new ExtractError(FILE_TYPES_MESSAGE);
  }
  return normalizeText(brut);
}

// --- Pages web -------------------------------------------------------------------

function decodeBody(body, contentType) {
  const headerCharset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  const metaCharset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(body.subarray(0, 4096).toString("latin1"))?.[1];
  for (const label of [headerCharset, metaCharset, "utf-8"]) {
    if (!label) continue;
    try {
      return new TextDecoder(label).decode(body);
    } catch {
      // libellé d'encodage inconnu : on essaie le suivant
    }
  }
  return body.toString("utf8");
}

// Texte lisible d'un article : Readability retire navigation, menus, pubs ;
// le contenu retenu est ensuite remis en paragraphes.
export function extractArticleText(html) {
  const { document } = parseHTML(html);
  const article = new Readability(document).parse();
  if (!article?.content) return null;

  const { document: content } = parseHTML(`<body>${article.content}</body>`);
  const blocs = [...content.querySelectorAll("h1, h2, h3, h4, h5, h6, p, li, blockquote")]
    // ignore les blocs imbriqués (un <p> dans un <blockquote> serait compté deux fois)
    .filter((node) => !node.parentElement?.closest("h1, h2, h3, h4, h5, h6, p, li, blockquote"))
    .map((node) => node.textContent.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const corps = blocs.length > 0 ? blocs.join("\n\n") : article.textContent ?? "";
  const titre = (article.title ?? "").replace(/\s+/g, " ").trim();
  return { titre, corps };
}

// Récupère une page publique et en extrait le texte. Retourne
// { texte, tronque, titre }. Lève ExtractError (message affichable).
export async function extractFromUrl(input) {
  const page = await fetchPublicPage(input);
  const { contentType } = page;

  if (contentType.includes("application/pdf")) {
    const { texte, tronque } = normalizeText(await extractPdf(page.body));
    return { texte, tronque, titre: "" };
  }
  if (contentType.includes("text/plain")) {
    const { texte, tronque } = normalizeText(extractPlainText(page.body));
    return { texte, tronque, titre: "" };
  }
  if (!contentType.includes("html")) throw new ExtractError(URL_UNREACHABLE_MESSAGE);

  const extrait = extractArticleText(decodeBody(page.body, contentType));
  if (!extrait || extrait.corps.length < MIN_ARTICLE_LENGTH) {
    throw new ExtractError(
      "Impossible d'extraire un article lisible de cette page (contenu vide, protégé ou chargé par script).",
    );
  }
  const { texte, tronque } = normalizeText(extrait.titre ? `${extrait.titre}\n\n${extrait.corps}` : extrait.corps);
  return { texte, tronque, titre: extrait.titre };
}
