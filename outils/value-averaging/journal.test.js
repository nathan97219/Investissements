// =============================================================================
//  journal.test.js : les tests automatiques de journal.js
// =============================================================================
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cleMois, ajouterAuJournal, retirerDuJournal, nettoyerJournal, bilanJournal,
  celluleCSV, journalEnCSV,
} from "./journal.js";

const entree = (cle, valeurAvant, verse) => ({
  cle, methode: "va", numero: 1, valeurAvant, verse, cible: null, date: "2026-10-14",
});

test("cleMois : format AAAA-MM", () => {
  assert.equal(cleMois({ annee: 2026, mois: 3 }), "2026-03");
});

test("ajouterAuJournal : trie par mois et remplace le versement d'un mois déjà saisi", () => {
  let j = [];
  j = ajouterAuJournal(j, entree("2026-11", 200, 210));
  j = ajouterAuJournal(j, entree("2026-10", 0, 200));
  j = ajouterAuJournal(j, entree("2026-11", 190, 210)); // correction de novembre
  assert.deepEqual(j.map((e) => [e.cle, e.valeurAvant]), [["2026-10", 0], ["2026-11", 190]]);
  assert.equal(retirerDuJournal(j, "2026-10").length, 1);
});

test("bilanJournal : versé, valeur et gain", () => {
  const j = [entree("2026-10", 0, 200), entree("2026-11", 190, 210), entree("2026-12", 460, 140)];
  const b = bilanJournal(j);
  assert.equal(b.totalVerse, 550);
  assert.equal(b.valeur, 600);
  assert.equal(b.gain, 50);
  assert.equal(bilanJournal([]), null);
});

test("bilanJournal : l'argent déjà placé avant le suivi n'est pas compté comme un gain", () => {
  const b = bilanJournal([entree("2026-10", 1000, 200), entree("2026-11", 1250, 0)]);
  assert.equal(b.capitalDepart, 1000);
  assert.equal(b.gain, 50);
});

test("nettoyerJournal : ne garde que les entrées conformes", () => {
  const propre = nettoyerJournal([
    entree("2026-10", 0, 200),
    { ...entree("2026-13", 0, 200) },             // mois impossible
    { ...entree("2026-11", -5, 200) },            // valeur négative
    { ...entree("2026-12", 0, "200") },           // texte au lieu d'un nombre
    { ...entree("2027-01", 0, 200), methode: "<script>" },
    null, "n'importe quoi",
  ]);
  assert.equal(propre.length, 1);
  assert.deepEqual(nettoyerJournal("pas un tableau"), []);
});

test("celluleCSV : virgule décimale et protection contre l'injection de formules", () => {
  assert.equal(celluleCSV(1234.5), "1234,5");
  assert.equal(celluleCSV(-80), "-80");
  assert.equal(celluleCSV("=HYPERLINK(\"x\")"), "\"'=HYPERLINK(\"\"x\"\")\"");
  assert.equal(celluleCSV(null), "");
});

test("journalEnCSV : une ligne d'en-tête + une ligne par mois", () => {
  const csv = journalEnCSV([entree("2026-10", 0, 200)]);
  const lignes = csv.trim().split("\r\n");
  assert.equal(lignes.length, 2);
  assert.match(lignes[1], /^"2026-10";"Value Averaging";1;0;200;200;;"2026-10-14"$/);
});
