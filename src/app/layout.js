import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Serif éditoriale à fort contraste (titres uniquement, toujours utilisée
// via la classe font-serif — voir --font-serif dans globals.css) : remplace
// le repli générique de Tailwind (Georgia/Times) par une vraie face de
// display, cohérente avec la maquette. Poids chargés : 400 en secours,
// 700 pour tous les titres (font-bold), qui sont les deux seuls utilisés
// site-wide (voir les usages de font-serif dans src/).
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
