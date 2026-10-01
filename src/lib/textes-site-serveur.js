import { prisma } from "@/lib/prisma";
import { textesParDefaut } from "@/lib/textes-site";

// Lecture des textes d'une page, CÔTÉ SERVEUR uniquement (accès à la base).
// Le catalogue des textes (clés, libellés, textes par défaut) est dans
// src/lib/textes-site.js et src/lib/textes/, sans dépendance à la base.

// Renvoie { clé: texte } pour une page : le texte enregistré en base s'il
// existe et n'est pas vide, sinon le texte par défaut. Si la base est
// injoignable, on affiche les textes par défaut plutôt qu'une page en erreur.
export async function lireTextes(page) {
  const textes = textesParDefaut(page);

  try {
    const enregistres = await prisma.texteSite.findMany({
      where: { page },
      select: { cle: true, valeur: true },
    });
    for (const { cle, valeur } of enregistres) {
      // On ignore les clés qui n'existent plus dans le catalogue.
      if (Object.hasOwn(textes, cle) && valeur.trim()) textes[cle] = valeur;
    }
  } catch (error) {
    console.error(`[textes-site] lecture impossible pour « ${page} », textes par défaut affichés :`, error);
  }

  return textes;
}
