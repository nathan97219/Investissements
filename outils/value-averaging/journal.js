// =============================================================================
//  journal.js : le suivi de mes versements (et les exports CSV)
// -----------------------------------------------------------------------------
//  Comme calcul.js, ce fichier ne touche JAMAIS à la page : uniquement des données.
//  Une entrée du journal = un mois où j'ai réellement investi :
//    { cle: "2026-10", methode: "va" | "dca", numero: 4 | null,
//      valeurAvant: 570, verse: 230, cible: 800 | null, date: "2026-10-14" }
// =============================================================================
import { arrondir } from "./calcul.js";

export const MAX_ENTREES = 600; // 50 ans de versements mensuels
const MAX_MONTANT = 1_000_000_000;

/** "2026-10" à partir de { annee: 2026, mois: 10 }. */
export function cleMois({ annee, mois }) {
  return `${annee}-${String(mois).padStart(2, "0")}`;
}

/**
 * Ajoute (ou remplace) l'entrée du mois. Renvoie un NOUVEAU journal trié par mois,
 * sans modifier l'ancien : un seul versement enregistré par mois.
 */
export function ajouterAuJournal(journal, entree) {
  const autres = journal.filter((e) => e.cle !== entree.cle);
  return [...autres, entree].sort((a, b) => a.cle.localeCompare(b.cle)).slice(-MAX_ENTREES);
}

/** Supprime l'entrée d'un mois. */
export function retirerDuJournal(journal, cle) {
  return journal.filter((e) => e.cle !== cle);
}

/**
 * Nettoie un journal venant de l'extérieur (localStorage, fichier importé) :
 * on ne garde que les entrées 100 % conformes. Tout le reste est ignoré.
 */
export function nettoyerJournal(donnees) {
  if (!Array.isArray(donnees)) return [];
  const montantOk = (x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) <= MAX_MONTANT;
  const propres = [];
  for (const e of donnees.slice(0, MAX_ENTREES)) {
    if (!e || typeof e !== "object") continue;
    if (typeof e.cle !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(e.cle)) continue;
    if (e.methode !== "va" && e.methode !== "dca") continue;
    if (!montantOk(e.valeurAvant) || e.valeurAvant < 0 || !montantOk(e.verse)) continue;
    const numero = Number.isInteger(e.numero) && e.numero >= 1 && e.numero <= 600 ? e.numero : null;
    const cible = montantOk(e.cible) && e.cible >= 0 ? e.cible : null;
    const date = typeof e.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.date) ? e.date : "";
    propres.push({ cle: e.cle, methode: e.methode, numero, valeurAvant: e.valeurAvant, verse: e.verse, cible, date });
  }
  // Un seul versement par mois, triés
  return propres.reduce((j, e) => ajouterAuJournal(j, e), []);
}

/**
 * Le bilan de mon suivi.
 * - capitalDepart : ce que valait déjà le portefeuille à la 1re entrée (argent placé avant le suivi) ;
 * - totalVerse : la somme de mes versements ;
 * - valeur : la valeur juste après le dernier versement ;
 * - gain : ce que le marché m'a rapporté (valeur − capital de départ − versements).
 */
export function bilanJournal(journal) {
  if (journal.length === 0) return null;
  const premiere = journal[0];
  const derniere = journal[journal.length - 1];
  const totalVerse = arrondir(journal.reduce((s, e) => s + e.verse, 0));
  const capitalDepart = premiere.valeurAvant;
  const valeur = arrondir(derniere.valeurAvant + derniere.verse);
  const misDeCote = capitalDepart + totalVerse;
  const gain = arrondir(valeur - misDeCote);
  return { totalVerse, capitalDepart, valeur, gain, rendement: misDeCote > 0 ? gain / misDeCote : 0 };
}

// =============================================================================
//  EXPORT CSV (ouvrable dans Excel, LibreOffice, Google Sheets)
// =============================================================================

/**
 * Transforme une cellule en texte CSV sûr :
 * - les nombres sont écrits « à la française » (virgule décimale) ;
 * - le texte est entouré de guillemets ;
 * - une cellule qui commence par = + - @ est neutralisée (sinon Excel l'exécuterait
 *   comme une formule : c'est l'attaque dite « injection CSV »).
 */
export function celluleCSV(valeur) {
  if (valeur === null || valeur === undefined) return "";
  if (typeof valeur === "number") return String(arrondir(valeur)).replace(".", ",");
  let texte = String(valeur);
  if (/^[=+\-@\t\r]/.test(texte)) texte = `'${texte}`;
  return `"${texte.replace(/"/g, '""')}"`;
}

/** Tableau de lignes → texte CSV (séparateur « ; », standard d'Excel en français). */
export function enCSV(entetes, lignes) {
  return [entetes, ...lignes].map((ligne) => ligne.map(celluleCSV).join(";")).join("\r\n") + "\r\n";
}

export function journalEnCSV(journal) {
  return enCSV(
    ["Mois", "Méthode", "N° du mois", "Valeur avant (€)", "Versé (€)", "Valeur après (€)", "Cible (€)", "Enregistré le"],
    journal.map((e) => [
      e.cle, e.methode === "va" ? "Value Averaging" : "DCA", e.numero,
      e.valeurAvant, e.verse, arrondir(e.valeurAvant + e.verse), e.cible, e.date,
    ]),
  );
}

export function planEnCSV(plan, libelleMois) {
  return enCSV(["N° du mois", "Mois", "Valeur cible (€)"], plan.map((p) => [p.mois, libelleMois(p.mois), p.cible]));
}
