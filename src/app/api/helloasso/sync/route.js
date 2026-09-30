import { prisma } from "@/lib/prisma";
import { listMembershipOrders } from "@/lib/helloasso";
import { enregistrerAdhesion, lireConfigHelloasso, masquerEmail, resumer, secretsEgaux } from "@/lib/helloasso-core";

// Filet de sécurité quotidien (Cron Job Vercel, voir vercel.json) : relit les
// adhésions des 7 derniers jours et crée les comptes manquants, avec exactement
// la même logique que la notification. Vercel appelle cette route en GET avec
// « Authorization: Bearer <CRON_SECRET> ». Réponse sans données personnelles.

const JOURS = 7;

export async function GET(request) {
  const config = lireConfigHelloasso();
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!config || !cronSecret || cronSecret.length < 16) {
    console.error("[helloasso] synchronisation : configuration incomplète (HELLOASSO_* ou CRON_SECRET)");
    return Response.json({ erreur: "service non configuré" }, { status: 503 });
  }

  const autorisation = request.headers.get("authorization") ?? "";
  if (!secretsEgaux(autorisation, `Bearer ${cronSecret}`)) {
    return Response.json({ erreur: "non autorisé" }, { status: 401 });
  }

  try {
    const from = new Date(Date.now() - JOURS * 24 * 60 * 60 * 1000);
    const commandes = await listMembershipOrders(config, { from });
    const resultats = [];
    for (const order of commandes) {
      const r = await enregistrerAdhesion({ prisma, order, config });
      if (r.resultat === "creee") {
        console.log(`[helloasso] synchro : adhérent ${r.adherentId} créé (${masquerEmail(r.email)}, commande ${r.orderId})`);
      }
      resultats.push(r);
    }
    const resume = resumer(resultats);
    console.log("[helloasso] synchro terminée :", JSON.stringify(resume));
    return Response.json(resume);
  } catch (error) {
    console.error("[helloasso] synchronisation impossible :", error?.code ?? error?.message);
    return Response.json({ erreur: "synchronisation impossible" }, { status: 500 });
  }
}
