import Link from "next/link";
import { getScoreBadge } from "@/lib/score";
import { vignettePhoto } from "@/lib/photo-vignette";

// Icônes des rubriques (trait 1.75, 24×24, héritent de la couleur du texte).
const ICONES = {
  mandat: (
    <path d="M3 21h18M5 21V10m14 11V10M9 21v-6h6v6M2.5 10 12 3l9.5 7" />
  ),
  experience: (
    <path d="M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14M4 20h16M8 8h8M8 12h8M8 16h4" />
  ),
  hors: (
    <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Zm6-2V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1M3 13h18" />
  ),
  etudes: (
    <path d="M2 9l10-5 10 5-10 5L2 9Zm4 2v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6" />
  ),
  indemnites: (
    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 9v.01M18 15v.01" />
  ),
  frais: (
    <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Zm5-2V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M3 12h18M12 11v2" />
  ),
  revenus: (
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h4" />
  ),
};

const INFOBULLE_NA = "Aucune déclaration d'intérêts publiée par la HATVP";

const RUBRIQUES = [
  { cle: "mandat_actuel", titre: "Mandat actuel", icone: "mandat" },
  { cle: "experience_politique", titre: "Expérience politique", icone: "experience" },
  { cle: "hors_mandat_electif", titre: "Hors mandat électif", icone: "hors" },
  { cle: "etudes", titre: "Études", icone: "etudes" },
];

function Icone({ nom }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {ICONES[nom]}
    </svg>
  );
}

// Rubrique d'une seule ligne (indemnités, revenus déclarés), même mise en
// page que les rubriques à puces. `mention` : précision facultative en petit
// sous la valeur.
function RubriqueLigne({ titre, icone, mention = null, children }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-zinc-400">
        <Icone nom={icone} />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{titre}</p>
        <p className="mt-1 text-sm text-zinc-700">{children}</p>
        {mention ? <p className="mt-1 text-xs leading-snug text-zinc-400">{mention}</p> : null}
      </div>
    </li>
  );
}

// Libellé + nombre, accordé : « Définitives : 4 » / « Définitive : 1 ».
function compte(libelle, n) {
  return `${libelle}${n > 1 ? "s" : ""} : ${n}`;
}

