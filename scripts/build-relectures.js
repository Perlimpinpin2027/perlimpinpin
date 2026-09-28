// Génère public/relectures/index.html à partir des fiches Étape 1 de data/relectures/*.json.
//
// Usage : node scripts/build-relectures.js
//
// Chaque fichier data/relectures/<slug>.json est une analyse au format Étape 1
// (mêmes clés que "data/analyses finales/"), complétée d'un bloc `relecture`
// propre à la page (titre provisoire, candidat, parti, thème du filtre, date,
// version, mesure initiale, extrait, points de jugement pour le comité…).
// Le slug (nom du fichier sans .json) sert d'identifiant data-fiche/data-view :
// c'est la clé des commentaires et des chronos en base, il ne doit pas changer.
//
// Dans les champs texte, une ligne vide ("\n\n") sépare les paragraphes. Sans
// ligne vide, le texte est découpé automatiquement en paragraphes de quelques
// phrases.
//
// Le CSS, le JavaScript et la structure de la page viennent du gabarit
// scripts/templates/relectures.html ({{FILTRES}}, {{CARTES}}, {{VUES}}).

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkNotationCoherence } from "./lib/scoring.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "data/relectures");
const TEMPLATE_PATH = path.join(ROOT, "scripts/templates/relectures.html");
const OUTPUT_PATH = path.join(ROOT, "public/relectures/index.html");

// Thèmes des filtres du hub : [valeur de data-cat, libellé du bouton].
const THEMES = [
  ["Logement", "Logement"],
  ["Perspectives économiques, pouvoir d'achat, inflation & fiscalité", "Économie & pouvoir d'achat"],
  ["IA & Numérique", "IA & Numérique"],
  ["Éducation nationale", "Éducation nationale"],
  ["Sécurité & Justice", "Sécurité & Justice"],
  ["Santé & Hôpital", "Santé & Hôpital"],
  ["Retraites", "Retraites"],
  ["Emploi & Chômage", "Emploi & Chômage"],
  ["Énergie & Climat", "Énergie & Climat"],
  ["Alimentation & Agriculture", "Alimentation & Agriculture"],
  ["Immigration", "Immigration"],
  ["Démocratie et institutions", "Démocratie et institutions"],
];

// Paliers du score (mêmes bornes que APPRECIATION_BANDS dans scripts/lib/scoring.js).
const TIERS = [
  { min: 85, cls: "exemplaire", label: "Exemplaire", range: "85 à 100", flex: 16 },
  { min: 70, cls: "solide", label: "Solide et chiffré", range: "70 à 84", flex: 15 },
  { min: 55, cls: "plausible", label: "Plausible sous condition", range: "55 à 69", flex: 15 },
  { min: 35, cls: "partiel", label: "Partiellement fondé", range: "35 à 54", flex: 20 },
  { min: 20, cls: "fragile", label: "Fragile", range: "20 à 34", flex: 15 },
  { min: 0, cls: "irreal", label: "Irréaliste", range: "0 à 19", flex: 20 },
];

const QUALIF = {
  SOLIDE: { fill: "ok", label: "Solide" },
  INCERTAIN: { fill: "mid", label: "Incertain documenté" },
  FRAGILE: { fill: "bad", label: "Fragile" },
};

// Critères de analyse_par_criteres, dans l'ordre du barème.
const CRITERES = [
  { id: "operationnalite", nom: "Opérationnalité et moyens", titre: "Opérationnalité & Moyens", note: "operationnalite_moyens_total", max: 30, qualif: null },
  { id: "efficacite", nom: "Efficacité", titre: "Efficacité", note: "efficacite", max: 30, qualif: "qualification_efficacite" },
  { id: "effets", nom: "Effets rebonds et externalités", titre: "Effets rebonds &amp; Externalités", note: "effets_rebonds_externalites", max: 20, qualif: "qualification_effets_rebonds" },
  { id: "preparation", nom: "Degré de préparation", titre: "Degré de préparation", note: "degre_preparation", max: 10, qualif: "qualification_preparation" },
  { id: "alignement", nom: "Alignement et logique globale", titre: "Alignement &amp; Logique globale", note: "alignement_logique", max: 10, qualif: "qualification_alignement" },
];

