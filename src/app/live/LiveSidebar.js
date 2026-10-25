import Link from "next/link";
import LogoutButton from "./LogoutButton";
import ScopeToggle from "./ScopeToggle";
import { SearchTrigger } from "./LiveSearch";
import { Avatar, Icon } from "./ui";

// Barre latérale de PerlimpinpinGo (refonte d'après la maquette) : marque,
// navigation (Analyses, Par candidat, Par thématique, Dossiers, Favoris),
// analyses récentes sur la page d'une analyse, et journaliste connecté en bas.
// Composant serveur : les sections repliables utilisent <details> (aucun JS).

// Nombre de candidats / thèmes visibles avant « Voir tous… »
const VISIBLE_COUNT = 5;

// Logo texte « / PERLIMPINPIN GO » + badge PRO (partagé entre la barre latérale
// desktop et la barre du haut mobile).
export function LiveBrand() {
  return (
    <Link href="/live" className="flex items-center gap-2.5" aria-label="Accueil de PerlimpinpinGo">
      <span className="text-[17px] font-semibold tracking-tight text-zinc-900">
        <span className="mr-1.5 text-zinc-500">/</span>PERLIMPINPIN GO
      </span>
      <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-px text-[11px] font-semibold uppercase tracking-wide text-blue-700">
        Pro
      </span>
    </Link>
  );
}

// Icône de recherche (barre latérale et barre du haut mobile) : ouvre le champ
// de recherche, le même que celui du bouton « Rechercher un sujet ».
export function LiveSearchIcon() {
  return (
    <SearchTrigger
      aria-label="Rechercher dans les analyses"
      title="Rechercher dans les analyses"
      className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-black/5 hover:text-zinc-900"
    >
      <Icon name="search" className="h-5 w-5" />
    </SearchTrigger>
  );
}

// Initiale du prénom/nom pour la pastille de profil
export function initialOf(nom) {
  return (nom?.trim()?.[0] ?? "?").toUpperCase();
}

