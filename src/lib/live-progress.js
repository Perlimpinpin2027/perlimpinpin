// Courbe de progression SIMULÉE pour les actions IA de /live (analyse, puis
// plus tard questions d'interview, segmentation de transcript…). Elle ne
// mesure rien : elle dépend uniquement du temps écoulé.
//
// Deux phases exponentielles :
//   - rapide : ~60 % atteints en 6 à 7 secondes ;
//   - lente  : la barre continue de monter vers un plafond de 93 %, sans
//     jamais l'atteindre (asymptote), tant que la vraie réponse n'est pas là.
// À l'arrivée de la réponse, le composant complète lui-même jusqu'à 100 %.

export const PROGRESS_FAST_SHARE = 60;
export const PROGRESS_CEILING = 93;

const FAST_TIME_CONSTANT_S = 2;
const SLOW_TIME_CONSTANT_S = 20;

// Progression (0 à PROGRESS_CEILING, exclu) après `seconds` secondes.
export function simulatedProgress(seconds) {
  const t = Math.max(0, seconds);
  const fast = PROGRESS_FAST_SHARE * (1 - Math.exp(-t / FAST_TIME_CONSTANT_S));
  const slow = (PROGRESS_CEILING - PROGRESS_FAST_SHARE) * (1 - Math.exp(-t / SLOW_TIME_CONSTANT_S));
  // Plafond explicite : en flottant, l'exponentielle finit par valoir 0 et
  // l'asymptote serait atteinte pour de très grandes durées.
  return Math.min(fast + slow, PROGRESS_CEILING - 0.01);
}

// Index du message à afficher : on avance d'un message toutes les
// `everySeconds` secondes puis on reste sur le dernier (« Finalisation… »),
// plutôt que de reboucler sur le premier.
export function messageIndex(seconds, count, everySeconds = 3.5) {
  if (count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor(seconds / everySeconds)));
}
