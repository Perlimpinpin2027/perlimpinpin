import { prisma } from "@/lib/prisma";
import { normalizeEmail, verifyPassword } from "@/lib/live-password";

// Accès aux comptes de /live (table LiveUser). Lecture seule côté application : les
// comptes sont créés par scripts/create-live-user.js, jamais par l'interface.

const PUBLIC_SELECT = { id: true, email: true, nom: true };

// Vérifie e-mail + mot de passe. Retourne { id, email, nom } ou null (adresse inconnue
// et mauvais mot de passe sont indiscernables, y compris par le temps de réponse).
export async function authenticateLiveUser(rawEmail, password) {
  const email = normalizeEmail(rawEmail);
  const user = email
    ? await prisma.liveUser.findUnique({ where: { email }, select: { ...PUBLIC_SELECT, motDePasseHash: true } })
    : null;
  const valid = await verifyPassword(password, user?.motDePasseHash);
  if (!user || !valid) return null;
  return { id: user.id, email: user.email, nom: user.nom };
}

// Compte par identifiant (null s'il n'existe plus).
export function getLiveUserById(id) {
  return prisma.liveUser.findUnique({ where: { id }, select: PUBLIC_SELECT });
}
