// Robot « Mettre en relecture » (.github/workflows/mettre-en-relecture.yml).
// Équivalent GitHub Actions de « Claude outputs/mettre-en-relecture.ps1 » : les
// fiches sont déposées dans data/a-relire/, puis le workflow est lancé à la main.
// Ce script n'ajoute rien au comportement local de scripts/relecture.js : il en
// réutilise les fonctions.
//
//   node scripts/robot-relecture.js verifier
//     Lit FICHES (noms séparés par des espaces, sans .json) et FIN (HH:MM,
//     facultatif). Vérifie que chaque data/a-relire/<nom>.json existe et que
//     la clôture ne tombe pas la nuit (sinon : arrêt avec une heure proposée).
//     Écrit slugs=<noms> dans $GITHUB_OUTPUT.
//
//   node scripts/robot-relecture.js controler
//     Vérifie que les changements indexés (git add -A fait avant) ne touchent
//     que data/relectures/, public/relectures/ et data/a-relire/.
//
//   node scripts/robot-relecture.js lancer [--dry-run]
//     Pour chaque fiche de SLUGS : attend qu'elle soit en ligne (toutes les 20 s,
//     6 min au maximum ; pas d'attente en --dry-run), puis lance le chrono
//     jusqu'à FIN avec lancer() de scripts/relecture.js. Écrit dans
//     $GITHUB_STEP_SUMMARY les fiches, l'heure de fin et le mail aux adhérents.
//
//   node scripts/robot-relecture.js resume [--dry-run]
//     Résumé sans chrono (champ FIN vide) : liste des fiches de SLUGS.
//
// Le code comité vient de RELECTURE_ADMIN_CODE (secret GitHub), lu par
// lireCodeAdmin. Il n'est jamais affiché.

import { appendFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  RelectureError, SITE_URL, SLUG_PATTERN, estNuit, ficheEnLigne, finVersDuree, lancer, lireCodeAdmin, proposerFinJournee,
} from "./relecture.js";
import { formatClosedAt } from "../src/lib/relecture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const DEPOT_DIR = path.join(ROOT, "data/a-relire");
export const CHEMINS_AUTORISES = ["data/relectures/", "public/relectures/", "data/a-relire/"];
export const INTERVALLE_MS = 20e3;
export const DELAI_MAX_MS = 6 * 60e3;

// « a b.json  c » -> ["a", "b", "c"] (doublons retirés, format du slug contrôlé).
export function nomsDeFiches(texte) {
  const noms = [...new Set(String(texte ?? "").split(/\s+/).filter(Boolean).map((n) => n.replace(/\.json$/i, "")))];
  if (!noms.length) throw new RelectureError("Aucune fiche indiquée : remplis le champ « fiches » (noms séparés par des espaces, sans .json).");
  const invalides = noms.filter((n) => !SLUG_PATTERN.test(n));
  if (invalides.length) {
    throw new RelectureError(`Nom de fiche invalide : ${invalides.join(", ")} (minuscules, chiffres et tirets uniquement).`);
  }
  return noms;
}

// Fiches absentes de data/a-relire/.
export function fichesAbsentes(noms, depotDir = DEPOT_DIR) {
  return noms.filter((n) => !existsSync(path.join(depotDir, `${n}.json`)));
}

// Heure de fin : vide -> null (pas de chrono). Sinon format contrôlé, et refus
// d'une clôture entre 22h et 8h avec l'heure proposée par relecture.js.
// Pas de choix automatique : c'est à la personne de relancer avec la proposition.
export function verifierFin(fin, now = new Date()) {
  const texte = String(fin ?? "").trim();
  if (!texte) return null;
  const duree = finVersDuree(texte, now);
  const echeance = new Date(now.getTime() + duree.ms);
  if (estNuit(echeance)) {
    const { cible, option } = proposerFinJournee(echeance, now);
    const heure = option.startsWith("--fin ") ? option.slice(6) : null;
    throw new RelectureError(
      `La clôture tomberait la nuit (${formatClosedAt(echeance)}, heure de Paris).\n` +
        `Proposition en journée : ${formatClosedAt(cible)}` +
        (heure ? ` → relance le workflow avec fin = ${heure}.` : ` → relance plus tard ou choisis une autre heure.`),
    );
  }
  return texte;
}

