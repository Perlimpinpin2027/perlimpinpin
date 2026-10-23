import { DOSSIER } from "@/lib/couleurs-dossier";

// Briques d'affichage communes à la page du dossier « Mouvement social » et à
// ses blocs (partie « Comprendre la crise », graphiques), avec les mêmes styles
// que la page du dossier RN.

export const OMBRE_CARTE = "shadow-[0_24px_60px_-30px_rgba(30,41,82,0.35)]";

// Étiquette « // … », comme sur la page du dossier RN (en Geist, pas en police
// mono). Certains titres du JSON commencent déjà par « // » : le préfixe n'est
// alors pas doublé.
export function Etiquette({ children, couleur = "text-zinc-400", className = "" }) {
  const texte = String(children ?? "").replace(/^\/\/\s*/, "");
  if (!texte) return null;
  return (
    <span className={`text-xs font-semibold uppercase tracking-[0.12em] ${couleur} ${className}`}>
      {`// ${texte}`}
    </span>
  );
}

// Lien vers une source externe (`{ label, url }` du JSON), ouvert dans un
// nouvel onglet. Rien n'est affiché si la source est absente.
export function LienSource({ source, prefixe = "Source : ", className = "" }) {
  if (!source?.url) return null;
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-xs text-zinc-400 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-700 ${className}`}
    >
      {prefixe}
      {source.label} <span aria-hidden="true">↗</span>
    </a>
  );
}

// Plusieurs sources à la suite, en petit : « Sources : A ↗ · B ↗ ».
export function ListeSources({ sources, className = "" }) {
  const valides = (sources ?? []).filter((s) => s?.url);
  if (!valides.length) return null;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-xs text-zinc-400 ${className}`}>
      <span>{valides.length > 1 ? "Sources :" : "Source :"}</span>
      {valides.map((source, i) => (
        <span key={source.url}>
          <LienSource source={source} prefixe="" />
          {i < valides.length - 1 ? <span aria-hidden="true"> ·</span> : null}
        </span>
      ))}
    </p>
  );
}

// Texte courant « article », en colonne de lecture. `chapo` : le premier
// paragraphe est mis en avant avec une fine barre jaune.
export function Prose({ paragraphes, chapo = false, className = "" }) {
  if (!paragraphes?.length) return null;
  return (
    <div className={`flex max-w-3xl flex-col gap-5 text-lg leading-relaxed text-zinc-700 ${className}`}>
      {paragraphes.map((paragraphe, i) => (
        <p
          key={paragraphe}
          className={chapo && i === 0 ? `border-l-4 ${DOSSIER.bordure} pl-4 font-medium text-zinc-900` : undefined}
        >
          {paragraphe}
        </p>
      ))}
    </div>
  );
}

export function Pastille({ className, children }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}

// Tuile de chiffre (`{ valeur, legende, source }`) : « Ce qui s'est passé » et
// blocs `chiffres` de la partie « Comprendre la crise ».
export function TuileChiffre({ item }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-6">
      <p className="whitespace-nowrap text-4xl font-extrabold leading-none tracking-tight text-blue-950 xl:text-[2.75rem]">
        {item.valeur}
      </p>
      <p className="text-[15px] leading-normal text-slate-500">{item.legende}</p>
      <LienSource source={item.source} className="mt-auto pt-1" />
    </div>
  );
}
