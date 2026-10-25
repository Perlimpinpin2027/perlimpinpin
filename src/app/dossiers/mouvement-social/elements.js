// Briques d'affichage communes à la page du dossier « Mouvement social » et à
// ses blocs (partie « Comprendre la crise », graphiques), dans la charte propre
// au dossier (voir charte.js : couleurs en variables CSS --ms-…).

// Date du jour à Paris, au format des champs `dateIso` du JSON (« 2026-10-23 »).
export function dateDuJour() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export const OMBRE_CARTE = "shadow-[0_24px_60px_-30px_rgba(30,41,82,0.35)]";

// Étiquette « // … » en police mono (Geist Mono), comme le veut la charte du
// dossier. Certains titres du JSON commencent déjà par « // » : le préfixe
// n'est alors pas doublé.
export function Etiquette({ children, couleur = "text-(--ms-gris600)", className = "" }) {
  const texte = String(children ?? "").replace(/^\/\/\s*/, "");
  if (!texte) return null;
  return (
    <span className={`font-mono text-xs font-semibold uppercase tracking-[0.1em] ${couleur} ${className}`}>
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
          className={chapo && i === 0 ? `border-l-4 border-(--ms-jaune) pl-4 font-medium text-zinc-900` : undefined}
        >
          {paragraphe}
        </p>
      ))}
    </div>
  );
}

// Titre de partie : numéro (`num` du JSON) dans un carré jaune à texte noir
// (mono, gras), puis le titre en grand. Le même numéro figure dans le plan.
export function TitreNumerote({ num, children, as: Balise = "h2", className = "" }) {
  return (
    <Balise className={`flex items-start gap-3.5 text-3xl font-extrabold leading-[1.1] tracking-[-0.03em] text-(--ms-noir) sm:text-[2.25rem] ${className}`}>
      {num ? (
        <span className="mt-0.5 inline-flex h-9 min-w-9 flex-none items-center justify-center rounded-md bg-(--ms-jaune) px-1.5 font-mono text-base font-bold tracking-normal text-(--ms-noir) sm:mt-1">
          {num}
        </span>
      ) : null}
      <span>{children}</span>
    </Balise>
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
    <div className="flex flex-col gap-2 rounded-2xl border border-(--ms-gris200) bg-white p-6">
      <span aria-hidden="true" className="h-1 w-8 rounded-full bg-(--ms-jaune)" />
      <p className="whitespace-nowrap text-4xl font-extrabold leading-none tracking-[-0.03em] text-(--ms-noir) xl:text-[2.75rem]">
        {item.valeur}
      </p>
      <p className="text-[15px] leading-normal text-(--ms-gris600)">{item.legende}</p>
      {/* Lien interne (ex. vers le relevé) à la place d'une source. */}
      {item.lien?.ancre ? (
        <a
          href={item.lien.ancre}
          className="mt-auto w-fit pt-1 text-xs font-semibold text-(--ms-noir) underline decoration-(--ms-jaune) decoration-2 underline-offset-2"
        >
          {item.lien.label} <span aria-hidden="true">↓</span>
        </a>
      ) : (
        <LienSource source={item.source} className="mt-auto pt-1" />
      )}
    </div>
  );
}
