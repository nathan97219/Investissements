// =============================================================================
//  calcul.test.js : les tests automatiques de calcul.js
// -----------------------------------------------------------------------------
//  Lancer les tests :  cd outils/value-averaging  puis  npm test
//  Chaque test vérifie qu'un calcul donne EXACTEMENT le résultat attendu.
//  Si quelqu'un modifie calcul.js et casse un calcul, un test passe au rouge.
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  arrondir,
  valeurCible,
  montantAInvestir,
  planCibles,
  simuler,
  validerSaisie,
  SCENARIO_EXEMPLE,
} from "./calcul.js";

test("arrondir : supprime les erreurs de virgule de JavaScript", () => {
  assert.equal(arrondir(0.1 + 0.2), 0.3);
  assert.equal(arrondir(10.005), 10.01);
});

test("valeurCible sans rendement : +increment chaque mois", () => {
  assert.equal(valeurCible(1, 200), 200);
  assert.equal(valeurCible(3, 200), 600);
  assert.equal(valeurCible(12, 200), 2400);
});

test("valeurCible avec rendement : la cible grandit plus vite que sans", () => {
  const sans = valeurCible(12, 200, 0);
  const avec = valeurCible(12, 200, 0.06);
  assert.ok(avec > sans, `${avec} devrait être > ${sans}`);
  assert.equal(valeurCible(1, 200, 0.06), 200); // le 1er mois, pas encore de rendement
});

// Exemple chiffré de la fiche docs/2-methodes/value-averaging.md
test("exemple de la fiche : cible +200 €/mois", () => {
  const cas = [
    { mois: 1, valeurActuelle: 0, attendu: 200 },
    { mois: 2, valeurActuelle: 190, attendu: 210 },
    { mois: 3, valeurActuelle: 460, attendu: 140 },
    { mois: 4, valeurActuelle: 750, attendu: 50 },
  ];
  for (const { mois, valeurActuelle, attendu } of cas) {
    const r = montantAInvestir({ valeurActuelle, mois, increment: 200 });
    assert.equal(r.montant, attendu, `mois ${mois}`);
  }
});

test("marché très haut : vente si autorisée, sinon 0 €", () => {
  const avecVente = montantAInvestir({ valeurActuelle: 1080, mois: 5, increment: 200, autoriserVente: true });
  assert.equal(avecVente.montant, -80);
  assert.equal(avecVente.venteBloquee, false);

  const sansVente = montantAInvestir({ valeurActuelle: 1080, mois: 5, increment: 200, autoriserVente: false });
  assert.equal(sansVente.montant, 0);
  assert.equal(sansVente.brut, -80);
  assert.equal(sansVente.venteBloquee, true);
});

test("plafond : on n'investit jamais plus que le plafond", () => {
  const r = montantAInvestir({ valeurActuelle: 100, mois: 5, increment: 200, plafond: 500 });
  assert.equal(r.brut, 900);
  assert.equal(r.montant, 500);
  assert.equal(r.plafonne, true);
});

test("planCibles : un mois par ligne, dans l'ordre", () => {
  const plan = planCibles(3, 100);
  assert.deepEqual(plan, [
    { mois: 1, cible: 100 },
    { mois: 2, cible: 200 },
    { mois: 3, cible: 300 },
  ]);
});

test("simuler : marché plat → VA et DCA identiques", () => {
  const { va, dca } = simuler({ increment: 100, rendementsMensuels: [0, 0, 0, 0] });
  assert.equal(va.investi, 400);
  assert.equal(dca.investi, 400);
  assert.equal(va.valeur, dca.valeur);
});

test("simuler : après une baisse, le VA investit plus que le DCA", () => {
  const { lignes } = simuler({ increment: 100, rendementsMensuels: [0, -0.2] });
  assert.equal(lignes[1].montantDCA, 100);
  assert.equal(lignes[1].montantVA, 120); // cible 200 − (100 × 0,8)
});

test("simuler : le VA atteint toujours sa cible quand la vente est autorisée et sans plafond", () => {
  const { lignes } = simuler({ increment: 200, rendementsMensuels: SCENARIO_EXEMPLE, autoriserVente: true });
  lignes.forEach((l) => assert.equal(l.valeurVA, valeurCible(l.mois, 200)));
});

test("validerSaisie : des saisies correctes ne donnent aucune erreur", () => {
  assert.deepEqual(validerSaisie({ valeurActuelle: 0, mois: 1, increment: 200, tauxAnnuel: 0.06, plafond: 0 }), []);
});

