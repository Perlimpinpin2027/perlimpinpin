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
  return (
    <header className="sticky top-0 z-30 flex w-full items-center justify-between gap-6 border-b border-zinc-200 bg-white px-6 py-4 sm:px-8">
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
        className="flex shrink-0 items-center gap-2 text-sm font-medium text-zinc-700 transition-colors hover:text-zinc-950"
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
    </header>
  );
}
