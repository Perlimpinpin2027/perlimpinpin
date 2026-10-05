import Link from "next/link";
import Header from "@/components/Header";

// Mise en page commune aux pages de connexion et d'inscription du Club :
// logo Club Perlimpinpin, titre sans empattement (fini le Fraunces
// « vintage »), carte blanche translucide sur le fond dégradé du site.
export default function ClubShell({ titre, intro, children, basDePage }) {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-6 pb-20 pt-14 sm:pt-20">
        <Link href="/relectures" aria-label="Club Perlimpinpin" className="self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/club-perlimpinpin.webp"
            alt="Club Perlimpinpin"
            width={1412}
            height={120}
            className="h-6 w-auto sm:h-7"
          />
        </Link>

        <h1 className="mt-10 text-[28px] font-semibold leading-tight tracking-[-0.03em] text-zinc-900 sm:text-[32px]">
          {titre}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-zinc-500">{intro}</p>

        <div className="mt-8 rounded-3xl border border-zinc-200/70 bg-white/80 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_12px_40px_-12px_rgba(0,0,0,0.08)] backdrop-blur sm:p-7">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">{basDePage}</p>
      </main>
    </div>
  );
}
