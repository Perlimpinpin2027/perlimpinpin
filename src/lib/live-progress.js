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

// Profils de rythme. « rapide » (défaut) : celui des actions de 15 à 60 s. « approfondie » :
// analyse avec recherche web (1 à 3 minutes) : ~20 % au démarrage, puis une montée
// étalée (≈ 60 % à 1 min, ≈ 80 % à 2 min, ≈ 86 % à 3 min) qui ne stagne pas trop tôt.
export const PROGRESS_PROFILES = {
  rapide: { fastShare: PROGRESS_FAST_SHARE, fastTau: FAST_TIME_CONSTANT_S, slowTau: SLOW_TIME_CONSTANT_S, messageEvery: 3.5 },
  approfondie: { fastShare: 20, fastTau: 5, slowTau: 75, messageEvery: 14 },
};

// Progression (0 à PROGRESS_CEILING, exclu) après `seconds` secondes.
export function simulatedProgress(seconds, profile = "rapide") {
  const { fastShare, fastTau, slowTau } = PROGRESS_PROFILES[profile] ?? PROGRESS_PROFILES.rapide;
  const t = Math.max(0, seconds);
  const fast = fastShare * (1 - Math.exp(-t / fastTau));
  const slow = (PROGRESS_CEILING - fastShare) * (1 - Math.exp(-t / slowTau));
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
