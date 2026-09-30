import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function formatDate(date) {
  return date.toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Liste les commentaires de relecture (/relectures), groupés par fiche puis
// par section, triés par date. Filtre optionnel sur ficheSlug :
//   node scripts/relecture-comments.js lisnard-cee-carburant
//
// --json : sortie JSON (lecture seule, directement en base), au même format que
// GET /api/relectures/comments?fiche=<slug> — un tableau trié par date, chaque
// commentaire avec son id, sectionId, authorName, body, quotedText… C'est ce que
// lit le traitement d'une relecture close, l'API étant réservée aux adhérents
// connectés :
//   node scripts/relecture-comments.js lisnard-cee-carburant --json
async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const ficheSlug = args.find((arg) => !arg.startsWith("--"));

  if (json) {
    const list = await prisma.relectureComment.findMany({
      where: ficheSlug ? { ficheSlug } : undefined,
      orderBy: { createdAt: "asc" },
    });
    console.log(JSON.stringify(list, null, 2));
    return;
  }

  const comments = await prisma.relectureComment.findMany({
    where: ficheSlug ? { ficheSlug } : undefined,
    orderBy: [{ ficheSlug: "asc" }, { sectionId: "asc" }, { createdAt: "asc" }],
  });

  if (comments.length === 0) {
    console.log(
      ficheSlug
        ? `Aucun commentaire pour la fiche "${ficheSlug}".`
        : "Aucun commentaire de relecture.",
    );
    return;
  }

  let currentFiche = null;
  let currentSection = null;

  for (const comment of comments) {
    if (comment.ficheSlug !== currentFiche) {
      currentFiche = comment.ficheSlug;
      currentSection = null;
      console.log("");
      console.log(`=== ${currentFiche} ===`);
    }
    if (comment.sectionId !== currentSection) {
      currentSection = comment.sectionId;
      console.log(`-- ${comment.sectionLabel || comment.sectionId} --`);
    }
    console.log(`[${formatDate(comment.createdAt)}] ${comment.authorName || "Anonyme"} : ${comment.body}`);
  }
  console.log("");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
