// Titre avec un mot en gris clair et en italique, comme « vraiment » dans
// HeroText. Seule la première occurrence de `motItalique` est concernée.
// mr-[0.15em] : correction d'italique, sinon la dernière lettre penchée
// touche le mot suivant.
export default function TitreAvecItalique({ titre, motItalique }) {
  const position = motItalique ? titre.indexOf(motItalique) : -1;
  if (position === -1) return titre;
  const fin = position + motItalique.length;
  return (
    <>
      {titre.slice(0, position)}
      <span className="mr-[0.15em] italic text-zinc-400">{motItalique}</span>
      {titre.slice(fin)}
    </>
  );
}