// Nom du site d'une source (infobulle des liens « Sources »).
function nomDuSite(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ListeCondamnations({ titre, elements }) {
  if (!elements.length) return null;
  return (
    <div className="mt-2">
      <p className="text-sm text-zinc-700">
        {titre} ({elements.length}) :
      </p>
      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-sm text-zinc-700 marker:text-zinc-300">
        {elements.map((element) => (
          <li key={element}>{element}</li>
        ))}
      </ul>
    </div>
  );
}

// Rubrique « Condamnations pénales » (data/condamnations.json) : les nombres
// en synthèse, le détail repliable. Sans icône mais alignée sur le texte des
// autres rubriques (pl-8 = largeur de l'icône + l'espace qui la suit).
function Condamnations({ condamnations }) {
  const { definitives, non_definitives: nonDefinitives, note, sources } = condamnations;
  const aucune = !definitives.length && !nonDefinitives.length;

  return (
    <li className="pl-8">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Condamnations pénales</p>
      {aucune ? (
        <p className="mt-1 text-sm text-zinc-700">Aucune condamnation pénale publique recensée</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-zinc-700">
            {[
              definitives.length ? compte("Définitive", definitives.length) : null,
              nonDefinitives.length ? compte("Non définitive", nonDefinitives.length) : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {note ? <p className="mt-1 text-xs italic leading-snug text-zinc-400">{note}</p> : null}
          <details className="mt-1">
            <summary className="cursor-pointer list-none text-xs text-zinc-400 hover:text-zinc-600 [&::-webkit-details-marker]:hidden">
              Voir le détail
            </summary>
            <ListeCondamnations titre="Définitives" elements={definitives} />
            <ListeCondamnations titre="Non définitives" elements={nonDefinitives} />
          </details>
        </>
      )}
      {sources.length ? (
        <p className="mt-1 text-xs text-zinc-400">
          {sources.length === 1 ? (
            <a
              href={sources[0]}
              target="_blank"
              rel="noopener noreferrer"
              title={nomDuSite(sources[0])}
              className="underline-offset-2 hover:text-zinc-600 hover:underline"
            >
              Source ↗
            </a>
          ) : (
            <>
              Sources :{" "}
              {sources.map((url, index) => (
                <span key={url}>
                  {index ? " · " : null}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={nomDuSite(url)}
                    className="underline-offset-2 hover:text-zinc-600 hover:underline"
                  >
                    {index + 1}
                  </a>
                </span>
              ))}
            </>
          )}
        </p>
      ) : null}
    </li>
  );
}

function initiales(prenom, nom) {
  const premiere = (texte) => (texte.match(/\p{Lu}/u) ?? [texte[0] ?? ""])[0];
  return `${premiere(prenom)}${premiere(nom)}`.toUpperCase();
}

// Carte d'un candidat de la page /candidats : parcours (data/candidats-
// parcours.json, via getParcours) + score moyen de ses fiches publiées.
// `score` : { id, photoUrl, scoreMoyen (entier ou null), nombreFiches } ou null
// si le candidat n'est pas encore en base.
export default function CandidatCard({ parcours, score }) {
  const nomComplet = `${parcours.prenom} ${parcours.nom}`;
  const badge = score?.scoreMoyen != null ? getScoreBadge(score.scoreMoyen) : null;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-zinc-200 bg-white p-6">
      <header className="flex items-start gap-3">
        {score?.photoUrl ? (
          <img
            src={vignettePhoto(score.photoUrl)}
            alt={nomComplet}
            className="h-14 w-14 shrink-0 rounded-xl object-cover object-top"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-lg font-bold text-zinc-500"
          >
            {initiales(parcours.prenom, parcours.nom)}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight text-zinc-900">{nomComplet}</h2>
          <p className="mt-0.5 text-sm text-zinc-400">{parcours.parti}</p>
        </div>

        <div className="w-28 shrink-0 text-right">
          {badge ? (
            <>
              <p className={`text-3xl font-extrabold leading-none tracking-tight ${badge.scoreClass}`}>
                {score.scoreMoyen}
                <span className="text-sm font-semibold text-zinc-400">/100</span>
              </p>
              <p className="mt-1 text-xs leading-snug text-zinc-400">
                sur {score.nombreFiches} proposition{score.nombreFiches > 1 ? "s" : ""} analysée
                {score.nombreFiches > 1 ? "s" : ""}
              </p>
            </>
          ) : (
            <p className="text-xs font-medium text-zinc-400">Analyse en cours</p>
          )}
        </div>
      </header>

      <ul className="mt-6 flex flex-col gap-4 border-t border-zinc-100 pt-5">
        {RUBRIQUES.map(({ cle, titre, icone }) => {
          const elements = parcours[cle].slice(0, 2);
          if (!elements.length) return null;
          return (
            <li key={cle} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-zinc-400">
                <Icone nom={icone} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">{titre}</p>
                <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-sm text-zinc-700 marker:text-zinc-300">
                  {elements.map((element) => (
                    <li key={element}>{element}</li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}

        {parcours.indemnites_elu ? (
          <RubriqueLigne titre="Indemnités d'élu" icone="indemnites">
            {parcours.indemnites_elu.affichage}
          </RubriqueLigne>
        ) : null}

        {parcours.frais_mandat ? (
          <RubriqueLigne titre="Frais de mandat" icone="frais" mention={parcours.frais_mandat.mention}>
            {parcours.frais_mandat.sources[0] ? (
              <a
                href={parcours.frais_mandat.sources[0].url}
                target="_blank"
                rel="noopener noreferrer"
                title={parcours.frais_mandat.sources[0].label}
                className="underline-offset-2 hover:underline"
              >
                {parcours.frais_mandat.affichage}
              </a>
            ) : (
              parcours.frais_mandat.affichage
            )}
          </RubriqueLigne>
        ) : null}

        <Condamnations condamnations={parcours.condamnations} />

        {parcours.revenus_declares_hatvp ? (
          <RubriqueLigne titre="Revenus déclarés (HATVP)" icone="revenus">
            {parcours.revenus_declares_hatvp.affichage === "NA" ? (
              <span title={INFOBULLE_NA} className="cursor-help text-zinc-400">
                NA
              </span>
            ) : (
              parcours.revenus_declares_hatvp.affichage
            )}
          </RubriqueLigne>
        ) : null}
      </ul>

      <p className="mt-3 pl-8 text-xs text-zinc-400">
        {parcours.hatvp_url ? (
          <a
            href={parcours.hatvp_url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:text-zinc-600 hover:underline"
          >
            Fiche HATVP ↗
          </a>
        ) : (
          "Pas de fiche HATVP en ligne"
        )}
      </p>

      {parcours.note_contexte ? (
        <p className="mt-5 rounded-xl bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600">
          {parcours.note_contexte}
        </p>
      ) : null}

      {/* Espace élastique : cale le pied de carte en bas quand les cartes
          d'une même ligne de la grille n'ont pas la même hauteur. */}
      <div aria-hidden="true" className="min-h-5 flex-1" />

      <footer className="flex justify-end border-t border-zinc-100 pt-4 text-sm">
        {score ? (
          <Link
            href={`/candidats/${score.id}`}
            prefetch={false}
            className="font-semibold text-zinc-900 hover:opacity-70"
          >
            Voir les propositions analysées →
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
