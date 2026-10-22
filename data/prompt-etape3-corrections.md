MODE CORRECTIONS (révision après relecture du Club)

Ne réécris pas la fiche. La fiche relue (TON ANALYSE INITIALE, plus haut) reste la base : le code y applique tes corrections, puis recalcule lui-même `operationnalite_moyens_total`, `plafond_applique`, `plafond_declencheur`, `score_total` et `appreciation` (cela remplace la règle 4 de l'ARBITRAGE). Le FORMAT ÉTAPE 3 ne s'applique pas : réponds uniquement avec le JSON du FORMAT MODE CORRECTIONS ci-dessous.

## Règles des corrections

- `champ` : chemin JSON du champ dans la fiche relue, avec des points, et des crochets pour un élément de liste. Exemples : `contexte_national.texte`, `ce_qui_est_etabli.synthese`, `notation_detaillee.efficacite`, `notation_detaillee.qualification_efficacite`, `sources_utilisees`, `resume_court`, `verdict_final`, `limites.texte`.
- Texte : `avant` est un extrait du texte actuel du champ, copié caractère pour caractère (ponctuation, espaces et gras `**` compris), assez long pour n'y apparaître qu'une fois (une phrase entière en général). `apres` le remplace. Pour supprimer un passage, `apres` vaut "".
- Note ou qualification : `avant` est la valeur actuelle (nombre, ou SOLIDE, INCERTAIN, FRAGILE), `apres` la nouvelle.
- Ajout à la fin d'un texte ou d'une liste (nouvelle source dans `sources_utilisees`, phrase finale de `limites.texte`) : `avant` vaut null et `apres` est le texte ou la source à ajouter, au même format que les éléments existants.
- Jamais de correction sur `operationnalite_moyens_total`, `plafond_applique`, `plafond_declencheur`, `score_total` ou `appreciation`.
- Deux corrections ne portent jamais sur le même passage. Chaque `avant` se lit dans le texte de la fiche relue.
- `raison` : une phrase, pour l'éditeur.
- Liste vide si rien ne change dans la fiche.

## Ce que tes corrections doivent couvrir

- Chaque correction retenue (règle 9), et rien d'autre : ne retouche pas un passage que les commentaires et le contrôle ne remettent pas en cause.
- Si une note change : la note elle-même, toute phrase qui cite cette note ou le score total (`resume_court`, `verdict_final`, synthèses et textes des sections, `limites`), avec le nouveau score calculé selon le CALCUL de l'Étape 1. Si le texte d'une section change, sa synthèse aussi (règle 8).
- La phrase « Version révisée après relecture du Club : … » à la fin de `limites.texte` (ajout, `avant` à null), même si aucune note ne change.
- `resume_court` et `verdict_final` partent du texte de la fiche relue : corrige-les pour qu'ils reflètent les changements et respectent la MISE EN TEXTE FINALE. S'ils la respectent déjà, n'y touche pas.

## Champs à rédiger

`titre_fiche`, `teaser_accueil`, `verdict_conclusion` et `analyse_par_criteres` n'existent pas dans la fiche relue : rédige-les selon la MISE EN TEXTE FINALE, à partir de la fiche corrigée. Dans `analyse_par_criteres`, ne donne ni note ni plafond : le code les reprend de la notation recalculée. Si le plafond s'applique après tes corrections, le texte d'Opérationnalité & moyens le dit en premier.

## FORMAT MODE CORRECTIONS — JSON STRICT

{
  "auditArbitrage": [
    {"remarque": "...", "statut": "acceptee|rejetee", "raison": "..."}
  ],
  "corrections": [
    {"champ": "contexte_national.texte", "avant": "...", "apres": "...", "raison": "..."},
    {"champ": "notation_detaillee.efficacite", "avant": 18, "apres": 15, "raison": "..."},
    {"champ": "limites.texte", "avant": null, "apres": "Version révisée après relecture du Club : ...", "raison": "..."}
  ],
  "titre_fiche": "...",
  "teaser_accueil": "...",
  "verdict_conclusion": "...",
  "analyse_par_criteres": [
    {"critere": "operationnalite_moyens", "titre": "Opérationnalité & Moyens", "texte": "... avec **élément décisif** ..."},
    {"critere": "efficacite", "titre": "Efficacité", "texte": "..."},
    {"critere": "effets_rebonds_externalites", "titre": "Effets rebonds & Externalités", "texte": "..."},
    {"critere": "degre_preparation", "titre": "Degré de préparation", "texte": "..."},
    {"critere": "alignement_logique", "titre": "Alignement & Logique globale", "texte": "..."}
  ],
  "revision_relecture": {
    "synthese": "...",
    "reponses": [ { "commentaire_id": "...", "reponse": "...", "retenu": true } ],
    "notes_pour_arno": "..."
  }
}
