import Header from "@/components/Header";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Connexion — Décryptage en direct",
  robots: { index: false, follow: false },
};

export default function LiveLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-page-gradient font-sans">
      <Header />

      <main className="mx-auto w-full max-w-md flex-1 px-6 py-16 sm:px-8">
        <h1 className="font-serif text-3xl font-bold leading-tight text-zinc-900">
          Décryptage en direct
        </h1>
        <p className="mt-2 text-sm text-zinc-500">Accès réservé à l&apos;équipe éditoriale.</p>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
