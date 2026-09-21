"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import ContactModal from "./ContactModal";

// Onglets du centre de la barre (maquette : Déclarations, Candidats,
// Méthode, À propos) + Thèmes, conservé à la demande. "Prix Perlimpinpin"
// n'apparaît plus dans la barre (la page /prix-perlimpinpin existe toujours).
const navLinks = [
  { label: "Déclarations", href: "/declarations" },
  { label: "Candidats", href: "/candidats" },
  { label: "Thèmes", href: "/themes" },
  { label: "Méthode", href: "/methode" },
  { label: "À propos", href: "/a-propos" },
];

// Icônes en SVG inline (trait 1.8, comme avant). Définies une seule fois ici
// pour ne pas les recopier entre la barre desktop et le menu mobile.
function IconBase({ className = "h-5 w-5", children }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function MailIcon() {
  return (
    <IconBase>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </IconBase>
  );
}

// Avion en papier du bouton "Go!" (remplace l'ancien lien "Journalistes").
function SendIcon() {
  return (
    <IconBase>
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </IconBase>
  );
}

function ChatIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
    </IconBase>
  );
}

// Petit trait vertical entre les trois actions de droite (maquette).
function Divider() {
  return <span aria-hidden="true" className="h-5 w-px bg-zinc-300/80" />;
}

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  // Identité stable : sinon chaque re-render du header (ex. isScrolled au
  // scroll) recrée cette fonction et redéclenche l'effet de fermeture
  // automatique de ContactModal, qui l'a en dépendance.
  const closeContact = useCallback(() => setIsContactOpen(false), []);
  // Ombre un peu plus marquée une fois la page scrollée, pour bien détacher
  // la barre flottante du contenu qui défile dessous.
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const checkScroll = () => setIsScrolled(window.scrollY > 8);
    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => window.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    // Le <header> reste sticky mais devient transparent : c'est la "pilule"
    // blanche à l'intérieur qui flotte, avec une marge autour (maquette). Le
    // dégradé de la page (bg-page-gradient) passe donc derrière la barre.
    <header className="sticky top-0 z-30 w-full px-4 pt-3 sm:px-8 sm:pt-4 lg:px-12">
      {/* box-shadow/backdrop-filter posés en style inline plutôt qu'en
          classes Tailwind (shadow-sm/backdrop-blur-md) : ces utilitaires
          composent leur valeur via des custom properties CSS (--tw-shadow,
          --tw-backdrop-blur) qui, sur ce site, ne se résolvent pas de façon
          fiable sur un header déjà monté — l'inline style pose la valeur
          finale directement, sans cette indirection. */}
      <div
        className="flex items-center justify-between gap-6 rounded-full border border-zinc-200/60 bg-white/85 px-6 py-3 sm:px-8"
        style={{
          boxShadow: isScrolled
            ? "0 8px 30px rgb(0 0 0 / 0.10)"
            : "0 4px 20px rgb(0 0 0 / 0.05)",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Logo en image (public/logo/perlimpinpin-logo.png) plutôt qu'en
            texte/CSS : les tentatives de reproduction en Geist Mono
            n'étaient jamais fidèles au fichier source. Fichier recadré au
            plus près et fond transparent ; exporté à 600px de large (~3x la
            taille d'affichage) pour rester net en écran retina. aria-hidden
            sur l'image, aria-label porté par le Link pour un nom accessible
            propre ("Perlimpinpin"). */}
        <Link
          href="/"
          aria-label="Perlimpinpin"
          className="flex shrink-0 items-center"
        >
          <img
            src="/logo/perlimpinpin-logo.png"
            alt=""
            aria-hidden="true"
            className="h-[17.6px] w-auto sm:h-[22.4px]"
          />
        </Link>

        <nav className="hidden lg:block">
          <ul className="flex items-center gap-5 text-sm font-medium text-zinc-700 xl:gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`whitespace-nowrap border-b-2 pb-1 transition-colors hover:text-zinc-950 ${
                      isActive
                        ? "border-blue-600 text-zinc-950"
                        : "border-transparent"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Groupe de droite (maquette) : Newsletter | Go! | bulle de contact,
            séparés par de petits traits verticaux. */}
        <div className="hidden shrink-0 items-center gap-4 lg:flex xl:gap-5">
          <Link
            href="/newsletter"
            aria-label="Newsletter"
            title="Newsletter"
            className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950"
          >
            <MailIcon />
            <span className="hidden xl:inline">Newsletter</span>
          </Link>

          <Divider />

          {/* Accès réservé à l'équipe éditoriale : /live redirige vers
              /live/login (proxy) si la personne n'est pas connectée. */}
          <Link
            href="/live"
            aria-label="Go!"
            title="Go!"
            className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950"
          >
            <SendIcon />
            <span>Go!</span>
          </Link>

          <Divider />

          {/* Contact : icône seule, ouvre la fenêtre de contact. */}
          <button
            type="button"
            onClick={() => setIsContactOpen(true)}
            aria-label="Nous contacter"
            title="Nous contacter"
            className="flex shrink-0 items-center text-zinc-700 transition-colors hover:text-zinc-950"
          >
            <ChatIcon />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100 lg:hidden"
        >
          <IconBase className="h-6 w-6">
            {isMenuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </IconBase>
        </button>
      </div>

      {isMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/20 lg:hidden"
            aria-hidden="true"
            onClick={() => setIsMenuOpen(false)}
          />
          {/* Menu mobile : carte arrondie qui s'ouvre sous la pilule, avec la
              même marge latérale qu'elle. */}
          <div className="absolute left-4 right-4 top-full z-30 mt-2 rounded-3xl border border-zinc-200 bg-white px-6 py-4 shadow-lg sm:left-8 sm:right-8 lg:hidden">
            <nav>
              <ul className="flex flex-col divide-y divide-zinc-100">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-3 text-base font-medium text-zinc-700 transition-colors hover:text-zinc-950"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/newsletter"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 py-3 text-base font-medium text-zinc-700 transition-colors hover:text-zinc-950"
                  >
                    <MailIcon />
                    Newsletter
                  </Link>
                </li>
                <li>
                  <Link
                    href="/live"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 py-3 text-base font-medium text-zinc-700 transition-colors hover:text-zinc-950"
                  >
                    <SendIcon />
                    Go!
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsContactOpen(true);
                    }}
                    className="flex w-full items-center gap-2 py-3 text-base font-medium text-zinc-700 transition-colors hover:text-zinc-950"
                  >
                    <ChatIcon />
                    Nous contacter
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        </>
      ) : null}

      <ContactModal open={isContactOpen} onClose={closeContact} />
    </header>
  );
}
