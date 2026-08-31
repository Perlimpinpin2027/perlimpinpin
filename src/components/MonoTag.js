// Tag monospace partagé par tout le site ("// DÉCLARATIONS", "// 01",
// "// ANALYSE_012"...) — centralisé pour que chaque page utilise exactement
// les mêmes classes (police à chasse fixe, gris moyen, petite taille,
// majuscules, tracking élargi) au lieu de les recoder à chaque fois, cause
// probable des incohérences visuelles observées avant ce composant.
// `children` est le texte SANS le préfixe "// " (ajouté ici une seule fois,
// avec l'espace après le double slash).
export default function MonoTag({ children, className = "" }) {
  return (
    <span className={`font-mono text-xs font-semibold uppercase tracking-widest text-zinc-400 ${className}`}>
      {`// ${children}`}
    </span>
  );
}
