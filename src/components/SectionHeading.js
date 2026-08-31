// Titre de section avec accent vertical (fine barre bleu/indigo à gauche,
// cohérente avec le point décoratif bleu du Hero de l'accueil) — centralisé
// pour que toute page ayant besoin de ce motif (actuellement /a-propos)
// utilise exactement les mêmes classes plutôt que de les redéfinir.
export default function SectionHeading({ children, className = "" }) {
  return (
    <h2 className={`border-l-2 border-indigo-400 pl-3 text-xl font-bold leading-tight text-zinc-900 ${className}`}>
      {children}
    </h2>
  );
}