const LIENS = { direct: "Direct", indirect: "Indirect", faible_ou_absent: "Faible ou absent" };
const PLAFOND_VOLETS = { juridique: "juridique", budgetaire: "budgétaire", moyens_humains: "moyens humains" };
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

// ---------- utilitaires ----------

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" })[c]);
}

function tierOf(score) {
  return TIERS.find((t) => score >= t.min);
}

// "2026-09-25" -> "25 septembre 2026"
function dateFr(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MOIS[m - 1]} ${y}`;
}

// Initiales du candidat : première lettre du prénom et du nom (« Dominique de Villepin » -> « DV »).
function initiales(nom) {
  const mots = nom.split(/\s+/).filter(Boolean);
  return (mots[0][0] + (mots.length > 1 ? mots[mots.length - 1][0] : "")).normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function phrases(text) {
  return text.split(/(?<=[.!?…»)])\s+(?=[«(A-ZÀ-ÖØ-Þ])/u).filter(Boolean);
}

// Paragraphes d'un champ texte : lignes vides si présentes, sinon groupes de phrases.
function paragraphes(text) {
  if (!text) return [];
  const t = String(text).trim();
  if (t.includes("\n\n")) return t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  if (t.length <= 700) return [t];
  const out = [];
  let cur = "";
  for (const ph of phrases(t)) {
    cur = cur ? cur + " " + ph : ph;
    if (cur.length >= 400) {
      out.push(cur);
      cur = "";
    }
  }
  if (cur) out.push(cur);
  return out;
}

function ps(text) {
  return paragraphes(text).map((p) => "<p>" + esc(p) + "</p>").join("");
}

// Découpe analyse_par_criteres selon les intitulés « Critère (n/max) : ».
function decouperCriteres(text) {
  const noms = CRITERES.map((c) => c.nom).join("|");
  const re = new RegExp(`(?:^|(?<=\\s))(${noms}) \\(\\d+/\\d+\\) : `, "gu");
  const hits = [...String(text).matchAll(re)];
  if (!hits.length) return null;
  const parts = {};
  hits.forEach((m, i) => {
    const fin = i + 1 < hits.length ? hits[i + 1].index : text.length;
    const crit = CRITERES.find((c) => c.nom === m[1]);
    parts[crit.id] = text.slice(m.index + m[0].length, fin).trim();
  });
  return parts;
}

// « Libellé, https://… » ou « Libellé — https://… » -> libellé + lien.
function sourceLi(src) {
  const s = typeof src === "string" ? src : [src.titre ?? src.nom ?? "", src.url ?? ""].filter(Boolean).join(", ");
  const m = s.match(/^(.*?)(?:,\s*|\s+[—–-]\s+)(https?:\/\/\S+)\s*$/u);
  if (!m) return "<li>" + esc(s) + "</li>";
  return "<li>" + esc(m[1]) + '<a href="' + esc(m[2]) + '" target="_blank" rel="noopener noreferrer">Ouvrir</a></li>';
}

function chipConfiance(niveau) {
  const n = niveau.toLowerCase();
  const cls = /bon|élev|fort/.test(n) ? "ok" : /faible/.test(n) ? "bad" : "mid";
  return `<span class="chip ${cls}">${esc(niveau)}</span>`;
}

// ---------- blocs de la fiche ----------

function cbtn(id, label = "Commenter") {
  return `<button class="cbtn" type="button" data-target="${id}">${label}</button>`;
}

function block(id, titre, inner, { comment = "Commenter" } = {}) {
  return `<section class="block" id="${id}" data-comment-target><div class="block-head"><h2>${titre}</h2>${cbtn(id, comment)}</div><div class="body">${inner}</div></section>\n`;
}

function subBlock(id, titre, inner, { right = "", foot = "Commenter" } = {}) {
  return `<article class="sub-block" id="${id}" data-comment-target><div class="sb-head"><h3>${titre}</h3>${right}</div><div class="body">${inner}</div><div class="sb-foot">${cbtn(id, foot)}</div></article>`;
}

function srow(label, note, max, fill, chip, sub = false) {
  return `<div class="srow${sub ? " sub" : ""}"><div class="slabel">${label}</div><div class="bar"><span class="fill ${fill}" style="width:${((note / max) * 100).toFixed(1)}%"></span></div><div class="sval">${note}<span>/${max}</span></div><div class="schip">${chip}</div></div>`;
}

function qualifChip(q) {
  const d = QUALIF[q] ?? { fill: "mid", label: q ?? "" };
  return `<span class="chip ${d.fill}">${esc(d.label)}</span>`;
}

function renderDetailScore(id, n) {
  const sub = (label, note, q) => srow(label, note, 10, QUALIF[q]?.fill ?? "mid", qualifChip(q), true);
  const crit = (c) => srow(c.titre, n[c.note], c.max, QUALIF[n[c.qualif]]?.fill ?? "mid", qualifChip(n[c.qualif]));
  const tier = tierOf(n.score_total);
  const rows =
    srow("Opérationnalité &amp; Moyens", n.operationnalite_moyens_total, 30, "acc", '<span class="chip neutral">Somme de 3 volets</span>') +
    sub("Juridique", n.operationnalite_juridique, n.qualification_juridique) +
    sub("Budgétaire", n.operationnalite_budgetaire, n.qualification_budgetaire) +
    sub("Moyens humains", n.operationnalite_moyens_humains, n.qualification_moyens_humains) +
    CRITERES.slice(1).map(crit).join("");
  const segs = [...TIERS]
    .reverse()
    .map((t) => `<div class="seg${t === tier ? " on" : ""}" style="flex:${t.flex}"><b>${t.label}</b><i>${t.range}</i></div>`)
    .join("");
  const plafond = n.plafond_applique
    ? `Le plafond d'opérationnalité est déclenché (volet ${PLAFOND_VOLETS[n.plafond_declencheur] ?? n.plafond_declencheur}) : l'opérationnalité est ramenée à ${n.operationnalite_moyens_total}/30.`
    : "Le plafond d'opérationnalité n'est pas déclenché.";
  return block(
    id,
    "Détail du score",
    `<div class="rows">${rows}</div><div class="scale"><div class="scale-bar">${segs}<span class="pin" style="left:${n.score_total}%"></span></div></div><p class="f-meta">${plafond} <a class="linkarrow" href="https://perlimpinpin.ai/methode" target="_blank" rel="noopener noreferrer">Voir comment nous notons →</a></p>`,
    { comment: "Commenter la notation" },
  );
}

function renderCriteres(slug, fiche) {
  const n = fiche.notation_detaillee;
  const parts = decouperCriteres(fiche.analyse_par_criteres);
  if (!parts) {
    // Texte sans intitulés de critères : un seul bloc commentable.
    return subBlock(`${slug}-criteres-texte`, "Analyse par critères", ps(fiche.analyse_par_criteres), { foot: "Commenter" });
  }
  return CRITERES.map((c) => {
    const chip = c.qualif ? qualifChip(n[c.qualif]) : "";
    const right = `<div class="sb-r"><span class="sval">${n[c.note]}<span>/${c.max}</span></span>${chip}</div>`;
    return subBlock(`${slug}-crit-${c.id}`, c.titre, ps(parts[c.id] ?? ""), { right, foot: "Commenter ce critère" });
  }).join("");
}

function renderVue(slug, fiche) {
  const r = fiche.relecture;
  const n = fiche.notation_detaillee;
  const tier = tierOf(n.score_total);
  const date = dateFr(r.date);
  const id = (s) => `${slug}-${s}`;
  const mvo = fiche.mesure_vers_objectif ?? {};

  const goto = [
    ["resume", "Résumé"], ["score", "Score"], ["detail-score", "Détail"], ["extrait", "Extrait"],
    ["raisonnement", "Raisonnement"], ["verdict", "Verdict"], ["sources", "Sources"], ["fiabilite", "Fiabilité"], ["questions", "À valider"],
  ]
    .filter(([s]) => (s !== "extrait" || r.extrait) && (s !== "questions" || r.questions?.length))
    .map(([s, label]) => `<li><button type="button" data-goto="${id(s)}">${label}</button></li>`)
    .join("");

  const head = `<div data-view="${slug}" hidden>
