import Link from "next/link";

// Image du bandeau : public/bannière/Rejoindre.jpeg
// (le dossier contient un accent, on encode l'URL pour être sûr qu'elle
// fonctionne partout, en local comme sur Vercel).
const BANNER_IMAGE = encodeURI("/bannière/Rejoindre.jpeg");

export default function SupportBanner() {
  return (
    <section className="w-full px-6 pb-6 sm:px-8">
      <div className="relative mx-auto w-full max-w-[1280px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {/* Image : en haut sur mobile, à gauche (≈ 60 %) sur grand écran */}
        <div className="relative h-40 w-full sm:h-52 lg:absolute lg:inset-y-0 lg:left-0 lg:h-auto lg:w-[65%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={BANNER_IMAGE}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
          />
          {/* Fondu vers le blanc : vers le bas sur mobile, vers la droite sur grand écran */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white lg:bg-gradient-to-r lg:via-transparent lg:to-white"
          />
        </div>

        {/* Texte + bouton */}
        <div className="relative flex flex-col gap-5 px-6 pb-6 pt-2 lg:ml-auto lg:min-h-[250px] lg:w-[46%] lg:justify-center lg:py-10 lg:pl-0 lg:pr-8">
          <h2 className="text-3xl font-extrabold leading-[1.05] tracking-tight text-zinc-900 sm:text-4xl">
            de l’intelligence artificielle à l’intelligence collective
          </h2>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">
              L’objectivité ne se décrète pas.
              <br className="hidden sm:block" /> Elle se construit.
            </p>
            <Link
              href="/nous-rejoindre"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start whitespace-nowrap rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 sm:self-auto"
            >
              Rejoignez-nous →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
