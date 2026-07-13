import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const candidatesData = [
  { nom: "Marine Le Pen", parti: "Rassemblement National" },
  { nom: "Jean-Luc Mélenchon", parti: "La France insoumise" },
  { nom: "Édouard Philippe", parti: "Horizons" },
  { nom: "Raphaël Glucksmann", parti: "Place publique" },
  { nom: "Gabriel Attal", parti: "Renaissance" },
  { nom: "Marine Tondelier", parti: "Les Écologistes" },
  { nom: "Bruno Retailleau", parti: "Les Républicains" },
];

async function main() {
  // Repartir d'une base propre pour que le seed soit rejouable.
  await prisma.analyse.deleteMany();
  await prisma.proposition.deleteMany();
  await prisma.candidat.deleteMany();

  for (const data of candidatesData) {
    const candidat = await prisma.candidat.create({
      data: {
        nom: data.nom,
        parti: data.parti,
        photoUrl: null,
        scoreMoyen: null,
      },
    });

    console.log(`✓ ${candidat.nom} (${candidat.parti})`);
  }

  console.log("Seed terminé.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
