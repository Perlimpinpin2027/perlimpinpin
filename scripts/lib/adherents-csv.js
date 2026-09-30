import { normalizeEmail } from "../../src/lib/live-password.js";

// Lecture de la liste des adhérents (CSV « email;nom », une ligne par adhérent).
// Fonction PURE (ni fichier, ni base) : testée par scripts/adherents-csv.test.js.

export const NOM_MAX_LENGTH = 80;

function sansGuillemets(valeur) {
  const texte = valeur.trim();
  return texte.length >= 2 && texte.startsWith('"') && texte.endsWith('"')
    ? texte.slice(1, -1).replace(/""/g, '"').trim()
    : texte;
}

// { valides: [{ ligne, email, nom }], invalides: [{ ligne, contenu, raison }] }.
// Ignorés sans être signalés : lignes vides, en-tête « email;nom ».
export function lireCsvAdherents(texte) {
  const valides = [];
  const invalides = [];
  const vus = new Map(); // email → numéro de la première ligne

  const lignes = String(texte).replace(/^﻿/, "").split(/\r?\n/);
  lignes.forEach((brute, index) => {
    const ligne = index + 1;
    if (brute.trim() === "") return;

    const champs = brute.split(";").map(sansGuillemets);
    if (index === 0 && champs[0].toLowerCase() === "email") return; // en-tête

    if (champs.length !== 2) {
      invalides.push({ ligne, contenu: brute, raison: "format attendu : email;nom" });
      return;
    }
    const email = normalizeEmail(champs[0]);
    const nom = champs[1].replace(/\s+/g, " ");
    if (!email) {
      invalides.push({ ligne, contenu: brute, raison: "adresse e-mail invalide" });
    } else if (nom.length < 2 || nom.length > NOM_MAX_LENGTH) {
      invalides.push({ ligne, contenu: brute, raison: `nom manquant ou trop long (2 à ${NOM_MAX_LENGTH} caractères)` });
    } else if (vus.has(email)) {
      invalides.push({ ligne, contenu: brute, raison: `adresse en double (déjà ligne ${vus.get(email)})` });
    } else {
      vus.set(email, ligne);
      valides.push({ ligne, email, nom });
    }
  });

  return { valides, invalides };
}
