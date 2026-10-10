import { isRelectureClosed } from "./relecture.js";

// « Envoyer en révision » (/relectures, mode comité) : contrôles de la demande
// et déclenchement du workflow GitHub .github/workflows/revision-relecture.yml.
// Logique sans Next.js ni Prisma : la route lui passe la fiche, le chrono et
// fetch (tests : scripts/relecture-revision.test.js).

export const DEPOT = "Perlimpinpin2027/perlimpinpin";
export const WORKFLOW = "revision-relecture.yml";
export const SLUG_PATTERN = /^[a-z0-9-]{1,120}$/;
const LIEN_WORKFLOW = `https://github.com/${DEPOT}/actions/workflows/${WORKFLOW}`;
const API = `https://api.github.com/repos/${DEPOT}/actions/workflows/${WORKFLOW}`;

// fiche : contenu de data/relectures/<slug>.json (null si absent).
// chrono : ligne RelectureFiche en base (null si jamais lancé).
// Renvoie { status, error } si la demande est refusée, sinon null.
export function verifierDemande({ ficheSlug, fiche, chrono, maintenant = new Date() }) {
  if (!SLUG_PATTERN.test(ficheSlug)) return { status: 400, error: "ficheSlug invalide." };
  if (!fiche?.relecture) return { status: 404, error: "Fiche introuvable." };
  if (fiche.relecture.archive) return { status: 409, error: "Fiche déjà archivée : révision déjà faite." };
  if (!isRelectureClosed(chrono, maintenant)) return { status: 409, error: "La relecture n'est pas close." };
  return null;
}

function entetes(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "perlimpinpin-relectures",
  };
}

// Un run pour cette fiche est-il déjà en attente ou en cours ? Le workflow
// s'intitule « Révision <slug> » (run-name), ce qui permet de le reconnaître :
// protège d'un second envoi depuis un autre onglet ou après rechargement.
async function runEnCours({ slug, token, fetchImpl }) {
  for (const status of ["queued", "in_progress"]) {
    const r = await fetchImpl(`${API}/runs?status=${status}&per_page=50`, { headers: entetes(token) });
    if (!r.ok) throw new Error(`GitHub a répondu ${r.status} à la liste des runs.`);
    const { workflow_runs: runs = [] } = await r.json();
    const run = runs.find((x) => x.display_title === `Révision ${slug}`);
    if (run) return run;
  }
  return null;
}

// Renvoie { lien, dejaLance } : lien vers le run (ou la page du workflow).
export async function declencherRevision({ slug, token, fetchImpl = fetch }) {
  if (!token) throw new Error("GITHUB_DISPATCH_TOKEN absent : envoi impossible.");
  const existant = await runEnCours({ slug, token, fetchImpl });
  if (existant) return { lien: existant.html_url || LIEN_WORKFLOW, dejaLance: true };

  const r = await fetchImpl(`${API}/dispatches`, {
    method: "POST",
    headers: { ...entetes(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: "main", inputs: { slug }, return_run_details: true }),
  });
  if (!r.ok) throw new Error(`GitHub a refusé le déclenchement (${r.status}).`);
  const res = r.status === 200 ? await r.json().catch(() => ({})) : {};
  return { lien: res.html_url || LIEN_WORKFLOW, dejaLance: false };
}
