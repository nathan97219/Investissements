[← Accueil](../../README.md)

# 🛡️ CPPI : investir en actions sans descendre sous un plancher

> **En une phrase :** on fixe un **montant plancher** à ne pas perdre, et on investit en actions un multiple du « coussin »
> au-dessus de ce plancher. Plus on gagne, plus on investit ; plus on perd, plus on se met à l'abri.

CPPI signifie *Constant Proportion Portfolio Insurance* (« assurance de portefeuille à proportion constante »), décrite par
André Perold, puis Fischer Black et Robert Jones, à la fin des années 1980.

## La formule

```
Coussin              = Valeur du portefeuille − Plancher
Montant en actions   = Multiplicateur × Coussin
Le reste             → placement sûr (fonds euros, Livret A, monétaire)
```

## Exemple

Tu as **10 000 €**. Tu ne veux pas descendre sous **8 000 €** (le plancher). Tu choisis un **multiplicateur de 3**.

| Étape | Valeur | Coussin | En actions (3 × coussin) | En sécurité |
|---|---|---|---|---|
| Départ | 10 000 € | 2 000 € | **6 000 €** | 4 000 € |
| Les actions montent de 20 % | 11 200 € | 3 200 € | **9 600 €** (on en rachète) | 1 600 € |
| Les actions baissent de 20 % (depuis le départ) | 8 800 € | 800 € | **2 400 €** (on en vend) | 6 400 € |

La logique est **inverse** de celle du [rééquilibrage](reequilibrage.md) : on achète ce qui monte et on vend ce qui baisse,
pour protéger le plancher.

## Le multiplicateur, c'est le niveau de risque

- **Multiplicateur 2** : prudent, peu d'actions.
- **Multiplicateur 5** : agressif. Le portefeuille est très investi, mais le plancher devient fragile.

Le plancher tient tant que les actions ne chutent pas de plus de **1 ÷ multiplicateur** d'un coup entre deux ajustements :
33 % pour un multiplicateur de 3, 20 % pour un multiplicateur de 5.

## Avantages

- ✅ Une **protection** chiffrée et compréhensible : on sait ce qu'on accepte de perdre.
- ✅ Profite des hausses en augmentant automatiquement la part d'actions.
- ✅ Règle mécanique, sans émotion.

## Limites

- ⚠️ **Risque de saut** : un krach très rapide (plus fort que 1 ÷ multiplicateur avant qu'on ait ajusté) fait passer **sous** le plancher.
- ⚠️ Après une forte baisse, on peut se retrouver **presque tout en sécurité**, et rater la reprise (on dit que le portefeuille est « monétarisé »).
- ⚠️ Demande un **suivi régulier** et génère des achats-ventes : à faire dans une enveloppe sans fiscalité à chaque arbitrage (assurance-vie, PEA).
- ⚠️ Dans un marché qui oscille sans tendance, on achète haut et on revend bas : ça coûte.

## En pratique

On retrouve cette mécanique dans certains **fonds à capital protégé** ou dans la gestion pilotée de contrats d'assurance-vie.
En version maison : un ETF actions + un fonds euros dans une assurance-vie, ajustés chaque mois avec la formule.

## Pour qui ?

Ceux qui ont un **objectif à protéger** (un apport immobilier dans 5 ans, par exemple) mais veulent profiter un peu des marchés.
[Prudent](../3-profils/prudent.md) · [Équilibré](../3-profils/equilibre.md)

## Voir aussi

[Portefeuille permanent](portefeuille-permanent.md) · [Rééquilibrage](reequilibrage.md) · [Assurance-vie](../1-bases/assurance-vie.md)
