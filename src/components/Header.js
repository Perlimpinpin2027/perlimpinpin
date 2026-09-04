"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ContactModal from "./ContactModal";

const navLinks = [
  { label: "Déclarations", href: "/declarations" },
  { label: "Candidats", href: "/candidats" },
  { label: "Thèmes", href: "/themes" },
  { label: "Prix Perlimpinpin", href: "/prix-perlimpinpin" },
  { label: "Méthode", href: "/methode" },
  { label: "À propos", href: "/a-propos" },
];

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  // Identité stable : sinon chaque re-render du header (ex. isScrolled au
  // scroll) recrée cette fonction et redéclenche l'effet de fermeture
  // automatique de ContactModal, qui l'a en dépendance.
  const closeContact = useCallback(() => setIsContactOpen(false), []);
  // Fond flouté/semi-transparent + ombre uniquement une fois la page
  // scrollée, pour distinguer le header sticky du contenu qui défile
  // dessous sans l'alourdir visuellement quand on est tout en haut.
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const checkScroll = () => setIsScrolled(window.scrollY > 8);
    checkScroll();
    window.addEventListener("scroll", checkScroll, { passive: true });
    return () => window.removeEventListener("scroll", checkScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 w-full border-b transition-colors duration-200 ${
        isScrolled
          ? "border-zinc-200/70 bg-background/80"
          : "border-transparent bg-background"
      }`}
      // box-shadow/backdrop-filter posés en style inline plutôt qu'en
      // classes Tailwind (shadow-sm/backdrop-blur-md) : ces utilitaires
      // composent leur valeur via des custom properties CSS (--tw-shadow,
      // --tw-backdrop-blur) qui, sur ce site, ne se résolvent pas de façon
      // fiable sur un header déjà monté — l'inline style pose la valeur
      // finale directement, sans cette indirection.
      style={
        isScrolled
          ? { boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)", backdropFilter: "blur(12px)" }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-6 px-6 py-4 sm:px-8">
        {/* Logo en texte/CSS plutôt qu'en image (public/logo/logo.png,
            retiré) : reste net à toute résolution/DPI, et chaque propriété
            mesurée sur le fichier source fourni est directement
            implémentable plutôt que ré-approximée par recadrage/alpha sur
            un bitmap. aria-label porté par le Link, spans internes
            aria-hidden pour un nom accessible unique ("Perlimpinpin") au
            lieu de "slash P E R L I M P I N P I N" épelé par un lecteur
            d'écran.
            Tailles : slash et texte utilisent la même police (Geist Mono)
            mais des tailles différentes — un "/" occupe naturellement,
            dans cette police, une hauteur d'encre ~1.21x la hauteur de
            capitale à taille de police égale (mesuré par bounding box sur
            canvas) ; ×1.157 sur la taille de police du slash amène ce
            ratio à 1.4x, la proportion mesurée sur le fichier source.
            gap-x calé sur ce même fichier (rapport espace/hauteur de
            capitale ≈ 0.35). Hauteur totale du slash (élément le plus
            haut) alignée sur les 17.6px/22.4px déjà validés pour l'ancien
            logo image (voir .header-logo, retiré de globals.css). */}
        <Link
          href="/"
          aria-label="Perlimpinpin"
          className="flex shrink-0 items-center gap-x-[4.4px] sm:gap-x-[5.6px]"
        >
          <span
            aria-hidden="true"
            className="font-mono text-[20.4px] font-normal leading-none sm:text-[26px]"
            style={{ color: "#98989A" }}
          >
            /
          </span>
          <span
            aria-hidden="true"
            className="font-mono text-[17.65px] font-bold leading-none tracking-tight sm:text-[22.47px]"
            style={{ color: "#1E2128" }}
          >
            PERLIMPINPIN
          </span>
        </Link>

        <nav className="hidden md:block">
          <ul className="flex items-center gap-8 text-sm font-medium text-zinc-700">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="transition-colors hover:text-zinc-950"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/newsletter"
          className="hidden shrink-0 items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950 md:flex"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          Newsletter
        </Link>

        <button
          type="button"
          onClick={() => setIsContactOpen(true)}
          className="hidden shrink-0 items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950 md:flex"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
            aria-hidden="true"
          >
            <path d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
          </svg>
          Nous contacter
        </button>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-700 transition-colors hover:bg-zinc-100 md:hidden"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden="true"
          >
            {isMenuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            )}
          </svg>
        </button>
      </div>

      {isMenuOpen ? (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/20 md:hidden"
            aria-hidden="true"
            onClick={() => setIsMenuOpen(false)}
          />
          <div className="absolute left-0 right-0 top-full z-30 border-b border-zinc-200 bg-background px-6 py-4 shadow-lg md:hidden">
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                    Newsletter
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                    </svg>
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
