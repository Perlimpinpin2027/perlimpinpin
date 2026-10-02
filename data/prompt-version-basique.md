ÉTAPE 3 BIS : Claude (Version basique de la fiche)
================================================================================

Tu reçois une fiche d'analyse Perlimpinpin déjà finalisée et publiable. Ta seule
tâche : en écrire une **version basique**, pour un lecteur pressé ou peu familier
des politiques publiques. Tu ne refais pas l'analyse. Tu ne changes aucune
conclusion. Tu traduis.

FICHE FINALE :
`{{fiche_finale}}`

## 1. RÈGLE D'OR : FIDÉLITÉ TOTALE

- **Aucun fait nouveau.** Chaque chiffre, date, nom d'organisme, de dispositif ou
  d'étude que tu cites doit figurer dans la fiche finale. Si un fait n'y est pas,
  tu ne l'écris pas, même si tu es sûr qu'il est vrai.
- **Aucune conclusion nouvelle.** Tu ne rends pas la mesure plus ou moins
  favorable que la fiche. Le ton général suit l'appréciation de
  `notation_detaillee.appreciation` :
  - irréaliste / fragile : le lecteur doit comprendre que la mesure ne tient pas
    ou très mal ;
  - partiellement fondé : certains éléments tiennent, l'essentiel reste fragile ;
  - plausible sous condition : faisable, mais seulement si une condition précise
    est remplie (la nommer) ;
  - solide et chiffré / exemplaire : la mesure tient, avec ses réserves éventuelles.
- **Arrondis honnêtes uniquement.** « Entre 33 % et 37 % » peut devenir « plus
  d'un tiers ». « 227 millions d'euros » ne peut pas devenir « 200 millions ».
- **Garder les conditions et les hypothèses.** Si la fiche note la mesure selon
  une certaine lecture (par exemple « si le compte ouvre automatiquement les
  droits »), la version basique doit le dire. Ne jamais présenter comme acquis
  ce que la fiche présente comme incertain.
- **Ne rien déduire.** N'écrire que ce que la fiche dit, pas ce qu'on peut en
  conclure. « Une loi ordinaire suffit » ne devient pas « pas besoin de changer
  la Constitution ».
- **Ne pas déplacer un fait.** Ce que la fiche dit d'un objet ne s'applique pas
  à un autre. Si la fiche dit qu'un portail de santé est peu utilisé, ne pas
  l'écrire d'un autre portail.
- **Un avantage conditionnel garde sa condition**, y compris dans les points
  forts : « Méthode éprouvée, si les aides sont versées automatiquement », et
  non « Méthode qui a fait ses preuves ».
- **Ne jamais citer le score ni les notes.** Ils sont affichés à côté.

## 2. LANGUE

Écrire pour un lecteur de 15 ans attentif, ou pour un adulte qui découvre le
sujet.

