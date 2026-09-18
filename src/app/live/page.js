import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { LIVE_COOKIE_NAME, verifySessionToken } from "@/lib/live-session";
import LiveAnalyzer from "./LiveAnalyzer";

export const metadata = {
  title: "Décryptage en direct — Perlimpinpin",
  robots: { index: false, follow: false },
};

export default async function LivePage() {
  // Le proxy filtre déjà /live ; on revérifie ici, au plus près du contenu.
  const token = (await cookies()).get(LIVE_COOKIE_NAME)?.value;
  if (!verifySessionToken(token)) redirect("/live/login");

  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-8">
        <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">
          Décryptage en direct
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Collez la déclaration d&apos;un candidat pour l&apos;analyser.
        </p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <LiveAnalyzer />
        </div>
      </main>
    </div>
  );
}
