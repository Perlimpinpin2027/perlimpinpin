import { lienRecherchePR } from "@/lib/github";

// « Réponses aux commentaires du Club » d'un brouillon issu d'une révision
// (contenuComplet.revision, écrit par le robot de révision). Lecture seule :
// pour corriger une réponse, on passe par le chat avec Claude. Affiché
// seulement aux personnes déverrouillées (voir /test/[id]), jamais sur la
// fiche publique. Composant serveur : rien n'est envoyé au navigateur des
// autres visiteurs.
export default function ReponsesRevision({ revision }) {
  const reponses = Array.isArray(revision?.reponses) ? revision.reponses : [];
  return (
    <section
      aria-labelledby="reponses-revision"
      className="border-b border-amber-300 bg-amber-50 px-6 py-6 text-zinc-900 sm:px-8"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="reponses-revision" className="text-lg font-semibold">
            Réponses aux commentaires du Club
          </h2>
          <a
            href={lienRecherchePR(revision.slug)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
          >
            Voir la PR
          </a>
        </div>

        {revision.synthese ? <p className="text-sm leading-relaxed">{revision.synthese}</p> : null}

        {reponses.length === 0 ? (
          <p className="text-sm text-zinc-600">Aucun commentaire sur cette fiche.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {reponses.map((r, i) => (
              <li key={i} className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {r.section || "Section non précisée"}
                  </span>
                  {r.retenu ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
                      retenu
                    </span>
                  ) : null}
                </div>
                <blockquote className="border-l-2 border-zinc-300 pl-3 text-sm whitespace-pre-line text-zinc-700">
                  {r.commentaire}
                </blockquote>
                <p className="text-sm leading-relaxed whitespace-pre-line">{r.reponse}</p>
              </li>
            ))}
          </ol>
        )}

        <p className="text-xs text-zinc-500">
          Lecture seule. Pour corriger une réponse, passe par le chat avec Claude.
        </p>
      </div>
    </section>
  );
}