<a class="back" href="#/">← Tous les brouillons</a>
<header class="f-head tier-${tier.cls}">
  <p class="badge-cat">${esc(r.theme)}</p>
  <div id="${id("titre")}" data-comment-target><h1>${esc(r.titre)}</h1></div>
  <div class="who"><span class="mono-av" aria-hidden="true">${esc(initiales(r.candidat))}</span>
    <div><b>${esc(r.candidat)}</b><span>${esc(r.parti ?? "")} · ${date} · version ${r.version}</span></div>
    <button class="cbtn" type="button" data-target="${id("titre")}" style="margin-left:auto">Commenter le titre</button></div>
  <ul class="goto" aria-label="Aller à">${goto}</ul>
</header>
`;

  const questions = r.questions?.length
    ? `<section class="review" id="${id("questions")}" data-comment-target><p class="label">Réservé au comité</p><h2>Points de jugement à valider</h2><p class="note">Les choix de notation les plus discutables. Cette section n'apparaîtra pas sur la fiche publiée.</p><ol class="qs">` +
      r.questions.map((q, i) => `<li><span class="qn">Q${i + 1}</span><div><b>${esc(q.titre)}</b><span>${esc(q.texte)}</span></div></li>`).join("") +
      `</ol><div class="sb-foot">${cbtn(id("questions"), "Répondre à ces points")}</div></section>\n`
    : "";

  const resume = block(
    id("resume"),
    "Le résumé de Perlimpinpin IA",
    ps(fiche.resume_court) +
      `<p><button class="linkarrow" type="button" data-goto="${id("raisonnement")}">Voir le raisonnement complet →</button></p><p class="mini">Phrase d'accroche (brouillon)</p><p><em>${esc(fiche.phrase_teasing)}</em></p>`,
  );

  const score = `<section class="score tier-${tier.cls}" id="${id("score")}" data-comment-target><p class="label">Score Perlimpinpin</p><div class="score-top"><div class="big"><span class="n">${n.score_total}</span><span class="d">/100</span></div><div class="appr"><span class="v">${tier.label}</span></div>${cbtn(id("score"), "Commenter la notation")}</div><p class="f-meta">Analyse réalisée avec Perlimpinpin 1.0 · étape 1 (brouillon) · ${date}</p><p><button class="linkarrow" type="button" data-goto="${id("raisonnement")}">Lire l&#x27;analyse détaillée →</button></p></section>\n`;

  const mesureInitiale = block(id("mesure-initiale"), "Mesure initiale", ps(r.mesure_initiale ?? paragraphes(fiche.mesure_reformulee)[0]));
  const objectif = block(id("objectif"), "Objectif visé", ps(mvo.objectif_vise));

  const extrait = r.extrait
    ? `<section class="block" id="${id("extrait")}" data-comment-target>\n  <div class="block-head"><h2>Extrait analysé</h2>${cbtn(id("extrait"))}</div>\n  <div class="body"><p class="mini">Sources publiques</p><div class="quote"><blockquote>${esc(r.extrait.citation)}</blockquote><p class="src-l">${esc(r.extrait.source)}</p></div></div></section>\n`
    : "";

  const dl =
    `<dl class="dl"><dt>Objectif en bref</dt><dd>${esc(mvo.objectif_court)}</dd><dt>Domaine</dt><dd>${esc(mvo.categorie_objectif ?? "Non classée")}</dd>` +
    `<dt>Mécanisme proposé</dt><dd>${esc(mvo.mecanisme_propose)}</dd><dt>Lien de cause à effet</dt><dd>${esc(LIENS[mvo.lien_causal] ?? mvo.lien_causal)}</dd></dl>`;
  const raisonnement =
    `<section class="block" id="${id("raisonnement")}">\n  <div class="block-head"><h2>Le raisonnement complet</h2></div>\n  <p class="note">Chaque sous-section se commente séparément. La note découle de la qualification de chaque critère, jamais l'inverse.</p>\n  <div class="stack">` +
    subBlock(id("mesure-reformulee"), "Mesure reformulée", ps(fiche.mesure_reformulee) + dl + '<p class="mini">Vérification et existant</p>' + ps(fiche.nature_et_existant)) +
    subBlock(id("programme"), "Mise en contexte dans le programme", ps(fiche.contexte_programme)) +
    subBlock(id("national"), "Contexte national", ps(fiche.contexte_national)) +
    subBlock(id("international"), "Contexte international", ps(fiche.contexte_international)) +
    `<h3 class="mini" id="${id("criteres")}">Analyse par critères</h3>` +
    renderCriteres(slug, fiche) +
    `</div></section>\n`;

  const longevite = block(id("longevite"), "Longévité des effets", ps(fiche.analyse_longevites));
  const impact = fiche.impact_temporel_et_sectoriel ? block(id("impact"), "Impact temporel et sectoriel", ps(fiche.impact_temporel_et_sectoriel)) : "";

  const certCard = (key, titre) =>
    `<article class="block-card" id="${id(key)}" data-comment-target><div class="bc-head"><h2>${titre}</h2>${cbtn(id(key))}</div><div class="body">${ps(fiche[key])}</div></article>`;
  const cert =
    '<div class="cert-grid">' +
    certCard("ce_qui_est_etabli", "Ce qui est établi") +
    certCard("ce_qui_est_probable", "Ce qui est probable") +
    certCard("ce_qui_est_discutable", "Ce qui est discutable") +
    certCard("ce_qui_est_inconnu", "Ce qui est inconnu") +
    "</div>\n";

  const angles = block(id("angles"), "Angles morts et effets de bord", ps(fiche.angles_morts));

  const verdict = block(
    id("verdict"),
    "Verdict final",
    ps(fiche.verdict_final) +
      (r.verdict_tient ? `<h3 class="mini">Ce qui tient</h3><p>${esc(r.verdict_tient)}</p>` : "") +
      (r.verdict_flou ? `<h3 class="mini">Ce qui reste flou</h3><p>${esc(r.verdict_flou)}</p>` : "") +
      `<p class="verdict-score">Score : <b>${n.score_total}</b> sur 100.</p>`,
  );

  const sources = block(id("sources"), "Sources utilisées", `<ol class="src">${(fiche.sources_utilisees ?? []).map(sourceLi).join("")}</ol>`);

  const limites = String(fiche.limites ?? "").includes("\n\n") ? paragraphes(fiche.limites) : phrases(String(fiche.limites ?? ""));
  const niveau = r.niveau_confiance ?? String(fiche.niveau_de_confiance).split(/[\s.,;:]/)[0];
  const fiabilite = block(
    id("fiabilite"),
    "Fiabilité de l&#x27;analyse",
    `<h3 class="mini">Niveau de confiance</h3><p>${chipConfiance(niveau)}</p>` +
      ps(fiche.niveau_de_confiance) +
      `<h3 class="mini">Limites identifiées</h3><ul class="plist">` +
      limites.map((l) => "<li>" + esc(l) + "</li>").join("") +
      "</ul>",
  );

  const vote = `<section class="block vote" id="${id("vote")}"><div class="block-head"><h2>Et vous, qu'en pensez-vous ?</h2></div><p class="note">Aperçu de la fiche publiée — non actif sur ce brouillon.</p><div class="body"><p>Votre avis sur la mesure elle-même — pas sur la qualité de notre analyse.</p><div class="vote-row"><button type="button" disabled>D'accord avec cette mesure</button><button type="button" disabled>Pas d'accord avec cette mesure</button></div><p>Votre avis sur la qualité de notre travail — pas sur la mesure elle-même.</p><p><b>Je trouve cette analyse pertinente</b></p><div class="vote-row"><button type="button" disabled>Oui</button><button type="button" disabled>Non</button></div></div></section>\n`;

  const foot =
    `<div class="foot3"><span>// 01 Analyses générées par l'IA</span><span>// 02 Méthodologie avec des experts</span><span>// 03 Sources publiques et documentées</span></div>\n` +
    `<footer class="foot tier-${tier.cls}"><span>Version ${r.version} · ${date} · étape 1, analyse initiale non encore contrôlée</span><span><b>${n.score_total}/100</b> · ${tier.label}</span></footer></div>\n`;

  return head + questions + resume + score + mesureInitiale + objectif + renderDetailScore(id("detail-score"), n) + extrait + raisonnement + longevite + impact + cert + angles + verdict + sources + fiabilite + vote + foot;
}

