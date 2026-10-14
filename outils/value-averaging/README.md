[← Accueil](../../README.md)

# 🎯 Calculateur Value Averaging & DCA

Une page web ultra simple pour répondre à la question : **« Combien j'investis ce mois-ci, et sur quoi ? »**

👉 **[Ouvrir le calculateur en ligne](https://nathan97219.github.io/Investissements/outils/value-averaging/)**
📖 Les méthodes expliquées : [Value Averaging](../../docs/2-methodes/value-averaging.md) · [DCA](../../docs/2-methodes/dca.md) · [Rééquilibrage](../../docs/2-methodes/reequilibrage.md)

## Fonctionnalités

1. **Deux méthodes** : Value Averaging (le montant s'adapte au marché) ou DCA (montant fixe).
2. **Le numéro du mois est automatique** : on saisit une seule fois son mois de départ.
3. **La répartition** : jusqu'à 10 produits (ETF, actions…) → le montant exact pour chacun, au centime près.
4. **Le rééquilibrage sans vente** : on saisit la valeur de chaque produit, le versement va en priorité à ceux qui sont en retard sur leur part cible.
5. **Le suivi** : un clic sur « J'ai fait ce versement » → historique, total versé, valeur, gain.
6. **Les exports** : suivi et plan en CSV (Excel), sauvegarde/restauration dans un fichier pour passer du PC au téléphone.
7. **Le plan** : la trajectoire cible, mois par mois, avec les vraies dates.
8. **La simulation** VA vs DCA sur un scénario de krach, avec la **réserve de cash** à prévoir.
9. **Des garde-fous** : versement maximum par mois, mode « jamais de vente » (pratique pour un PEA).
10. **Pour les débutants** : un exemple tout rempli en un clic, et une FAQ.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | La structure de la page (formulaire, résultat, suivi, tableaux) |
| `style.css` | L'apparence (couleurs, mise en page, mode sombre, téléphone, impression) |
| `calcul.js` | **Les maths, et uniquement les maths** : cibles, répartition, rééquilibrage, calendrier, simulation |
| `journal.js` | **Les données du suivi** : ajout, nettoyage, bilan, export CSV |
| `app.js` | Le lien entre la page et les deux fichiers ci-dessus : lire, vérifier, calculer, afficher |
| `calcul.test.js`, `journal.test.js` | Les tests automatiques (36 tests) |
| `package.json` | Permet de lancer les tests avec `npm test` |

## Lancer la page en local

Dans VS Code : clic droit sur `index.html` → **Open with Live Server**.

> ⚠️ Un double-clic sur `index.html` ne suffit pas : le navigateur bloque les scripts découpés en modules quand la page est ouverte comme un simple fichier.

## Lancer les tests

```bash
cd outils/value-averaging
npm test
```

Les tests tournent aussi **automatiquement sur GitHub** à chaque Pull Request (`.github/workflows/tests-outil-va.yml`).

## Sécurité

- **Aucun serveur, aucune donnée envoyée** : tous les calculs se font dans le navigateur, et la CSP interdit techniquement toute connexion (`connect-src 'none'`).
- **Politique de sécurité (CSP)** : la page n'a le droit de charger que ses propres fichiers.
- **Pas d'injection possible** : tout est affiché avec `textContent`, jamais `innerHTML`.
- **Saisies validées** avant tout calcul (montants négatifs, champs vides, dates incohérentes, valeurs absurdes).
- **Données relues = données suspectes** : réglages, suivi et fichiers restaurés sont nettoyés champ par champ avant usage (fichier limité à 1 Mo).
- **Export CSV protégé contre l'injection de formules** Excel (`=`, `+`, `-`, `@` neutralisés).
- Les réglages et le suivi restent **uniquement sur l'appareil** (`localStorage`).
