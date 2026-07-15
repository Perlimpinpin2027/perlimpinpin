"use client";

import { useState } from "react";
import Link from "next/link";

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

  return (
    <header className="sticky top-0 z-30 w-full border-b border-zinc-200 bg-white">
      <div className="flex items-center justify-between gap-6 px-6 py-4 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white"
            aria-hidden="true"
          >
            P
          </span>
          <span className="text-lg font-semibold tracking-tight text-zinc-900">
            Perlimpinpin
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
          <div className="absolute left-0 right-0 top-full z-30 border-b border-zinc-200 bg-white px-6 py-4 shadow-lg md:hidden">
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
              </ul>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}
