import Link from "next/link";
import FavoriteButton from "./FavoriteButton";
import LogoutButton from "./LogoutButton";
import ScopeToggle from "./ScopeToggle";
import { groupByPeriod } from "@/lib/live-periods";
import { SearchTrigger } from "./LiveSearch";
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

// Icône de recherche (barre latérale et barre du haut mobile) : ouvre le champ
// de recherche, le même que celui de la carte « Rechercher un sujet ».
export function LiveSearchIcon() {
  return (
    <SearchTrigger
      aria-label="Rechercher dans les analyses"
      title="Rechercher dans les analyses"
      className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
    >
      <Icon name="search" className="h-5 w-5" />
    </SearchTrigger>
  );
}

// Initiale du prénom/nom pour la pastille de profil
function initialOf(nom) {
  return (nom?.trim()?.[0] ?? "?").toUpperCase();
}

// Journaliste connecté, dans la barre du haut mobile (la barre latérale est masquée sous lg)
export function LiveMobileUser({ user }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-zinc-500">
      <span className="min-w-0 truncate">
        Connecté : <span className="font-medium text-zinc-800">{user.nom}</span>
      </span>
      <LogoutButton className="shrink-0" />
    </div>
  );
}

// Vues de /live, portées par ?vue= (analyses = /live sans paramètre).
const NAV = [
  { vue: "analyses", label: "Analyses", icon: "chart", href: "/live" },
  { vue: "dossiers", label: "Dossiers", icon: "folder", href: "/live?vue=dossiers" },
  { vue: "favoris", label: "Favoris", icon: "star", href: "/live?vue=favoris" },
];

function NavItem({ item, active }) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        }`}
      >
        <Icon name={item.icon} />
        {item.label}
      </Link>
    </li>
  );
}

// Navigation compacte de la barre du haut mobile (la barre latérale est
// masquée sous lg).
export function LiveMobileNav({ vue }) {
  return (
    <nav aria-label="Navigation PerlimpinpinGo" className="mt-3">
      <ul className="flex gap-2">
        {NAV.map((item) => (
          <li key={item.vue}>
            <Link
              href={item.href}
              aria-current={item.vue === vue ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                item.vue === vue ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              <Icon name={item.icon} className="h-4 w-4" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Une analyse de l'historique : lien étendu à toute la ligne, étoile cliquable.
function HistoryItem({ item, currentId, showAuthor }) {
  return (
    <li
      className={`relative flex items-start gap-2 rounded-lg px-3 py-2 transition-colors ${
        item.id === currentId ? "bg-zinc-100" : "hover:bg-zinc-50"
      }`}
    >
      <Avatar nom={item.candidatNom} photoUrl={item.candidatPhotoUrl} size={28} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug text-zinc-800">
          <Link href={`/live/analyses/${item.id}`} className="after:absolute after:inset-0 after:rounded-lg">
            {item.titre}
          </Link>
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-400">
          {item.candidatNom ? `${item.candidatNom} · ` : ""}
          {item.dateLabel}
        </p>
        {showAuthor && <p className="truncate text-[11px] text-zinc-400">Par {item.auteurLabel}</p>}
      </div>
      <span className="relative z-10">
        <FavoriteButton id={item.id} favori={item.favori} />
      </span>
    </li>
  );
}

export default function LiveSidebar({ historique, vue, user, scope, dossierLabel = null, currentId = null }) {
  // Historique regroupé : Aujourd'hui / Cette semaine / Plus ancien (jours calendaires de Paris)
  const groupes = groupByPeriod(historique);

  return (
    <aside className="hidden flex-col border-r border-zinc-200 bg-white lg:sticky lg:top-0 lg:flex lg:h-screen">
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <LiveBrand />
        <LiveSearchIcon />
      </div>

      <nav aria-label="Navigation PerlimpinpinGo" className="px-3">
        <ul className="flex flex-col gap-1">
          {NAV.map((item) => (
            <NavItem key={item.vue} item={item} active={item.vue === vue} />
          ))}
        </ul>
      </nav>

      <div className="mt-6 flex min-h-0 flex-1 flex-col px-3">
        <h2 className="px-3 font-mono text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
          Historique
        </h2>
        <div className="mt-2 px-3">
          <ScopeToggle scope={scope} />
        </div>
        {dossierLabel && (
          <p className="mt-1 px-3 text-xs text-indigo-600">Dossier : {dossierLabel}</p>
        )}
        {historique.length === 0 ? (
          <p className="mt-3 px-3 text-sm text-zinc-400">
            {scope === "toutes" ? "Aucune analyse pour le moment." : "Vous n'avez pas encore lancé d'analyse."}
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-3 overflow-y-auto">
            {groupes.map((groupe) => (
              <section key={groupe.id} aria-label={groupe.label}>
                <h3 className="px-3 text-[11px] font-medium text-zinc-400">{groupe.label}</h3>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {groupe.items.map((item) => (
                    <HistoryItem key={item.id} item={item} currentId={currentId} showAuthor={scope === "toutes"} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700"
          >
            {initialOf(user.nom)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-zinc-800" title={user.email}>
              {user.nom}
            </p>
            <LogoutButton />
          </div>
        </div>
      </div>
    </aside>
  );
}
