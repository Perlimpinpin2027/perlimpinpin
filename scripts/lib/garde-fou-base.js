import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parse } from "dotenv";

// Garde-fou des scripts qui écrivent en base (import-adherents, reset-adherent) :
// avant toute écriture, affiche l'hôte Neon réellement ciblé, signale s'il s'agit
// de la base de .env (la production), et demande de taper « oui ».
//
// `import "dotenv/config"` ne remplace PAS une variable déjà définie : pour viser
// une branche de test, on définit DATABASE_URL dans le terminal avant de lancer
// le script, et c'est elle qui est utilisée (et affichée ici).

export function hoteDe(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// Hôte de DATABASE_URL tel qu'écrit dans le fichier .env (production), ou null.
function hoteDuFichierEnv() {
  try {
    return hoteDe(parse(readFileSync(join(process.cwd(), ".env"), "utf8")).DATABASE_URL);
  } catch {
    return null;
  }
}

// Affiche la base ciblée ; vrai seulement si l'utilisateur tape « oui ».
export async function confirmerEcriture({ host, question }) {
  const production = host !== null && host === hoteDuFichierEnv();
  console.log(`\nBase ciblée : ${host}`);
  if (production) {
    console.log("⚠  C'est la base de DATABASE_URL du fichier .env, donc la PRODUCTION.");
  } else {
    console.log("(DATABASE_URL définie dans le terminal : ce n'est pas la base du fichier .env.)");
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const reponse = await rl.question(`${question} Tapez « oui » pour confirmer : `);
    return reponse.trim().toLowerCase() === "oui";
  } finally {
    rl.close();
  }
}