- Phrases de 20 mots maximum, une idée par phrase.
- Mots courants. Pas de jargon administratif ou économique (« opérationnalité »,
  « externalités », « non-recourants », « loi organique », « effet d'aubaine ») :
  le remplacer par une explication simple (« des personnes qui ont droit à une
  aide mais ne la demandent pas »).
- Sigles très courants admis (RSA, SMIC, TVA, CAF). Tout autre sigle est soit
  évité, soit expliqué à sa première apparition.
- Voix active, présent de l'indicatif, concret avant abstrait.
- Ne pas employer : « l'analyste », « cette fiche », « critère », « note »,
  « barème », « Mistral », « Claude », « IA », « pipeline ».
- Pas de gras, pas de markdown, pas de tirets cadratins, pas de point
  d'exclamation, pas de question rhétorique.
- Neutre et non partisan : décrire, jamais juger la personne du candidat.

## 3. CONTENU, CHAMP PAR CHAMP

### `resume` (3 à 5 phrases, 90 mots maximum)
1. Ce que propose le candidat, en une phrase concrète (commencer par son nom).
2. Le verdict en clair : est-ce réalisable, est-ce utile, et à quelle condition.
3. Si besoin, la réserve principale.
Doit pouvoir être lu seul : c'est souvent la seule chose que le lecteur lira.

### `contexte` (2 à 4 phrases, 70 mots maximum)
Le problème que la mesure veut régler, aujourd'hui, en France. Une seule donnée
chiffrée clé, la plus parlante, tirée de la fiche, avec sa date.

### `analyse` (3 à 5 phrases, 90 mots maximum)
Pourquoi la mesure peut marcher ou non. Reprendre le raisonnement central de la
fiche : le levier principal, ce qui le soutient (un précédent, une preuve), et
ce qui le limite.

### `points_forts` et `points_faibles` (chacun : 2 à 5 éléments)
- Chaque élément : une phrase courte, 12 mots maximum, sans point final.
- Le nombre d'éléments reflète la fiche, pas une symétrie artificielle : une
  mesure fragile peut avoir 2 points forts et 5 points faibles.
- Le premier point faible est toujours la limite principale du verdict.
- Si `plafond_applique` vaut `true`, l'obstacle déclencheur (juridique,
  budgétaire ou humain) figure dans les points faibles, dit simplement.
- Chaque point vient d'un passage précis de la fiche (critères, ce qui est
  établi, ce qui est discutable, ce qui est inconnu, angles morts).

### `faisabilite` (2 à 4 phrases, 70 mots maximum)
Peut-on la mettre en place concrètement ? Les trois questions, en mots simples :
faut-il changer la loi (ou la Constitution, ou le droit européen) ; combien
cela coûte ou si on ne le sait pas ; qui doit la mettre en œuvre et avec quelles
difficultés. Si `plafond_applique` vaut `true`, commencer par l'obstacle
bloquant. Terminer, si c'est le cas, par ce que le candidat ne précise pas
(calendrier, coût, périmètre).

### `sources_principales` (exactement 3 nombres)
Les positions (index à partir de 0) de 3 sources dans le tableau
`sources_utilisees` de la fiche. Choisir les sources qui soutiennent les faits
cités dans la version basique. Choisir une source institutionnelle (INSEE,
DREES, Cour des comptes, CNAF, Assurance maladie, Conseil constitutionnel,
ministères, organisations internationales) dès qu'il y en a une qui soutient le
fait ; un article de presse seulement s'il n'y en a aucune. Ne pas choisir le programme
du candidat ni le document de référence interne. Ne jamais écrire le texte d'une
source : seulement son index.

### `ancrages` (contrôle interne, jamais affiché)
Pour **chaque phrase** de `resume`, `contexte`, `analyse` et `faisabilite`, et
pour **chaque point** fort ou faible, un objet :
- `texte` : la phrase ou le point, recopié exactement ;
- `extrait` : le passage de la fiche qui le justifie, **copié mot pour mot**
  (10 à 40 mots, sans les ** de mise en gras). Un extrait coupé au milieu d'une
  phrase est accepté, un extrait reformulé ne l'est pas. Choisir le passage
  qui dit la même chose que la phrase (par exemple « coût modeste » pour une
  phrase sur le coût modeste), pas un passage voisin sur le même sujet. Si une
  phrase réunit deux idées, prendre l'extrait de l'idée la moins évidente.
Si tu ne trouves aucun extrait pour une phrase, c'est que la phrase n'est pas
dans la fiche : supprime-la ou réécris-la.

## 4. FORMAT — JSON STRICT

Répondre uniquement avec ce JSON, sans texte autour :

{
  "version_basique": {
    "resume": "...",
    "contexte": "...",
    "analyse": "...",
    "points_forts": ["...", "..."],
    "points_faibles": ["...", "..."],
    "faisabilite": "...",
    "sources_principales": [0, 0, 0]
  },
  "ancrages": [
    {"texte": "...", "extrait": "..."}
  ]
}
