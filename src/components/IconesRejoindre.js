// Icônes de la page /nous-rejoindre, en SVG inline (pas de librairie
// d'icônes dans le projet). Tracés repris du jeu « Lucide » (licence ISC),
// trait 1.8 comme les icônes du Header.

function IconBase({ className = "h-6 w-6", children }) {
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

export function IconeBalance({ className }) {
  return (
    <IconBase className={className}>
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </IconBase>
  );
}

export function IconeLoupe({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </IconBase>
  );
}

// Deux personnes + une petite étincelle en haut à droite.
export function IconePersonnesEtincelle({ className }) {
  return (
    <IconBase className={className}>
      <path d="M14 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="7.5" cy="7" r="4" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M18.5 3.5 19 5l1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5Z" />
    </IconBase>
  );
}

export function IconeFusee({ className }) {
  return (
    <IconBase className={className}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </IconBase>
  );
}

export function IconeInstitution({ className }) {
  return (
    <IconBase className={className}>
      <path d="M3 22h18" />
      <path d="M6 18v-7" />
      <path d="M10 18v-7" />
      <path d="M14 18v-7" />
      <path d="M18 18v-7" />
      <path d="m12 2 8 5H4Z" />
      <path d="M4 18h16" />
    </IconBase>
  );
}
