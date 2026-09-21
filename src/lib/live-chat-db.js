import { prisma } from "@/lib/prisma";

// Accès aux messages du chat d'une analyse (table LiveChatMessage).
//
// INSERTION SEULE : ce fichier n'expose que la lecture et la création. Aucune
// modification ni suppression (cohérent avec les autres tables de /live) ; un test
// (scripts/live-chat.test.js) vérifie qu'aucune fonction d'écriture destructive
// n'est ajoutée ici ou dans la route du chat.

const MAX_LIST = 200;

// Messages d'une analyse, du plus ancien au plus récent.
export async function getLiveChatMessages(analyseId, { limit = MAX_LIST } = {}) {
  const rows = await prisma.liveChatMessage.findMany({
    where: { analyseId },
    // createdAt identique pour les deux lignes d'un échange (même transaction) : l'id départage
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
  });
  return rows.map((row) => ({ id: row.id, role: row.role, content: row.content, createdAt: row.createdAt.toISOString() }));
}

export async function countLiveChatMessages(analyseId) {
  return prisma.liveChatMessage.count({ where: { analyseId } });
}

// Ajoute un échange (la question puis sa réponse) en une seule transaction :
// jamais une question sans réponse enregistrée. Retourne les deux messages créés.
export async function saveLiveChatExchange(analyseId, question, answer) {
  const select = { id: true, role: true, content: true, createdAt: true };
  const [user, assistant] = await prisma.$transaction([
    prisma.liveChatMessage.create({ data: { analyseId, role: "user", content: question }, select }),
    prisma.liveChatMessage.create({ data: { analyseId, role: "assistant", content: answer }, select }),
  ]);
  return [user, assistant].map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  }));
}
