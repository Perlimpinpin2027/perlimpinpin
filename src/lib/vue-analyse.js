// Identifiants partagés par la bascule basique/expert de la fiche, côté
// serveur (VueBasique, script de vue initiale) et client (VueAnalyseProvider).
// Module sans "use client" : une constante exportée d'un module client ne
// serait qu'une référence côté serveur, pas sa valeur.
export const ID_VUE = { basique: "vue-basique", expert: "vue-expert" };
export const ID_ONGLET = { basique: "onglet-vue-basique", expert: "onglet-vue-expert" };
// Haut du contenu qui bascule : cible du défilement après une bascule.
export const ID_DEBUT_CONTENU = "vue-analyse";
