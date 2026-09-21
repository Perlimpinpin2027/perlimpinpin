// Regroupement temporel de l'historique : « Aujourd'hui », « Cette semaine »,
// « Plus ancien ». Le découpage se fait sur les JOURS CALENDAIRES du fuseau de
// la rédaction (et non sur des tranches de 24 h) : une analyse faite à 23 h 30
// n'est plus « aujourd'hui » après minuit. Le serveur (Vercel) tourne en UTC :
// le fuseau doit donc être explicite.
//
//   - Aujourd'hui   : même jour calendaire ;
//   - Cette semaine : les 6 jours précédents (fenêtre glissante de 7 jours,
//     aujourd'hui compris) — pas la semaine calendaire, qui serait vide le lundi ;
//   - Plus ancien   : au-delà.

export const HISTORY_TIME_ZONE = "Europe/Paris";

const GROUPS = [
  { id: "aujourdhui", label: "Aujourd'hui" },
  { id: "semaine", label: "Cette semaine" },
  { id: "ancien", label: "Plus ancien" },
];

// « 2026-09-21 » : jour calendaire d'un instant dans le fuseau donné
function calendarDay(date, timeZone) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

const DAY_MS = 86_400_000;
const dayNumber = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
};

// Groupe d'un instant par rapport à `now` : "aujourdhui" | "semaine" | "ancien"
export function periodOf(date, now = new Date(), timeZone = HISTORY_TIME_ZONE) {
  const instant = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(instant.getTime())) return "ancien";
  const gap = dayNumber(calendarDay(now, timeZone)) - dayNumber(calendarDay(instant, timeZone));
  if (gap <= 0) return "aujourdhui"; // aujourd'hui (ou horloge légèrement en avance)
  if (gap < 7) return "semaine";
  return "ancien";
}

// Répartit les éléments (ayant un champ `createdAt`, du plus récent au plus
// ancien) en groupes ordonnés ; les groupes vides sont omis. L'ordre des
// éléments est conservé à l'intérieur de chaque groupe.
export function groupByPeriod(items, now = new Date(), timeZone = HISTORY_TIME_ZONE) {
  const byId = new Map(GROUPS.map((group) => [group.id, []]));
  for (const item of items) byId.get(periodOf(item.createdAt, now, timeZone)).push(item);
  return GROUPS.map((group) => ({ ...group, items: byId.get(group.id) })).filter((group) => group.items.length > 0);
}
