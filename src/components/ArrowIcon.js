// Flèche minimaliste partagée (trait fin, pas d'emoji) pour tous les
// votes/CTA du site (↑/↓ pour les votes, → pour les CTA/liens cliquables
// via le même tracé pivoté au besoin). Centralisée : était dupliquée à
// l'identique dans FeedbackWidget.js et VoteMesureWidget.js.
export default function ArrowIcon({ direction = "up", className = "h-4 w-4" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={className}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={
          direction === "up"
            ? "M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75"
            : "M12 4.5v15m0 0-6.75-6.75M12 19.5l6.75-6.75"
        }
      />
    </svg>
  );
}
