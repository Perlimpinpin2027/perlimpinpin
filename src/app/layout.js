import { Geist, Geist_Mono, Fraunces } from "next/font/google";
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

export const metadata = {
  metadataBase: new URL("https://perlimpinpin.ai"),
  title: "Perlimpinpin",
  description:
    "Perlimpinpin évalue le réalisme et la faisabilité des propositions politiques des candidats à la présidentielle.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
