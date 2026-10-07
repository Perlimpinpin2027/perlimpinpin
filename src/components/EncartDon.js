// Encart « Soutenez-nous » : lien vers le formulaire de don HelloAsso.
// Pleine largeur sur mobile, plafonné à 320px à partir de md (768px).
const LIEN_DON =
  "https://www.helloasso.com/associations/perlimpinpin-ai/formulaires/2";

// Cœur orange entouré de petits traits (effet « rayonnant »).
function CoeurRayonnant() {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-12 w-12 shrink-0"
      fill="none"
    >
      <g stroke="#F0612E" strokeWidth="2" strokeLinecap="round">
        <line x1="24" y1="3" x2="24" y2="8" />
        <line x1="9" y1="9" x2="12.5" y2="12.5" />
        <line x1="39" y1="9" x2="35.5" y2="12.5" />
        <line x1="3" y1="24" x2="7" y2="24" />
        <line x1="45" y1="24" x2="41" y2="24" />
      </g>
      <path
        d="M24 40c-1-.8-13-8.6-13-17.2C11 18.5 14.2 15 18.2 15c2.5 0 4.6 1.3 5.8 3.3 1.2-2 3.3-3.3 5.8-3.3 4 0 7.2 3.5 7.2 7.8C37 31.4 25 39.2 24 40z"
        fill="#F0612E"
      />
    </svg>
  );
}

export default function EncartDon() {
  return (
    <aside className="w-full rounded-2xl bg-gradient-to-br from-[#FFF4EE] to-[#FDE6DA] p-6 md:max-w-[320px]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-bold text-zinc-900">Soutenez-nous !</p>
          <p className="mt-1 text-sm text-zinc-600">
            Faites un don sur HelloAsso !
          </p>
        </div>
        <CoeurRayonnant />
      </div>
      <a
        href={LIEN_DON}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center justify-center rounded-full bg-[#111827] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-700"
      >
        Faire un don →
      </a>
    </aside>
  );
}