function renderCarte(slug, fiche) {
  const r = fiche.relecture;
  const score = fiche.notation_detaillee.score_total;
  const tier = tierOf(score);
  return (
    `<article class="fcard tier-${tier.cls}" data-fiche="${slug}" data-cat="${esc(r.theme)}"><div class="main">` +
    `<p class="badge-cat">${esc(r.theme)} · ${esc(r.candidat)}</p>` +
    `<h2><a class="fcard-link" href="#/${slug}">${esc(r.titre)}</a></h2>` +
    `<p class="teaser">${esc(fiche.phrase_teasing)}</p>` +
    `<p class="meta"><span>Étape 1</span><span>Version ${r.version}</span><span>${dateFr(r.date)}</span><span data-statut>À relire</span></p>` +
    `<div class="chrono" data-chrono="${slug}"></div></div>` +
    `<div class="fscore"><span class="n">${score}<small>/100</small></span><span class="tierl">${tier.label}</span><span class="go" aria-hidden="true">→</span></div></article>`
  );
}

function renderFiltres(fiches) {
  const themes = [...THEMES];
  for (const { fiche } of fiches) {
    if (!themes.some(([v]) => v === fiche.relecture.theme)) themes.push([fiche.relecture.theme, fiche.relecture.theme]);
  }
  const chip = (value, label, count, pressed) =>
    `<button class="chipf" type="button" data-cat="${esc(value)}" aria-pressed="${pressed}"${count || value === "all" ? "" : " disabled"}>${esc(label)}<i>${count}</i></button>`;
  return (
    '<div class="filters" role="group" aria-label="Filtrer par thème">' +
    chip("all", "Tous", fiches.length, true) +
    themes.map(([v, label]) => chip(v, label, fiches.filter(({ fiche }) => fiche.relecture.theme === v).length, false)).join("") +
    "</div>"
  );
}

