[← Accueil](../../README.md)

# 🛠️ Calculateur Value Averaging *(en construction)*

Une page web ultra simple pour répondre à la question : **« Combien j'investis ce mois-ci ? »**

## Fonctionnalités prévues

1. **Le mois en cours** : je saisis la valeur actuelle de mon portefeuille → l'outil me donne le montant à investir (ou à retirer).
2. **Mon plan** : la trajectoire cible, mois par mois.
3. **Comparaison avec le DCA** sur une simulation.
4. **Garde-fous** : versement maximum par mois, mode « jamais de vente » (pratique pour un PEA).

## Principes techniques

- Page web **statique** (HTML / CSS / JavaScript), hébergée sur GitHub Pages ;
- **aucun serveur, aucune donnée envoyée** : tous les calculs restent dans le navigateur ;
- logique de calcul **séparée** de l'affichage et **couverte par des tests automatiques** ;
- toutes les saisies sont **validées** (montants négatifs, champs vides, valeurs absurdes).

📖 La méthode expliquée : [fiche Value Averaging](../../docs/2-methodes/value-averaging.md)
