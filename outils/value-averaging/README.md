[← Accueil](../../README.md)

# 🛠️ Calculateur Value Averaging

Une page web ultra simple pour répondre à la question : **« Combien j'investis ce mois-ci ? »**

📖 La méthode expliquée : [fiche Value Averaging](../../docs/2-methodes/value-averaging.md)

## Fonctionnalités

1. **Le mois en cours** : on saisit la valeur actuelle du portefeuille → montant à investir (ou à retirer).
2. **La répartition** : jusqu'à 10 produits (ETF, actions…) avec leur pourcentage → le montant exact pour chacun, au centime près.
3. **Le plan** : la trajectoire cible, mois par mois.
4. **La comparaison avec le DCA** sur un scénario d'exemple (hausse, krach, rebond).
5. **Des garde-fous** : versement maximum par mois, mode « jamais de vente » (pratique pour un PEA).

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La structure de la page (formulaire, résultat, tableaux) |
| `style.css` | L'apparence (couleurs, mise en page, mode sombre automatique) |
| `calcul.js` | **Les maths, et uniquement les maths** : aucune dépendance à la page |
| `app.js` | Le lien entre la page et `calcul.js` : lire, vérifier, calculer, afficher |
| `calcul.test.js` | Les tests automatiques de `calcul.js` |
| `package.json` | Permet de lancer les tests avec `npm test` |

## Lancer la page en local

Dans VS Code : clic droit sur `index.html` → **Open with Live Server**.

> ⚠️ Un double-clic sur `index.html` ne suffit pas : le navigateur bloque les scripts découpés en modules quand la page est ouverte comme un simple fichier.

## Lancer les tests

```bash
cd outils/value-averaging
npm test
```

## Sécurité

- **Aucun serveur, aucune donnée envoyée** : tous les calculs se font dans le navigateur.
- **Politique de sécurité (CSP)** : la page n'a le droit de charger que ses propres fichiers.
- **Pas d'injection possible** : les résultats sont affichés avec `textContent`, jamais `innerHTML`.
- **Saisies validées** avant tout calcul (montants négatifs, champs vides, valeurs absurdes).
- Les réglages sont mémorisés **uniquement sur l'appareil** (`localStorage`), puis revérifiés à la relecture.
