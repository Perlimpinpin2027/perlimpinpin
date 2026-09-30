import { normalizeEmail } from "../../src/lib/live-password.js";

// Lecture de la liste des adhérents (CSV « email;nom » ou « email,nom », une
// ligne par adhérent). Fonctions PURES (ni fichier, ni base) : testées par
// scripts/adherents-csv.test.js.

export const NOM_MAX_LENGTH = 80;

// Séparateur détecté sur la première ligne non vide (en-tête ou première
// donnée) : « ; » s'il y en a, sinon « , ». Les caractères entre guillemets ne
// comptent pas (un nom "Dupont, Camille" ne fait pas croire à des virgules).
export function detecterSeparateur(texte) {
  const premiere = String(texte).replace(/^﻿/, "").split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  let entreGuillemets = false;
  let pointsVirgules = 0;
  let virgules = 0;
  for (const c of premiere) {
    if (c === '"') entreGuillemets = !entreGuillemets;
    else if (!entreGuillemets && c === ";") pointsVirgules += 1;
    else if (!entreGuillemets && c === ",") virgules += 1;
  }
  return pointsVirgules > 0 || virgules === 0 ? ";" : ",";
}

// Découpe CSV (RFC 4180) : champs entre guillemets pouvant contenir le
// séparateur ou un retour à la ligne, « "" » pour un guillemet. Renvoie
// [{ ligne, contenu, champs, erreur? }] ; `ligne` est le numéro de la ligne où
// commence l'enregistrement, `contenu` son texte brut.
export function decouperCsv(texte, separateur) {
  const source = String(texte).replace(/^﻿/, "");
  const enregistrements = [];
  let ligne = 1;
  let debutLigne = 1;
  let debut = 0;
  let champs = [];
  let champ = "";
  let entreGuillemets = false;
  let ouvert = false; // champ commencé par un guillemet

  const finChamp = () => {
    champs.push(ouvert ? champ : champ.trim());
    champ = "";
    ouvert = false;
  };
  const finEnregistrement = (fin) => {
    finChamp();
    const contenu = source.slice(debut, fin).replace(/\r$/, "");
    enregistrements.push({ ligne: debutLigne, contenu, champs });
    champs = [];
  };

  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (entreGuillemets) {
      if (c === '"' && source[i + 1] === '"') {
        champ += '"';
        i += 1;
      } else if (c === '"') {
        entreGuillemets = false;
      } else {
        if (c === "\n") ligne += 1;
        champ += c;
      }
    } else if (c === '"' && champ.trim() === "" && !ouvert) {
      // Guillemet en début de champ (espaces éventuels ignorés)
      entreGuillemets = true;
      ouvert = true;
      champ = "";
    } else if (c === separateur) {
      finChamp();
    } else if (c === "\n") {
      finEnregistrement(i);
      ligne += 1;
      debutLigne = ligne;
      debut = i + 1;
    } else if (c !== "\r" || source[i + 1] !== "\n") {
      if (!ouvert) champ += c; // après un guillemet fermant, seuls des espaces sont attendus
      else if (c.trim() !== "") champ += c;
    }
  }
  if (entreGuillemets) {
    enregistrements.push({
      ligne: debutLigne,
      contenu: source.slice(debut).replace(/\r?\n$/, ""),
      champs: [],
      erreur: "guillemet non fermé",
    });
  } else if (source.slice(debut).trim() !== "") {
    finEnregistrement(source.length);
  }
  return enregistrements;
}

// { separateur, valides: [{ ligne, email, nom }], invalides: [{ ligne, contenu, raison }] }.
// Ignorés sans être signalés : lignes vides, en-tête « email;nom » / « email,nom ».
export function lireCsvAdherents(texte) {
  const separateur = detecterSeparateur(texte);
  const valides = [];
  const invalides = [];
  const vus = new Map(); // email → numéro de la première ligne

  decouperCsv(texte, separateur).forEach((enr, index) => {
    const { ligne, contenu, champs } = enr;
    if (champs.length === 1 && champs[0] === "" && !enr.erreur) return; // ligne vide
    if (index === 0 && champs[0]?.toLowerCase() === "email") return; // en-tête

    if (enr.erreur) {
      invalides.push({ ligne, contenu, raison: enr.erreur });
      return;
    }
    if (champs.length !== 2) {
      invalides.push({ ligne, contenu, raison: `format attendu : email${separateur}nom` });
      return;
    }
    const email = normalizeEmail(champs[0]);
    const nom = champs[1].replace(/\s+/g, " ").trim();
    if (!email) {
      invalides.push({ ligne, contenu, raison: "adresse e-mail invalide" });
    } else if (nom.length < 2 || nom.length > NOM_MAX_LENGTH) {
      invalides.push({ ligne, contenu, raison: `nom manquant ou trop long (2 à ${NOM_MAX_LENGTH} caractères)` });
    } else if (vus.has(email)) {
      invalides.push({ ligne, contenu, raison: `adresse en double (déjà ligne ${vus.get(email)})` });
    } else {
      vus.set(email, ligne);
      valides.push({ ligne, email, nom });
    }
  });

  return { separateur, valides, invalides };
}
