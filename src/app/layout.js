import localFont from "next/font/local";
import AnalyticsGate from "@/components/AnalyticsGate";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import Footer from "@/components/Footer";
import "./globals.css";

// Polices hébergées dans le dépôt (src/app/fonts/, licences SIL OFL à côté) :
// next/font/google télécharge les fichiers chez Google à chaque build, et une
// panne de Google Fonts a déjà fait échouer un déploiement de production
// (22 octobre 2026, « next/font/google queries have exactly one entry »).
// Avec next/font/local, le build ne dépend plus d'aucun service extérieur.
// Mêmes variables CSS qu'avant (--font-geist-sans, --font-geist-mono,
// --font-fraunces, voir globals.css). Sources : paquet npm geist 1.8.2
// (polices variables) et @fontsource/fraunces 5.3.0 (sous-ensemble latin).
const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

// Serif éditoriale à fort contraste (titres uniquement, toujours utilisée
// via la classe font-serif — voir --font-serif dans globals.css) : remplace
// le repli générique de Tailwind (Georgia/Times) par une vraie face de
// display, cohérente avec la maquette. Poids chargés : 400 en secours,
// 700 pour tous les titres (font-bold), qui sont les deux seuls utilisés
// site-wide (voir les usages de font-serif dans src/).
const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/fraunces-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

const DESCRIPTION =
  "Perlimpinpin évalue le réalisme et la faisabilité des propositions politiques des candidats à la présidentielle.";

// Pas de champ `images` ici : src/app/opengraph-image.png et twitter-image.png
// (convention de fichier Next.js, + leurs .alt.txt) fournissent déjà og:image
// et twitter:image avec une URL absolue (résolue via metadataBase) — un champ
// `images` posé ici serait ignoré (le fichier a toujours priorité) et donc
// une source de confusion, pas juste redondant.
export const metadata = {
  metadataBase: new URL("https://perlimpinpin.ai"),
  title: "Perlimpinpin",
  description: DESCRIPTION,
  openGraph: {
    title: "Perlimpinpin",
    description: DESCRIPTION,
    url: "https://perlimpinpin.ai",
    siteName: "Perlimpinpin",
    locale: "fr_FR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Perlimpinpin",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      // Défilement doux pour les ancres (globals.css), mais changements de
      // page instantanés : Next coupe le smooth pendant la navigation.
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Footer />
        <AnalyticsGate />
        <CookieConsentBanner />
      </body>
    </html>
  );
}