// Fichiers modifiés hors de data/relectures/, public/relectures/ et data/a-relire/.
export function fichiersHorsPerimetre(fichiers) {
  return fichiers.filter((f) => f && !CHEMINS_AUTORISES.some((p) => f.replaceAll("\\", "/").startsWith(p)));
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Interroge la page /relectures/ jusqu'à ce que la fiche y apparaisse (déploiement
// Vercel). Code comité refusé : arrêt immédiat. Page indisponible : nouvel essai.
export async function attendreFicheEnLigne(
  slug,
  { fetchFn = globalThis.fetch, code = lireCodeAdmin(), siteUrl = SITE_URL, intervalleMs = INTERVALLE_MS, delaiMaxMs = DELAI_MAX_MS, attendre = dormir, log = console.log } = {},
) {
  const pageUrl = `${siteUrl}/relectures/`;
  const essais = Math.floor(delaiMaxMs / intervalleMs) + 1;
  for (let essai = 1; essai <= essais; essai++) {
    let etat;
    try {
      const page = await fetchFn(pageUrl, { headers: { "cache-control": "no-cache", "x-relecture-admin-code": code } });
      if (page.redirected && /\/relectures\/connexion/.test(page.url ?? "")) {
        throw new RelectureError(`Lecture de ${pageUrl} refusée : code comité (RELECTURE_ADMIN_CODE) non reconnu par le site.`);
      }
      if (page.ok && ficheEnLigne(await page.text(), slug)) {
        log(`✓ « ${slug} » est en ligne.`);
        return essai;
      }
      etat = page.ok ? "pas encore en ligne" : `page indisponible (HTTP ${page.status})`;
    } catch (e) {
      if (e instanceof RelectureError) throw e;
      etat = `erreur réseau (${e.message})`;
    }
    if (essai < essais) {
      log(`  « ${slug} » : ${etat}, nouvel essai dans ${Math.round(intervalleMs / 1000)} s (${essai}/${essais - 1})…`);
      await attendre(intervalleMs);
    }
  }
  throw new RelectureError(
    `La fiche « ${slug} » n'est toujours pas en ligne après ${Math.round(delaiMaxMs / 60e3)} min. ` +
      "Le commit est bien envoyé : vérifie le déploiement Vercel, puis lance le chrono à la main.",
  );
}

// Résumé du job (Markdown) : fiches, heure de fin et mail prêt à copier.
export function resumeMarkdown({ slugs, resultats = [], simulation = false, siteUrl = SITE_URL }) {
  const titre = simulation
    ? "## Simulation : rien n'a été envoyé"
    : resultats.length ? "## Fiches en ligne" : "## Fiches envoyées (en ligne d'ici 3 minutes)";
  const lignes = [titre, ""];
  for (const s of slugs) lignes.push(`- \`${s}\``);
  lignes.push("", `Page : ${siteUrl}/relectures`);
  for (const { slug, echeance, mail } of resultats) {
    lignes.push(
      "",
      `### ${slug}`,
      "",
      `Fin du chrono : **${formatClosedAt(new Date(echeance))}** (heure de Paris)${simulation ? ", estimée" : ""}`,
      "",
      "Mail aux adhérents :",
      "",
      "```text",
      `Objet : ${mail.objet}`,
      "",
      mail.texte,
      "```",
    );
  }
  return lignes.join("\n") + "\n";
}

function ecrireResume(markdown) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  else console.log(markdown);
}

// ---------- CLI ----------

async function main(argv) {
  const [commande] = argv;
  const dryRun = argv.includes("--dry-run");

  if (commande === "verifier") {
    const noms = nomsDeFiches(process.env.FICHES);
    const absentes = fichesAbsentes(noms);
    if (absentes.length) {
      throw new RelectureError(`Fiche introuvable dans data/a-relire/ : ${absentes.map((n) => `${n}.json`).join(", ")}`);
    }
    const fin = verifierFin(process.env.FIN);
    for (const n of noms) console.log(`  ok  ${n}`);
    console.log(fin ? `  fin du chrono : ${fin} (heure de Paris)` : "  pas de chrono (champ « fin » vide)");
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `slugs=${noms.join(" ")}\n`);
    return;
  }

  if (commande === "controler") {
    const fichiers = execFileSync("git", ["diff", "--cached", "--name-only", "--no-renames"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    if (!fichiers.length) throw new RelectureError("Aucun changement : la fiche est peut-être déjà en ligne.");
    const autres = fichiersHorsPerimetre(fichiers);
    if (autres.length) throw new RelectureError(`Des fichiers inattendus ont changé :\n- ${autres.join("\n- ")}`);
    for (const f of fichiers) console.log(`  ${f}`);
    return;
  }

  if (commande === "lancer") {
    const slugs = nomsDeFiches(process.env.SLUGS);
    const resultats = [];
    for (const slug of slugs) {
      if (!dryRun) await attendreFicheEnLigne(slug);
      // Revérifié ici : l'attente du déploiement a pu faire glisser l'échéance.
      const fin = verifierFin(process.env.FIN);
      if (!fin) throw new RelectureError("Champ « fin » vide : pas de chrono à lancer.");
      const { echeance, mail } = await lancer(slug, undefined, { fin, dryRun });
      resultats.push({ slug, echeance, mail });
    }
    ecrireResume(resumeMarkdown({ slugs, resultats, simulation: dryRun }));
    return;
  }

  if (commande === "resume") {
    ecrireResume(resumeMarkdown({ slugs: nomsDeFiches(process.env.SLUGS), simulation: dryRun }));
    return;
  }

  throw new RelectureError("Usage : node scripts/robot-relecture.js verifier | controler | lancer [--dry-run] | resume [--dry-run]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => {
    console.error(e instanceof RelectureError ? `✗ ${e.message}` : e);
    process.exit(1);
  });
}
