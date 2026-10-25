import { LiveBrand, LiveMobileNav, LiveMobileUser, LiveSearchIcon } from "./LiveSidebar";

// Coquille commune des pages de PerlimpinpinGo (accueil /live et page d'une
// analyse) : fond gris chaud, barre latérale en carte à gauche, contenu à
// droite. Plus de troisième colonne (refonte d'après la maquette).
//   - sidebar : la barre latérale (<LiveSidebar />), masquée sous lg ;
//   - topBar  : boutons alignés à droite en haut du contenu (desktop uniquement) ;
//   - vue, user : pour la barre du haut mobile.
export default function LiveShell({ sidebar, topBar = null, vue, user, children }) {
  return (
    <div className="bg-go min-h-screen font-sans lg:grid lg:grid-cols-[324px_minmax(0,1fr)]">
      {sidebar}

      {/* Barre du haut, mobile uniquement (la barre latérale est masquée sous lg) */}
      <div className="border-b border-[#e6e4de] bg-[#f8f7f4] px-5 py-4 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <LiveBrand />
          <LiveSearchIcon />
        </div>
        <LiveMobileNav vue={vue} />
        <LiveMobileUser user={user} />
      </div>

      <main className="min-w-0 px-5 pb-12 pt-6 sm:px-8 lg:pb-16 lg:pl-6 lg:pr-8 lg:pt-6">
        {topBar && <div className="mb-6 hidden items-center justify-end gap-3 lg:flex">{topBar}</div>}
        {children}
      </main>
    </div>
  );
}
