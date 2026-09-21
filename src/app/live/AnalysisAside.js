import { Icon } from "./ui";

// Panneau de droite de la page d'une analyse : origine du texte, quelques
// chiffres clés et niveau de confiance.

const CONFIANCE_DOT = {
  "élevé": "bg-emerald-500",
  moyen: "bg-amber-400",
  faible: "bg-red-500",
};

// Adresse cliquable : http(s) uniquement (déjà validée à l'enregistrement)
function safeHref(url) {
  return typeof url === "string" && /^https?:\/\/\S+$/i.test(url) ? url : null;
}

export default function AnalysisAside({ analyse }) {
  const origine = analyse.video ? `Vidéo ${analyse.video.label}` : (analyse.sourceLabel ?? "Déclaration collée");
  const lien = safeHref(analyse.sourceUrl);

  return (
    <aside className="flex flex-col gap-5 border-t border-zinc-200 bg-white px-5 py-6 lg:border-l lg:border-t-0 lg:px-6 lg:py-8">
      <section aria-labelledby="source-origine" className="rounded-xl border border-zinc-200 p-4">
        <h2 id="source-origine" className="text-sm font-bold text-zinc-900">
          {"Source d'origine"}
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500">
            <Icon name="document" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-800">{origine}</p>
            <p className="text-xs text-zinc-400">Ajoutée le {analyse.dateLabel}</p>
          </div>
        </div>
        {lien && (
          <a
            href={lien}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
          >
            Voir la source
            <Icon name="external" className="h-3 w-3" />
          </a>
        )}

        <ul className="mt-4 flex flex-col gap-2.5 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
          {analyse.enrichi ? (
            <>
              <li className="flex items-center gap-2.5">
                <Icon name="document" className="h-4 w-4 text-zinc-400" />
                {analyse.sources.length} {analyse.sources.length > 1 ? "sources référencées" : "source référencée"}
              </li>
              <li className="flex items-center gap-2.5">
                <Icon name="pencil" className="h-4 w-4 text-zinc-400" />
                {analyse.affirmations.length}{" "}
                {analyse.affirmations.length > 1 ? "affirmations analysées" : "affirmation analysée"}
              </li>
              {analyse.confiance && (
                <li className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`ml-1 h-2.5 w-2.5 rounded-full ${CONFIANCE_DOT[analyse.confiance] ?? "bg-zinc-300"}`}
                  />
                  Niveau de confiance : {analyse.confiance}
                </li>
              )}
            </>
          ) : (
            <li className="text-xs leading-relaxed text-zinc-400">
              {"Analyse antérieure au format enrichi : sources, affirmations et niveau de confiance non disponibles."}
            </li>
          )}
          <li className="flex items-center gap-2.5">
            <Icon name="chart" className="h-4 w-4 text-zinc-400" />
            {analyse.nbMesures} {analyse.nbMesures > 1 ? "mesures analysées" : "mesure analysée"}
          </li>
        </ul>
      </section>

      <div className="rounded-xl bg-gradient-to-br from-indigo-50 via-white to-orange-50 p-5">
        <p className="font-mono text-sm font-bold tracking-widest text-zinc-900">PerlimpinpinGo</p>
        <p className="mt-2 text-sm font-medium leading-relaxed text-zinc-700">
          Des réponses fiables pour un débat plus éclairé.
        </p>
      </div>
    </aside>
  );
}
