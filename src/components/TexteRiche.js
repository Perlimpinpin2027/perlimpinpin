import Link from "next/link";

// Mise en forme minimale des textes modifiables (src/lib/textes/) :
//   *texte*  ou  **texte**   → gras
//   [libellé](adresse)        → lien
// Adresses acceptées : interne (/methode), https://… ou mailto:… Toute autre
// adresse est affichée comme du texte simple (pas de javascript:…).
// Composant sans état : utilisable dans une page serveur comme client.

const MOTIF = /(\[[^\]]+\]\([^)\s]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;

function adresseSure(adresse) {
  return /^\/(?!\/)/.test(adresse) || /^https:\/\//.test(adresse) || /^mailto:/.test(adresse);
}

function analyser(texte, options, prefixe = "") {
  return String(texte)
    .split(MOTIF)
    .filter((morceau) => morceau !== "")
    .map((morceau, index) => {
      const cle = `${prefixe}${index}`;

      const lien = morceau.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      if (lien) {
        const [, libelle, adresse] = lien;
        if (!adresseSure(adresse)) return <span key={cle}>{libelle}</span>;
        if (adresse.startsWith("/")) {
          return (
            <Link key={cle} href={adresse} className={options.classeLien}>
              {libelle}
            </Link>
          );
        }
        return (
          <a key={cle} href={adresse} target="_blank" rel="noopener noreferrer" className={options.classeLien}>
            {libelle}
          </a>
        );
      }

      const gras = morceau.match(/^\*\*([^*]+)\*\*$/) ?? morceau.match(/^\*([^*]+)\*$/);
      if (gras) {
        return (
          <strong key={cle} className={options.classeGras}>
            {analyser(gras[1], options, `${cle}-`)}
          </strong>
        );
      }

      return <span key={cle}>{morceau}</span>;
    });
}

export default function TexteRiche({
  texte,
  classeGras = "font-bold text-zinc-900",
  classeLien = "text-blue-600 underline-offset-2 transition-colors hover:text-blue-800",
}) {
  return <>{analyser(texte, { classeGras, classeLien })}</>;
}
