import { prisma } from "@/lib/prisma";
import { HelloassoError, getOrder } from "@/lib/helloasso";
import {
  enregistrerAdhesion,
  lireConfigHelloasso,
  lireNotification,
  lireTokenWebhook,
  masquerEmail,
  notificationHorsAdhesion,
  secretsEgaux,
} from "@/lib/helloasso-core";

// URL de notification HelloAsso (Mon compte > Intégrations et API) :
//   https://perlimpinpin.ai/api/helloasso/notification?token=<HELLOASSO_WEBHOOK_TOKEN>
//
// HelloAsso réessaie tant qu'il ne reçoit pas 200 (jusqu'à ~27 h). Donc :
//   - 200 pour tout ce qui est traité OU définitivement sans intérêt (autre
//     formulaire, commande introuvable, paiement non validé…) ;
//   - 500 seulement pour une panne passagère (API HelloAsso, base), pour être rappelé.
// Le corps n'est jamais cru : on relit la commande auprès de l'API HelloAsso.
// Hors du matcher de src/proxy.js : aucune session n'est demandée ici.

const ok = (statut = "ok") => Response.json({ statut }, { status: 200 });

export async function POST(request) {
  const config = lireConfigHelloasso();
  const tokenAttendu = lireTokenWebhook();
  if (!config || !tokenAttendu) {
    console.error("[helloasso] notification reçue mais configuration incomplète (variables HELLOASSO_*)");
    return Response.json({ erreur: "service non configuré" }, { status: 503 });
  }

  const tokenRecu = new URL(request.url).searchParams.get("token");
  if (!secretsEgaux(tokenRecu ?? "", tokenAttendu)) {
    return Response.json({ erreur: "non autorisé" }, { status: 401 });
  }

  const notif = lireNotification(await request.json().catch(() => null));
  if (!notif || notificationHorsAdhesion(notif, config)) return ok("ignoree");

  let order;
  try {
    order = await getOrder(config, notif.orderId);
  } catch (error) {
    if (error instanceof HelloassoError && !error.passagere) {
      // Commande inexistante ou d'une autre association : rien à faire, ne pas relancer
      console.warn(`[helloasso] commande ${notif.orderId} non lisible (${error.message}) : ignorée`);
      return ok("ignoree");
    }
    console.error(`[helloasso] lecture de la commande ${notif.orderId} impossible : ${error.message}`);
    return Response.json({ erreur: "réessayer plus tard" }, { status: 500 });
  }

  try {
    const r = await enregistrerAdhesion({ prisma, order, config });
    if (r.resultat === "creee") {
      console.log(`[helloasso] adhérent ${r.adherentId} créé (${masquerEmail(r.email)}, commande ${r.orderId})`);
    } else if (r.resultat === "ignoree") {
      console.log(`[helloasso] commande ${notif.orderId} ignorée : ${r.raison}`);
    }
    return ok(r.resultat);
  } catch (error) {
    console.error(`[helloasso] enregistrement de la commande ${notif.orderId} impossible :`, error?.code ?? error?.message);
    return Response.json({ erreur: "réessayer plus tard" }, { status: 500 });
  }
}