test("validerSaisie : refuse les valeurs absurdes ou dangereuses", () => {
  const casInvalides = [
    { valeurActuelle: -10, mois: 1, increment: 200 },          // valeur négative
    { valeurActuelle: NaN, mois: 1, increment: 200 },          // pas un nombre
    { valeurActuelle: 0, mois: 0, increment: 200 },            // mois 0
    { valeurActuelle: 0, mois: 2.5, increment: 200 },          // mois non entier
    { valeurActuelle: 0, mois: 1, increment: 0 },              // incrément nul
    { valeurActuelle: 0, mois: 1, increment: Infinity },       // infini
    { valeurActuelle: 0, mois: 1, increment: 200, tauxAnnuel: 3 }, // +300 %/an
    { valeurActuelle: 0, mois: 1, increment: 200, plafond: -1 },   // plafond négatif
    { valeurActuelle: "100", mois: 1, increment: 200 },        // texte au lieu d'un nombre
  ];
  for (const saisie of casInvalides) {
    assert.ok(validerSaisie(saisie).length > 0, `devrait être refusé : ${JSON.stringify(saisie)}`);
  }
});

// ---------------- Répartition entre plusieurs produits ----------------
import { repartir, validerRepartition, totalPourcentages } from "./calcul.js";

const somme = (lignes) => Math.round(lignes.reduce((s, l) => s + l.montant, 0) * 100) / 100;

test("repartir : exemple simple 60 / 40", () => {
  const r = repartir(210, [{ nom: "World", pourcentage: 60 }, { nom: "Émergents", pourcentage: 40 }]);
  assert.deepEqual(r.map((l) => l.montant), [126, 84]);
});

test("repartir : la somme tombe toujours pile, même avec des tiers", () => {
  const tiers = [{ nom: "A", pourcentage: 33.33 }, { nom: "B", pourcentage: 33.33 }, { nom: "C", pourcentage: 33.34 }];
  for (const montant of [100, 0.01, 0.02, 210, 999.99, 1234.57]) {
    assert.equal(somme(repartir(montant, tiers)), montant, `montant ${montant}`);
  }
});

test("repartir : mon plan réel 57 / 25 / 18 sur 635 €", () => {
  const r = repartir(635, [
    { nom: "MSCI World", pourcentage: 57 },
    { nom: "Émergents", pourcentage: 25 },
    { nom: "CAC 40", pourcentage: 18 },
  ]);
  assert.equal(somme(r), 635);
  assert.equal(r[1].montant, 158.75);
});

test("repartir : un montant négatif (vente) est réparti en négatif", () => {
  const r = repartir(-80, [{ nom: "A", pourcentage: 75 }, { nom: "B", pourcentage: 25 }]);
  assert.deepEqual(r.map((l) => l.montant), [-60, -20]);
});

test("repartir : 0 € donne 0 € partout, et un produit à 0 % reçoit 0 €", () => {
  assert.deepEqual(repartir(0, [{ nom: "A", pourcentage: 50 }, { nom: "B", pourcentage: 50 }]).map((l) => l.montant), [0, 0]);
  assert.deepEqual(repartir(100, [{ nom: "A", pourcentage: 100 }, { nom: "B", pourcentage: 0 }]).map((l) => l.montant), [100, 0]);
});

test("validerRepartition : accepte une répartition correcte", () => {
  assert.deepEqual(validerRepartition([{ nom: "A", pourcentage: 70 }, { nom: "B", pourcentage: 30 }]), []);
  assert.equal(totalPourcentages([{ nom: "A", pourcentage: 70 }, { nom: "B", pourcentage: 30 }]), 100);
});

test("validerRepartition : refuse les répartitions incorrectes", () => {
  const casInvalides = [
    [],                                                              // aucun produit
    Array.from({ length: 11 }, (_, i) => ({ nom: `P${i}`, pourcentage: 100 / 11 })), // trop de produits
    [{ nom: "A", pourcentage: 60 }, { nom: "B", pourcentage: 30 }],  // total 90 %
    [{ nom: "A", pourcentage: 80 }, { nom: "B", pourcentage: 30 }],  // total 110 %
    [{ nom: "", pourcentage: 100 }],                                 // nom vide
    [{ nom: "A".repeat(41), pourcentage: 100 }],                     // nom trop long
    [{ nom: "A", pourcentage: -10 }, { nom: "B", pourcentage: 110 }], // pourcentage négatif
    [{ nom: "A", pourcentage: NaN }],                                // pas un nombre
  ];
  for (const produits of casInvalides) {
    assert.ok(validerRepartition(produits).length > 0, `devrait être refusé : ${JSON.stringify(produits).slice(0, 80)}`);
  }
});
