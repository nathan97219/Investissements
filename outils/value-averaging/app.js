// =============================================================================
//  app.js : le lien entre la page (index.html) et les calculs (calcul.js)
// -----------------------------------------------------------------------------
//  Rôle : lire ce que l'utilisateur tape, vérifier, appeler calcul.js, afficher.
//  Sécurité : on n'utilise JAMAIS innerHTML avec des données saisies ; uniquement
//  textContent, qui affiche du texte brut (impossible d'injecter du code).
// =============================================================================
import {
  montantAInvestir,
  planCibles,
  simuler,
  validerSaisie,
  SCENARIO_EXEMPLE,
} from "./calcul.js";

// ---------- Raccourcis vers les éléments de la page ----------
const $ = (id) => document.getElementById(id);

const champs = {
  increment: $("increment"),
  taux: $("taux"),
  plafond: $("plafond"),
  vente: $("vente"),
  mois: $("mois"),
  valeur: $("valeur"),
};

// ---------- Mise en forme des nombres « à la française » ----------
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const pourcent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" });

// ---------- 1. Lire le formulaire ----------
// valueAsNumber renvoie un vrai nombre (ou NaN si le champ est vide ou invalide).
function lireSaisie() {
  return {
    increment: champs.increment.valueAsNumber,
    tauxAnnuel: champs.taux.valueAsNumber / 100, // 6 (%) → 0.06
    plafond: champs.plafond.valueAsNumber,
    autoriserVente: champs.vente.checked,
    mois: champs.mois.valueAsNumber,
    valeurActuelle: champs.valeur.valueAsNumber,
  };
}

// ---------- 2. Afficher les erreurs ----------
function afficherErreurs(erreurs) {
  const zone = $("erreurs");
  zone.replaceChildren(); // vide la zone
  if (erreurs.length === 0) {
    zone.hidden = true;
    return;
  }
  const liste = document.createElement("ul");
  for (const message of erreurs) {
    const ligne = document.createElement("li");
    ligne.textContent = message;
    liste.append(ligne);
  }
  zone.append(liste);
  zone.hidden = false;
}

// ---------- 3. Afficher le résultat du mois ----------
function afficherResultat(saisie) {
  const r = montantAInvestir(saisie);

  $("resultat-montant").textContent = euros.format(r.montant);
  $("resultat-detail").textContent =
    `Cible du mois ${saisie.mois} : ${euros.format(r.cible)} · ` +
    `Valeur actuelle : ${euros.format(saisie.valeurActuelle)}`;

  // Message complémentaire selon la situation
  const alerte = $("resultat-alerte");
  let message = "";
  if (r.montant < 0) {
    message = `📈 Ton portefeuille dépasse la cible : tu peux vendre ${euros.format(-r.montant)}.`;
  } else if (r.venteBloquee) {
    message = `📈 Ton portefeuille dépasse la cible de ${euros.format(-r.brut)}. Rien à investir ce mois-ci, garde ton argent de côté.`;
  } else if (r.plafonne) {
    message = `🛡️ Le calcul donnait ${euros.format(r.brut)} : limité à ton plafond de ${euros.format(saisie.plafond)}.`;
  }
  alerte.textContent = message;
  alerte.hidden = message === "";

  $("resultat").hidden = false;
}

// ---------- 4. Remplir un tableau ligne par ligne ----------
function remplirTableau(corpsId, lignes) {
  const corps = $(corpsId);
  corps.replaceChildren();
  for (const cellules of lignes) {
    const tr = document.createElement("tr");
    for (const texte of cellules) {
      const td = document.createElement("td");
      td.textContent = texte;
      tr.append(td);
    }
    corps.append(tr);
  }
}

function afficherPlan(saisie) {
  const nbMois = Math.max(24, saisie.mois); // au moins 24 mois, ou jusqu'au mois saisi
  const plan = planCibles(nbMois, saisie.increment, saisie.tauxAnnuel);
  remplirTableau("plan-corps", plan.map((p) => [String(p.mois), euros.format(p.cible)]));
}

function afficherSimulation(saisie) {
  const sim = simuler({
    increment: saisie.increment,
    tauxAnnuel: saisie.tauxAnnuel,
    plafond: saisie.plafond,
    autoriserVente: saisie.autoriserVente,
    rendementsMensuels: SCENARIO_EXEMPLE,
  });

  for (const [prefixe, bilan] of [["va", sim.va], ["dca", sim.dca]]) {
    $(`${prefixe}-investi`).textContent = euros.format(bilan.investi);
    $(`${prefixe}-valeur`).textContent = euros.format(bilan.valeur);
    $(`${prefixe}-gain`).textContent = `${euros.format(bilan.gain)} (${pourcent.format(bilan.rendement)})`;
  }

  remplirTableau("simulation-corps", sim.lignes.map((l) => [
    String(l.mois),
    pourcent.format(l.rendement),
    euros.format(l.montantVA),
    euros.format(l.valeurVA),
    euros.format(l.montantDCA),
    euros.format(l.valeurDCA),
  ]));
}

// ---------- 5. Mémoriser les réglages sur l'appareil (jamais envoyés) ----------
const CLE = "value-averaging:reglages";

function sauvegarder() {
  try {
    const reglages = {
      increment: champs.increment.value,
      taux: champs.taux.value,
      plafond: champs.plafond.value,
      vente: champs.vente.checked,
      mois: champs.mois.value,
    };
    localStorage.setItem(CLE, JSON.stringify(reglages));
  } catch {
    // Navigation privée ou stockage bloqué : ce n'est pas grave, on continue sans.
  }
}

function restaurer() {
  try {
    const reglages = JSON.parse(localStorage.getItem(CLE) ?? "null");
    if (!reglages || typeof reglages !== "object") return;
    // On ne remet que des valeurs qui ressemblent à des nombres (données potentiellement modifiées).
    for (const nom of ["increment", "taux", "plafond", "mois"]) {
      if (typeof reglages[nom] === "string" && /^-?\d+([.,]\d+)?$/.test(reglages[nom])) {
        champs[nom].value = reglages[nom];
      }
    }
    champs.vente.checked = reglages.vente === true;
  } catch {
    // Données illisibles : on garde les valeurs par défaut.
  }
}

// ---------- 6. Le chef d'orchestre ----------
function calculer() {
  const saisie = lireSaisie();
  const erreurs = validerSaisie(saisie);
  afficherErreurs(erreurs);
  if (erreurs.length > 0) {
    $("resultat").hidden = true;
    return;
  }
  afficherResultat(saisie);
  afficherPlan(saisie);
  afficherSimulation(saisie);
  sauvegarder();
}

$("formulaire").addEventListener("submit", (evenement) => {
  evenement.preventDefault(); // empêche le rechargement de la page
  calculer();
});

// Au chargement : on remet les réglages mémorisés et on affiche plan + simulation.
restaurer();
const saisieInitiale = lireSaisie();
if (validerSaisie(saisieInitiale).length === 0) {
  afficherPlan(saisieInitiale);
  afficherSimulation(saisieInitiale);
}
