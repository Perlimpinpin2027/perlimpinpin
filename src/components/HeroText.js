import SearchBar from "./SearchBar";
import { enLignes, textesParDefaut } from "@/lib/textes-site";

// Colonne de gauche du bandeau d'accueil (maquette oct. 2026) : étiquette,
// grand titre, texte, barre de recherche + exemples. Les textes viennent de
// src/lib/textes/accueil.js (prop `textes`, lue en base par la page
// d'accueil, modifiables depuis /test/textes/accueil). Les 3 atouts sont
// désormais sous le bandeau (src/components/HeroAtouts.js).
// `documents` : index de recherche (getIndexRecherche), pour les suggestions
// instantanées de la barre.
// Espace insécable après les mots de 1 ou 2 lettres (« à », « et », « l'IA »
// reste entier…) : un petit mot ne reste jamais seul en fin de ligne.
function sansPetitMotEnFinDeLigne(texte) {
  return texte.replace(/(^|\s)(\S{1,2}) /g, "$1$2\u00a0");
}

export default function HeroText({ textes, documents }) {
  const t = { ...textesParDefaut("accueil"), ...textes };

  return (
    <div className="flex flex-col">
      <span className="font-mono text-sm uppercase tracking-[0.12em] text-slate-500">
        {t["hero.etiquette"]}
      </span>

      <h1 className="mt-5 font-sans text-5xl font-extrabold leading-[1.04] tracking-[-0.035em] text-zinc-950 sm:text-6xl xl:text-[3.9rem]">
        {/* Le mot « vraiment » est mis en gris clair et en italique
            (text-zinc-400), s'il est présent dans le titre. mr-[0.15em] :
            correction d'italique, sinon le « t » penché touche le mot
            suivant. */}
        {String(t["hero.titre"])
          .split(/(vraiment)/i)
          .map((morceau, index) =>
            index % 2 === 1 ? (
              <span key={index} className="mr-[0.15em] italic text-zinc-400">
                {morceau}
              </span>
            ) : (
              morceau
            ),
          )}
      </h1>

      <div className="mt-6 flex max-w-2xl flex-col gap-3 text-lg leading-relaxed text-slate-500 sm:text-xl">
        {enLignes(t["hero.texte"]).map((ligne, index) => (
          <p key={index}>{sansPetitMotEnFinDeLigne(ligne)}</p>
        ))}
      </div>

      <div className="mt-10 max-w-2xl">
        <SearchBar
          placeholder={t["recherche.placeholder"]}
          exemplesTitre={t["recherche.exemples.titre"]}
          exemples={enLignes(t["recherche.exemples"])}
          documents={documents}
        />
      </div>
    </div>
  );
}
