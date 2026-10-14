[← Accueil](../../README.md)

# 🎯 Value Averaging : suivre une trajectoire

> **En une phrase :** au lieu d'investir un **montant** fixe, on vise une **valeur de portefeuille** qui grandit régulièrement, et on investit chaque mois ce qu'il faut pour l'atteindre.

Méthode inventée par Michael Edleson (1988).

## Le principe

1. On fixe une **trajectoire cible** : par exemple « mon portefeuille doit valoir 200 € de plus chaque mois ».
2. Chaque mois, on regarde la **valeur réelle** du portefeuille.
3. On investit **la différence** :

```
Montant à investir = Valeur cible du mois − Valeur actuelle du portefeuille
```

- Le marché a **baissé** → l'écart est grand → **on investit plus** (on achète moins cher).
- Le marché a **monté** → l'écart est petit → **on investit moins**.
- Le marché a **beaucoup monté** → l'écart est négatif → **on vend** la différence, ou on ne fait rien (mode « jamais de vente »).

## Exemple : cible +200 €/mois

*(Mouvements de marché volontairement exagérés pour l'exemple.)*

| Mois | Valeur cible | Marché | Valeur avant versement | **Value Averaging** | DCA |
|---|---|---|---|---|---|
| 1 | 200 € | – | 0 € | **+200 €** | +200 € |
| 2 | 400 € | −5 % | 190 € | **+210 €** | +200 € |
| 3 | 600 € | +15 % | 460 € | **+140 €** | +200 € |
| 4 | 800 € | +25 % | 750 € | **+50 €** | +200 € |
| 5 | 1 000 € | +35 % | 1 080 € | **−80 €** (vente) ou 0 € | +200 € |

Le Value Averaging a **acheté davantage quand c'était bas** (mois 2) et **freiné quand c'était haut** (mois 4 et 5).
C'est le principe « acheter bas, vendre haut », appliqué mécaniquement, sans émotion.

## La version avancée (avec croissance attendue)

On peut faire grandir la cible un peu plus vite, en tenant compte du rendement espéré (par exemple 6 %/an).
Les versements nécessaires sont alors plus faibles en moyenne, car on compte sur le marché pour faire une partie du travail.
→ C'est ce que fera le [calculateur](../../outils/value-averaging/).

## Avantages

- ✅ Prix de revient moyen **souvent meilleur que le DCA**.
- ✅ Force à **acheter dans les baisses**, quand c'est psychologiquement le plus dur.
- ✅ Discipline totale : la règle décide, pas l'émotion.

## Limites

- ⚠️ **Versements imprévisibles** : après un krach, la méthode peut demander 3 ou 4 fois le versement habituel. Il faut une **réserve de cash** ou un **plafond mensuel**.
- ⚠️ **Plus de suivi** : il faut regarder la valeur du portefeuille avant chaque versement (d'où l'intérêt d'un outil).
- ⚠️ **Les ventes** coûtent des frais et des impôts (sur un CTO) ; sur un PEA, on utilise plutôt le mode « jamais de vente ».

## Pour qui ?

[Équilibré](../3-profils/equilibre.md) et [Dynamique](../3-profils/dynamique.md), avec des revenus stables et une réserve de cash.
Pas recommandé pour un tout premier investissement : commence par le [DCA](dca.md).
