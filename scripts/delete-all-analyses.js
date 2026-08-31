// Suppression applicative de TOUTES les lignes Analyse, pour repartir sur des
// fiches générées avec la méthodologie finale (document 36 / v1.0).
//
// PAS une migration Prisma, ne touche à aucun schéma, ne dépend pas de
// SHADOW_DATABASE_URL — juste deux deleteMany() dans une transaction.
//
// Ordre imposé par la contrainte réelle trouvée en base avant d'écrire ce
// script (Feedback_analyseId_fkey : Feedback.analyseId -> Analyse.id,
// ON DELETE RESTRICT) : supprimer Feedback avant Analyse, sinon la suppression
// des Analyse échoue avec une violation de clé étrangère. Candidat,
// Proposition et VoteMesure ne sont concernés par aucune des deux
// suppressions (VoteMesure référence Proposition, pas Analyse).
//
// Backup pris avant toute exécution : branche Neon
// "production_backup_avant_suppression_analyses" (br-twilight-wildflower-as6owpxu),
// créée depuis production.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const result = await prisma.$transaction(async (tx) => {
  const feedback = await tx.feedback.deleteMany();
  const analyse = await tx.analyse.deleteMany();
  return { feedback: feedback.count, analyse: analyse.count };
});

console.log("Feedback supprimés :", result.feedback);
console.log("Analyse supprimées :", result.analyse);

await prisma.$disconnect();