// ---------- chargement ----------

const CHAMPS_RELECTURE = ["titre", "candidat", "theme", "date", "version"];

function chargerFiches() {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")).sort();
  const fiches = [];
  const erreurs = [];
  for (const file of files) {
    const slug = file.replace(/\.json$/, "");
    if (!/^[a-z0-9-]+$/.test(slug)) {
      erreurs.push(`${file} : le slug « ${slug} » doit être en minuscules, chiffres et tirets.`);
      continue;
    }
    const fiche = JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8"));
    const manquants = CHAMPS_RELECTURE.filter((k) => fiche.relecture?.[k] == null || fiche.relecture[k] === "");
    if (manquants.length) {
      erreurs.push(`${file} : champs manquants dans "relecture" : ${manquants.join(", ")}.`);
      continue;
    }
    for (const e of checkNotationCoherence(fiche.notation_detaillee)) console.warn(`⚠ ${file} : ${e}`);
    fiches.push({ slug, fiche });
  }
  if (erreurs.length) {
    console.error(erreurs.join("\n"));
    process.exit(1);
  }
  // Les plus récentes d'abord.
  return fiches.sort((a, b) => b.fiche.relecture.date.localeCompare(a.fiche.relecture.date) || a.slug.localeCompare(b.slug));
}

const fiches = chargerFiches();
const html = readFileSync(TEMPLATE_PATH, "utf8")
  .replace("{{FILTRES}}", () => renderFiltres(fiches))
  .replace("{{CARTES}}", () => fiches.map(({ slug, fiche }) => renderCarte(slug, fiche)).join(""))
  .replace("{{VUES}}", () => fiches.map(({ slug, fiche }) => renderVue(slug, fiche)).join("\n\n\n"));
writeFileSync(OUTPUT_PATH, html);
console.log(`✓ ${path.relative(ROOT, OUTPUT_PATH)} : ${fiches.length} fiche(s) (${fiches.map((f) => f.slug).join(", ")}).`);