// Pastille ronde de profil (barre latérale, barre du haut de l'accueil)
export function UserBadge({ user, size = "h-10 w-10 text-base" }) {
  return (
    <span
      aria-hidden="true"
      title={user.nom}
      className={`flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 ${size}`}
    >
      {initialOf(user.nom)}
    </span>
  );
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

// Vues de /live portées par ?vue= (analyses = /live sans paramètre), pour la
// navigation compacte mobile.
const MOBILE_NAV = [
  { vue: "analyses", label: "Analyses", icon: "chart", href: "/live" },
  { vue: "dossiers", label: "Dossiers", icon: "folder", href: "/live?vue=dossiers" },
  { vue: "favoris", label: "Favoris", icon: "star", href: "/live?vue=favoris" },
];

// Navigation compacte de la barre du haut mobile (la barre latérale est
// masquée sous lg).
export function LiveMobileNav({ vue }) {
  return (
    <nav aria-label="Navigation PerlimpinpinGo" className="mt-3">
      <ul className="flex gap-2">
        {MOBILE_NAV.map((item) => (
          <li key={item.vue}>
            <Link
              href={item.href}
              aria-current={item.vue === vue ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                item.vue === vue ? "bg-zinc-900 text-white" : "border border-[#e6e4de] bg-[#f8f7f4] text-zinc-600"
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

// Lien de premier niveau (Analyses, Dossiers, Favoris)
function NavLink({ href, icon, label, active }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium transition-colors ${
          active ? "bg-zinc-900 text-white" : "text-zinc-800 hover:bg-black/5"
        }`}
      >
        <Icon name={icon} className="h-5 w-5" />
        {label}
      </Link>
    </li>
  );
}

// Une ligne « nom … nombre » d'une section repliable
function CountRow({ href, label, count, active }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "true" : undefined}
        className={`flex items-center justify-between gap-3 rounded-lg py-1.5 pl-[46px] pr-3 text-sm transition-colors ${
          active ? "bg-black/5 font-medium text-zinc-900" : "text-zinc-600 hover:bg-black/5 hover:text-zinc-900"
        }`}
      >
        <span className="min-w-0 truncate">{label}</span>
        <span className="shrink-0 text-xs tabular-nums text-zinc-400">{count}</span>
      </Link>
    </li>
  );
}

// Section repliable « Par candidat » / « Par thématique ». Les premières lignes
// sont visibles, les suivantes dans un second <details> « Voir tous… ».
function Repliable({ icon, titre, items, deplie, voirTout, vide }) {
  const visibles = items.slice(0, VISIBLE_COUNT);
  const autres = items.slice(VISIBLE_COUNT);
  return (
    <li>
      <details open={deplie} className="group">
        <summary className="flex h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-3.5 text-[15px] font-medium text-zinc-800 transition-colors hover:bg-black/5 [&::-webkit-details-marker]:hidden">
          <Icon name={icon} className="h-5 w-5" />
          <span className="flex-1">{titre}</span>
          <Icon name="chevronDown" className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
        </summary>
        {items.length === 0 ? (
          <p className="py-1.5 pl-[46px] pr-3 text-xs text-zinc-400">{vide}</p>
        ) : (
          <ul className="mt-0.5 flex flex-col">
            {visibles.map((item) => (
              <CountRow key={item.key} {...item} />
            ))}
            {autres.length > 0 && (
              <li>
                <details className="group/more">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-1.5 pl-[46px] pr-3 text-xs text-zinc-500 hover:bg-black/5 hover:text-zinc-800 group-open/more:hidden [&::-webkit-details-marker]:hidden">
                    {voirTout}
                    <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  </summary>
                  <ul className="flex flex-col">
                    {autres.map((item) => (
                      <CountRow key={item.key} {...item} />
                    ))}
                  </ul>
                </details>
              </li>
            )}
          </ul>
        )}
      </details>
    </li>
  );
}

// Une analyse de la liste « Analyses récentes » (page d'une analyse)
function HistoryItem({ item, currentId, showAuthor }) {
  const current = item.id === currentId;
  return (
    <li
      className={`relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
        current ? "bg-black/[0.06]" : "hover:bg-black/[0.03]"
      }`}
    >
      <Avatar nom={item.candidatNom} photoUrl={item.candidatPhotoUrl} size={36} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug text-zinc-900">
          <Link
            href={`/live/analyses/${item.id}`}
            aria-current={current ? "page" : undefined}
            className="after:absolute after:inset-0 after:rounded-xl"
          >
            {item.titre}
          </Link>
        </p>
        <p className="mt-0.5 truncate text-xs text-zinc-400">
          {item.candidatNom ? `${item.candidatNom} · ` : ""}
          {item.dateLabel}
        </p>
        {showAuthor && <p className="truncate text-[11px] text-zinc-400">Par {item.auteurLabel}</p>}
      </div>
    </li>
  );
}

export default function LiveSidebar({
  vue,
  user,
  scope,
  candidats = [],
  themes = [],
  candidatActif = null,
  dossierActif = null,
  deplie = true,
  historique = null,
  currentId = null,
}) {
  const candidatItems = candidats.map((candidat) => ({
    key: candidat.id,
    href: `/live?candidat=${candidat.id}`,
    label: candidat.nom,
    count: candidat.count,
    active: candidat.id === candidatActif,
  }));
  const themeItems = themes.map((theme) => ({
    key: theme.slug,
    href: `/live?dossier=${theme.slug}`,
    label: theme.label,
    count: theme.count,
    active: theme.slug === dossierActif,
  }));

  return (
    <aside className="hidden lg:sticky lg:top-3 lg:m-3 lg:flex lg:h-[calc(100vh-24px)] lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[#e6e4de] lg:bg-[#f8f7f4]">
      <div className="flex items-center justify-between gap-2 px-6 pb-4 pt-6">
        <LiveBrand />
        <LiveSearchIcon />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
        <nav aria-label="Navigation PerlimpinpinGo">
          <ul className="flex flex-col gap-1">
            <NavLink href="/live" icon="chart" label="Analyses" active={vue === "analyses" && !candidatActif && !dossierActif} />
            <Repliable
              icon="users"
              titre="Par candidat"
              items={candidatItems}
              deplie={deplie || Boolean(candidatActif)}
              voirTout="Voir tous les candidats"
              vide="Aucune analyse rattachée à un candidat."
            />
            <Repliable
              icon="folder"
              titre="Par thématique"
              items={themeItems}
              deplie={deplie || Boolean(dossierActif)}
              voirTout="Voir toutes les thématiques"
              vide="Aucune analyse pour le moment."
            />
            <NavLink href="/live?vue=dossiers" icon="folder" label="Dossiers" active={vue === "dossiers"} />
            <NavLink href="/live?vue=favoris" icon="star" label="Favoris" active={vue === "favoris"} />
          </ul>
        </nav>

        {historique && (
          <section aria-labelledby="live-historique" className="mt-6 border-t border-[#e6e4de] pt-5">
            <div className="flex items-baseline justify-between gap-2 px-3">
              <h2 id="live-historique" className="text-sm text-zinc-500">
                Analyses récentes
              </h2>
              <Link href="/live" className="text-xs font-medium text-blue-600 hover:underline">
                Voir tout
              </Link>
            </div>
            <div className="mt-2 px-3">
              <ScopeToggle scope={scope} />
            </div>
            {historique.length === 0 ? (
              <p className="mt-3 px-3 text-sm text-zinc-400">
                {scope === "toutes" ? "Aucune analyse pour le moment." : "Vous n'avez pas encore lancé d'analyse."}
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-0.5">
                {historique.map((item) => (
                  <HistoryItem key={item.id} item={item} currentId={currentId} showAuthor={scope === "toutes"} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <div className="flex items-center gap-3 px-6 py-5">
        <UserBadge user={user} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-zinc-900" title={user.email}>
            {user.nom}
          </p>
          <LogoutButton className="!text-sm !text-zinc-500" />
        </div>
      </div>
    </aside>
  );
}
