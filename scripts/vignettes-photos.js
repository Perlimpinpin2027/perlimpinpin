// Génère les vignettes des photos de candidats : public/photos/x.jpg →
// public/photos/vignettes/x.webp (128×160, même cadrage 4:5 que l'original).
// Les listes affichent les photos en 36 à 64 px : inutile d'y charger
// l'original 800×1000 (~200 Ko) quand une vignette de quelques Ko suffit.
//
// Écrit aussi src/lib/photo-vignettes.json (liste des vignettes disponibles) :
// src/lib/photo-vignette.js ne pointe vers une vignette que si elle y figure,
// sinon il garde la grande photo (nouveau candidat sans vignette = rien de cassé).
//
// À relancer après l'ajout ou le remplacement d'une photo :
//   npm run vignettes
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, parse } from "node:path";
import sharp from "sharp";

const PHOTOS_DIR = "public/photos";
const VIGNETTES_DIR = join(PHOTOS_DIR, "vignettes");
const MANIFEST = "src/lib/photo-vignettes.json";

mkdirSync(VIGNETTES_DIR, { recursive: true });

const noms = [];
for (const fichier of readdirSync(PHOTOS_DIR).sort()) {
  const { name, ext } = parse(fichier);
  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext.toLowerCase())) continue;

  const cible = join(VIGNETTES_DIR, `${name}.webp`);
  // position "top" : les <img> des listes sont en object-top, on garde le visage.
  await sharp(join(PHOTOS_DIR, fichier))
    .rotate()
    .resize(128, 160, { fit: "cover", position: "top" })
    .webp({ quality: 80 })
    .toFile(cible);
  noms.push(fichier);
  console.log(`${fichier} → ${cible}`);
}

writeFileSync(MANIFEST, `${JSON.stringify(noms, null, 2)}\n`);
console.log(`${noms.length} vignettes, liste écrite dans ${MANIFEST}`);
