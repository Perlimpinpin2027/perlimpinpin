import { Fragment } from "react";
import Header from "@/components/Header";
import { enLignes } from "@/lib/textes-site";
import { lireTextes } from "@/lib/textes-site-serveur";

export const metadata = {
  title: "Nous rejoindre — Perlimpinpin",
  description:
    "De l'intelligence artificielle à l'intelligence collective : rejoignez le Club Perlimpinpin pour challenger et améliorer nos analyses.",
};

// Page mise en cache (pas de requête en base à chaque visite). Elle est
// recalculée au plus tard toutes les heures, et immédiatement après chaque
// modification de texte depuis le mode édition.
export const revalidate = 3600;

const HELLOASSO_URL = "https://www.helloasso.com/associations/perlimpinpin-ai";

// Textes : par défaut dans src/lib/textes-site.js, éventuellement remplacés
// par ceux enregistrés en base (table TexteSite).
export default async function NousRejoindrePage() {
  const t = await lireTextes("nous-rejoindre");

  // Les 4 étapes du fonctionnement du Club (cartes numérotées).
  const etapes = [1, 2, 3, 4].map((n) => ({
    titre: t[`etape${n}.titre`],
    lignes: enLignes(t[`etape${n}.texte`]),
  }));

  // Les 3 sections de texte sous les cartes.
  const sections = [1, 2, 3].map((n) => ({
    titre: t[`section${n}.titre`],
    lignes: enLignes(t[`section${n}.texte`]),
  }));

  const morceauxTitre = enLignes(t.titre);

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="w-full px-6 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          {/* Titre + introduction */}
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl">
            {morceauxTitre.map((morceau, index) => (
              <Fragment key={index}>
                {index > 0 ? (
                  <>
                    <br className="hidden sm:block" />{" "}
                  </>
                ) : null}
                {morceau}
              </Fragment>
            ))}
          </h1>

          <div className="mt-6 flex flex-col gap-3 text-base leading-relaxed text-zinc-600">
            {enLignes(t.introduction).map((ligne, index) => (
              <p key={index}>{ligne}</p>
            ))}
          </div>

          <hr className="mt-6 border-zinc-200" />

          {/* Les 4 étapes */}
          <ol className="mt-6 flex flex-col gap-4">
            {etapes.map((etape, index) => (
              <li
                key={index}
                className="flex gap-5 rounded-2xl border border-zinc-200 bg-white px-6 py-6 sm:gap-6 sm:px-7"
              >
                <span className="w-8 shrink-0 pt-1 text-2xl font-medium tabular-nums text-zinc-400">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-7 w-px shrink-0 bg-zinc-300"
                />
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                    {etape.titre}
                  </h2>
                  <div className="mt-2 flex flex-col gap-0.5 text-sm leading-relaxed text-zinc-600 sm:text-base">
                    {etape.lignes.map((ligne, i) => (
                      <p key={i}>{ligne}</p>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>

          {/* Sections de texte */}
          <div className="mt-8">
            {sections.map((section, index) => (
              <section key={index} className="border-t border-zinc-200 py-6">
                <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-4xl">
                  {section.titre}
                </h2>
                <div className="mt-2 flex flex-col gap-0.5 text-base leading-relaxed text-zinc-600">
                  {section.lignes.map((ligne, i) => (
                    <p key={i}>{ligne}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Appel à l'action final */}
        <div className="mx-auto mt-4 w-full max-w-[1080px] rounded-3xl border border-zinc-200 bg-gradient-to-br from-slate-100 via-orange-50 to-indigo-100 px-6 py-10 text-center sm:py-12">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-zinc-700">
            {t["cta.surtitre"]}
          </p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            {t["cta.titre"]}
          </h2>
          <p className="mt-3 text-sm text-zinc-600 sm:text-base">{t["cta.texte"]}</p>
          <a
            href={HELLOASSO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-zinc-900 px-12 py-4 text-base font-semibold text-white transition-colors hover:bg-zinc-700"
          >
            {t["cta.bouton"]}
          </a>
        </div>
      </main>
    </div>
  );
}
