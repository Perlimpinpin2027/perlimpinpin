import { Avatar, Icon } from "./ui";

// Logo PERLIMPINPIN GO + badge PRO (partagé entre la barre latérale desktop
// et la barre du haut mobile).
export function LiveBrand() {
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- logo statique, comme le Header */}
      <img src="/logo/perlimpinpin-logo.png" alt="Perlimpinpin" className="h-[17.6px] w-auto" />
      <span className="font-mono text-sm font-bold tracking-widest text-zinc-900">GO</span>
      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700">
        Pro
      </span>
    </div>
  );
}

function NavItem({ icon, label, active = false }) {
  if (active) {
    return (
      <li>
        <span
          aria-current="page"
          className="flex items-center gap-3 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
        >
          <Icon name={icon} />
          {label}
        </span>
      </li>
    );
  }
  // Non fonctionnel pour l'instant : affiché grisé, sans action.
  return (
    <li>
      <span
        title="Bientôt disponible"
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400"
      >
        <Icon name={icon} />
        {label}
      </span>
    </li>
  );
}

export default function LiveSidebar({ historique }) {
  return (
    <aside className="hidden flex-col border-r border-zinc-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div className="px-5 py-5">
        <LiveBrand />
      </div>

      <nav aria-label="Navigation PerlimpinpinGo" className="px-3">
        <ul className="flex flex-col gap-1">
          <NavItem icon="chart" label="Analyses" active />
          <NavItem icon="folder" label="Dossiers" />
          <NavItem icon="star" label="Favoris" />
        </ul>
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
        <h2 className="px-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Historique
        </h2>
        {historique.length === 0 ? (
          <p className="mt-3 px-3 text-sm text-zinc-400">Aucune analyse pour le moment.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-0.5 overflow-y-auto">
            {historique.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-lg px-3 py-2">
                <Avatar nom={item.candidatNom} photoUrl={item.candidatPhotoUrl} size={28} />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm leading-snug text-zinc-800">{item.titre}</p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">
                    {item.candidatNom ? `${item.candidatNom} · ` : ""}
                    {item.dateLabel}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
          >
            É
          </span>
          <div>
            <p className="text-sm font-medium text-zinc-800">Équipe éditoriale</p>
            <p className="text-xs text-zinc-400">Accès partagé</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
