// =============================================================================
//  app.js : le lien entre la page (index.html) et les calculs (calcul.js, journal.js)
// -----------------------------------------------------------------------------
//  Rôle : lire ce que l'utilisateur tape, vérifier, appeler les calculs, afficher.
//  Sécurité : on n'utilise JAMAIS innerHTML avec des données saisies ; uniquement
//  textContent, qui affiche du texte brut (impossible d'injecter du code).
//
//  Plan du fichier :
//    0. Raccourcis et mise en forme      6. Afficher le plan et la simulation
//    1. Les mois (listes déroulantes)    7. Le suivi (journal des versements)
//    2. Les lignes de produits           8. Exports et sauvegarde
//    3. La méthode (VA / DCA)            9. Mémoriser les réglages
//    4. Lire et vérifier la saisie      10. L'exemple
//    5. Afficher le résultat            11. Le chef d'orchestre et le démarrage
// =============================================================================
import {
  arrondir,
  montantAInvestir,
  planCibles,
  simuler,
  validerSaisie,
  repartir,
  repartirAvecReequilibrage,
  validerRepartition,
  validerValeursProduits,
  totalPourcentages,
  numeroDuMois,
  moisNumero,
  validerCalendrier,
  MAX_PRODUITS,
  SCENARIO_EXEMPLE,
} from "./calcul.js";
import {
  cleMois,
  ajouterAuJournal,
  retirerDuJournal,
  nettoyerJournal,
  bilanJournal,
  journalEnCSV,
  planEnCSV,
} from "./journal.js";

// ---------- 0. Raccourcis vers les éléments de la page ----------
const $ = (id) => document.getElementById(id);

const champs = {
  increment: $("increment"),
  taux: $("taux"),
  plafond: $("plafond"),
  vente: $("vente"),
  valeur: $("valeur"),
  reequilibrage: $("reequilibrage"),
  departMois: $("depart-mois"),
  departAnnee: $("depart-annee"),
  courantMois: $("courant-mois"),
  courantAnnee: $("courant-annee"),
  nbProduits: $("nb-produits"),
  verse: $("verse"),
};
const zoneProduits = $("produits");

// Mise en forme des nombres « à la française »
const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const eurosSigne = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", signDisplay: "exceptZero" });
const pourcent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1, signDisplay: "always" });
const part = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const nomMoisLong = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const nomMoisCourt = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" });

// État de la page (ce qui n'est pas directement dans un champ)
let journal = [];
let dernierCalcul = null; // ce qu'on enregistre quand on clique « J'ai fait ce versement »
let modeExemple = false;  // true tant que l'exemple est affiché (rien n'est enregistré)

// ---------- 1. Les mois ----------
const aujourdhui = () => {
  const d = new Date();
  return { annee: d.getFullYear(), mois: d.getMonth() + 1 };
};
const libelleMois = ({ annee, mois }) => nomMoisLong.format(new Date(annee, mois - 1, 1));
// « de mars 2027 » mais « d'octobre 2026 »
const deMois = (m) => {
  const libelle = libelleMois(m);
  return /^[aeiouy]/i.test(libelle) ? `d'${libelle}` : `de ${libelle}`;
};
const libelleMoisCourt = ({ annee, mois }) => nomMoisCourt.format(new Date(annee, mois - 1, 1));

function remplirListeMois(select) {
  const formatMois = new Intl.DateTimeFormat("fr-FR", { month: "long" });
  for (let m = 1; m <= 12; m++) {
    const option = document.createElement("option");
    option.value = String(m);
    const nom = formatMois.format(new Date(2000, m - 1, 1));
    option.textContent = nom.charAt(0).toUpperCase() + nom.slice(1);
    select.append(option);
  }
}

const lireMois = (select, annee) => ({ annee: annee.valueAsNumber, mois: Number(select.value) });
function ecrireMois(select, annee, { annee: a, mois: m }) {
  select.value = String(m);
  annee.value = String(a);
}

// ---------- 2. Les lignes de produits (nom + part + valeur) ----------
function creerChamp({ id, label, type, classe, valeur, attributs = {} }) {
  const bloc = document.createElement("div");
  bloc.className = `bloc-${classe}`;
  const etiquette = document.createElement("label");
  etiquette.htmlFor = id;
  etiquette.textContent = label;
  const input = document.createElement("input");
  input.type = type;
  input.id = id;
  input.className = classe;
  Object.assign(input, attributs);
  input.value = valeur;
  bloc.append(etiquette, input);
  return bloc;
}

function creerLigneProduit(numero, produit) {
  const ligne = document.createElement("div");
  ligne.className = "ligne-produit";
  const blocValeur = creerChamp({
    id: `produit-valeur-${numero}`, label: "Valeur actuelle (€)", type: "number", classe: "produit-valeur",
    valeur: Number.isFinite(produit.valeur) ? String(produit.valeur) : "",
    attributs: { min: "0", step: "0.01", inputMode: "decimal", placeholder: "0" },
  });
  blocValeur.hidden = !champs.reequilibrage.checked;
  ligne.append(
    creerChamp({
      id: `produit-nom-${numero}`, label: `Produit ${numero}`, type: "text", classe: "produit-nom",
      valeur: produit.nom, attributs: { maxLength: 40, placeholder: "ex. MSCI World", autocomplete: "off" },
    }),
    creerChamp({
      id: `produit-pct-${numero}`, label: "Part (%)", type: "number", classe: "produit-pct",
      valeur: String(produit.pourcentage), attributs: { min: "0", max: "100", step: "0.01", inputMode: "decimal" },
    }),
    blocValeur,
  );
  return ligne;
}

function lireProduits() {
  return [...zoneProduits.querySelectorAll(".ligne-produit")].map((ligne) => ({
    nom: ligne.querySelector(".produit-nom").value.trim(),
    pourcentage: ligne.querySelector(".produit-pct").valueAsNumber,
    valeur: ligne.querySelector(".produit-valeur").valueAsNumber,
  }));
}

function dessinerProduits(produits) {
  zoneProduits.replaceChildren(...produits.map((p, i) => creerLigneProduit(i + 1, p)));
  champs.nbProduits.value = String(produits.length);
  majTotal();
}

function changerNombreProduits() {
  const voulu = champs.nbProduits.valueAsNumber;
  if (!Number.isInteger(voulu) || voulu < 1 || voulu > MAX_PRODUITS) return;
  const actuels = lireProduits();
  dessinerProduits(Array.from({ length: voulu }, (_, i) =>
    actuels[i] ?? { nom: "", pourcentage: voulu === 1 ? 100 : 0, valeur: NaN }));
}

// « Total : 100 % ✅ » en direct, et la valeur du portefeuille = somme des produits (rééquilibrage)
function majTotal() {
  const produits = lireProduits();
  const total = arrondir(totalPourcentages(produits));
  const ok = Math.abs(total - 100) < 0.001;
  const zone = $("total-pourcentages");
  zone.textContent = ok
    ? `Total : ${part.format(total)} % ✅`
    : `Total : ${part.format(total)} % ❌ (${total < 100 ? "il manque" : "il y a"} ${part.format(Math.abs(100 - total))} %${total < 100 ? "" : " de trop"})`;
  zone.className = `total-pourcentages ${ok ? "ok" : "ko"}`;

  if (champs.reequilibrage.checked) {
    const somme = produits.reduce((s, p) => s + (Number.isFinite(p.valeur) ? p.valeur : 0), 0);
    champs.valeur.value = String(arrondir(somme));
  }
}

// ---------- 3. La méthode : afficher seulement ce qui la concerne ----------
const methode = () => document.querySelector('input[name="methode"]:checked').value;

function appliquerAffichage() {
  const m = methode();
  for (const el of document.querySelectorAll("[data-mode]")) el.hidden = el.dataset.mode !== m;

  const reeq = champs.reequilibrage.checked;
  for (const bloc of zoneProduits.querySelectorAll(".bloc-produit-valeur")) bloc.hidden = !reeq;
  zoneProduits.classList.toggle("avec-valeurs", reeq);
  champs.valeur.readOnly = reeq;
  $("aide-valeur").textContent = reeq
    ? "Calculée automatiquement : c'est la somme de la valeur de tes produits."
    : "Regarde ton appli (Trade Republic, Boursorama…) juste avant d'investir. 0 si tu démarres.";
  // En DCA sans rééquilibrage, la valeur du portefeuille ne sert à rien : on la cache.
  $("champ-valeur").hidden = m === "dca" && !reeq;
  majTotal();
  majNumeroMois();
}

function majNumeroMois() {
  const depart = lireMois(champs.departMois, champs.departAnnee);
  const courant = lireMois(champs.courantMois, champs.courantAnnee);
  const zone = $("numero-mois");
  if (validerCalendrier(depart, courant).length > 0) {
    zone.textContent = "";
    return;
  }
  const n = numeroDuMois(depart, courant);
  const { cible } = montantAInvestir({
    valeurActuelle: 0, mois: n,
    increment: champs.increment.valueAsNumber || 0, tauxAnnuel: (champs.taux.valueAsNumber || 0) / 100,
  });
  zone.textContent = `👉 C'est ton mois n° ${n} : ton portefeuille doit atteindre ${euros.format(cible)}.`;
}

// ---------- 4. Lire et vérifier la saisie ----------
function lireSaisie() {
  const m = methode();
  const reeq = champs.reequilibrage.checked;
  const produits = lireProduits();
  const depart = lireMois(champs.departMois, champs.departAnnee);
  const courant = lireMois(champs.courantMois, champs.courantAnnee);
  const calendrierOk = validerCalendrier(m === "va" ? depart : courant, courant).length === 0;

  let valeurActuelle = champs.valeur.valueAsNumber;
  if (reeq) valeurActuelle = arrondir(produits.reduce((s, p) => s + (Number.isFinite(p.valeur) ? p.valeur : 0), 0));
  else if (m === "dca") valeurActuelle = 0; // inutile en DCA simple

  return {
    methode: m,
    reequilibrage: reeq,
    produits,
    depart,
    courant,
    increment: champs.increment.valueAsNumber,
    // En DCA, les réglages avancés du Value Averaging ne s'appliquent pas.
    tauxAnnuel: m === "va" ? champs.taux.valueAsNumber / 100 : 0,
    plafond: m === "va" ? champs.plafond.valueAsNumber : 0,
    autoriserVente: m === "va" && champs.vente.checked,
    mois: m === "va" && calendrierOk ? numeroDuMois(depart, courant) : 1,
    valeurActuelle,
  };
}

function verifier(saisie) {
  return [
    ...validerCalendrier(saisie.methode === "va" ? saisie.depart : saisie.courant, saisie.courant),
    ...validerSaisie(saisie),
    ...validerRepartition(saisie.produits),
    ...(saisie.reequilibrage ? validerValeursProduits(saisie.produits) : []),
  ];
}

function afficherErreurs(erreurs) {
  const zone = $("erreurs");
  zone.replaceChildren();
  zone.hidden = erreurs.length === 0;
  if (erreurs.length === 0) return;
  const liste = document.createElement("ul");
  for (const message of erreurs) {
    const ligne = document.createElement("li");
    ligne.textContent = message;
    liste.append(ligne);
  }
  zone.append(liste);
}

// ---------- 5. Afficher le résultat du mois ----------
function calculerMontant(saisie) {
  if (saisie.methode === "dca") {
    return { cible: null, brut: saisie.increment, montant: saisie.increment, plafonne: false, venteBloquee: false };
  }
  return montantAInvestir(saisie);
}

function remplirTableau(corpsId, lignes) {
  const corps = $(corpsId);
  corps.replaceChildren();
  for (const cellules of lignes) {
    const tr = document.createElement("tr");
    for (const contenu of cellules) {
      const td = document.createElement("td");
      if (contenu instanceof Node) td.append(contenu); // un bouton, par exemple
      else td.textContent = contenu;
      tr.append(td);
    }
    corps.append(tr);
  }
}

function remplirEntete(theadId, titres) {
  const tr = document.createElement("tr");
  for (const titre of titres) {
    const th = document.createElement("th");
    th.scope = "col";
    th.textContent = titre;
    tr.append(th);
  }
  $(theadId).replaceChildren(tr);
}

function afficherResultat(saisie) {
  const r = calculerMontant(saisie);
  const vente = r.montant < 0;

  $("resultat-titre").textContent = vente ? "Ce mois-ci, tu peux vendre :" : "Ce mois-ci, investis :";
  $("resultat-montant").textContent = euros.format(Math.abs(r.montant));
  $("resultat-detail").textContent = saisie.methode === "va"
    ? `${libelleMois(saisie.courant)} · mois n° ${saisie.mois} · cible ${euros.format(r.cible)} · valeur actuelle ${euros.format(saisie.valeurActuelle)}`
    : `${libelleMois(saisie.courant)} · DCA : montant fixe`;

  let message = "";
  if (modeExemple) {
    message = "✨ Ceci est un exemple : rien n'est enregistré. Modifie n'importe quel champ pour l'adapter à ta situation.";
  } else if (vente) {
    message = "📈 Ton portefeuille dépasse la cible : tu peux vendre cet excédent (ou ne rien faire).";
  } else if (r.venteBloquee) {
    message = `📈 Ton portefeuille dépasse la cible de ${euros.format(-r.brut)}. Rien à investir ce mois-ci : garde ton argent de côté, il servira lors de la prochaine baisse.`;
  } else if (r.plafonne) {
    message = `🛡️ Le calcul donnait ${euros.format(r.brut)} : limité à ton plafond de ${euros.format(saisie.plafond)}.`;
  }
  $("resultat-alerte").textContent = message;
  $("resultat-alerte").hidden = message === "";

  afficherRepartition(saisie, r.montant);

  dernierCalcul = {
    cle: cleMois(saisie.courant),
    methode: saisie.methode,
    numero: saisie.methode === "va" ? saisie.mois : null,
    valeurAvant: saisie.valeurActuelle,
    cible: r.cible,
  };
  champs.verse.value = String(r.montant);
  $("enregistrer").disabled = modeExemple;
  $("enregistrer-confirmation").hidden = true;
  $("resultat").hidden = false;
}

function afficherRepartition(saisie, montant) {
  const zone = $("repartition");
  const note = $("repartition-note");
  zone.hidden = saisie.produits.length < 2;
  if (zone.hidden) return;

  if (saisie.reequilibrage) {
    const lignes = repartirAvecReequilibrage(montant, saisie.produits);
    remplirEntete("repartition-entete", ["Produit", "Part visée", "Part actuelle", montant < 0 ? "À vendre" : "À investir", "Part après"]);
    remplirTableau("repartition-corps", lignes.map((l) => [
      l.nom,
      `${part.format(l.pourcentage)} %`,
      saisie.valeurActuelle > 0 ? `${part.format(l.partAvant)} %` : "–",
      euros.format(Math.abs(l.montant)),
      `${part.format(l.partApres)} %`,
    ]));
    note.textContent = "Rééquilibrage : les produits en retard sur leur part visée reçoivent davantage. « Part après » = la répartition une fois ce versement fait.";
    note.hidden = false;
  } else {
    const lignes = repartir(montant, saisie.produits);
    remplirEntete("repartition-entete", ["Produit", "Part", montant < 0 ? "À vendre" : "À investir"]);
    remplirTableau("repartition-corps", lignes.map((l) => [l.nom, `${part.format(l.pourcentage)} %`, euros.format(Math.abs(l.montant))]));
    note.hidden = true;
  }
}

// ---------- 6. Le plan et la simulation ----------
function planActuel(saisie) {
  const nbMois = Math.max(24, saisie.mois + 12); // au moins 2 ans, et toujours un an d'avance
  return planCibles(nbMois, saisie.increment, saisie.tauxAnnuel);
}
const libelleNumero = (saisie) => (n) => libelleMoisCourt(moisNumero(saisie.depart, n));

function afficherPlan(saisie) {
  if (saisie.methode !== "va") return;
  const libelle = libelleNumero(saisie);
  remplirTableau("plan-corps", planActuel(saisie).map((p) => [`${p.mois} · ${libelle(p.mois)}`, euros.format(p.cible)]));
  const ligneCourante = $("plan-corps").children[saisie.mois - 1];
  if (ligneCourante) ligneCourante.className = "ligne-courante";
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
    $(`${prefixe}-gain`).textContent = `${eurosSigne.format(bilan.gain)} (${pourcent.format(bilan.rendement)})`;
  }

  const multiple = part.format(sim.va.versementMax / saisie.increment);
  $("reserve").textContent = saisie.plafond > 0 && sim.va.versementMax >= saisie.plafond
    ? `🛡️ Grâce à ton plafond, le Value Averaging n'a jamais demandé plus de ${euros.format(saisie.plafond)} en un mois.`
    : `💰 Réserve à prévoir : au pire moment (mois ${sim.va.moisVersementMax}), le Value Averaging a demandé ` +
      `${euros.format(sim.va.versementMax)} en un seul mois, soit ${multiple} fois le versement habituel.`;

  remplirTableau("simulation-corps", sim.lignes.map((l) => [
    String(l.mois),
    pourcent.format(l.rendement),
    euros.format(l.montantVA),
    euros.format(l.valeurVA),
    euros.format(l.montantDCA),
    euros.format(l.valeurDCA),
  ]));
}

// ---------- 7. Le suivi (journal des versements) ----------
const CLE_JOURNAL = "value-averaging:journal";

function chargerJournal() {
  try {
    journal = nettoyerJournal(JSON.parse(localStorage.getItem(CLE_JOURNAL) ?? "[]"));
  } catch {
    journal = [];
  }
}

function sauverJournal() {
  try {
    localStorage.setItem(CLE_JOURNAL, JSON.stringify(journal));
  } catch {
    // Stockage indisponible (navigation privée) : le suivi ne durera que le temps de la visite.
  }
}

const moisDeCle = (cle) => ({ annee: Number(cle.slice(0, 4)), mois: Number(cle.slice(5, 7)) });

// Un bouton qui demande confirmation au 1er clic et agit au 2e (pas de fenêtre « confirm » bloquante).
function boutonAConfirmer(bouton, texteConfirmation, action) {
  const texteNormal = bouton.textContent;
  let minuteur = null;
  bouton.addEventListener("click", () => {
    if (bouton.dataset.confirmer === "oui") {
      clearTimeout(minuteur);
      bouton.dataset.confirmer = "";
      bouton.textContent = texteNormal;
      action();
      return;
    }
    bouton.dataset.confirmer = "oui";
    bouton.textContent = texteConfirmation;
    minuteur = setTimeout(() => {
      bouton.dataset.confirmer = "";
      bouton.textContent = texteNormal;
    }, 4000);
  });
}

function afficherJournal() {
  const vide = journal.length === 0;
  $("suivi-vide").hidden = !vide;
  $("suivi-contenu").hidden = vide;
  $("export-journal").disabled = vide;
  $("effacer-journal").disabled = vide;
  if (vide) return;

  const b = bilanJournal(journal);
  $("suivi-verse").textContent = euros.format(b.totalVerse);
  $("suivi-valeur").textContent = euros.format(b.valeur);
  $("suivi-gain").textContent = `${eurosSigne.format(b.gain)} (${pourcent.format(b.rendement)})`;
  $("suivi-capital").hidden = b.capitalDepart <= 0;
  $("suivi-capital").textContent =
    `Ton portefeuille valait déjà ${euros.format(b.capitalDepart)} à ton premier versement suivi : ce montant n'est pas compté comme un gain.`;

  remplirTableau("suivi-corps", journal.map((e) => {
    const supprimer = document.createElement("button");
    supprimer.type = "button";
    supprimer.className = "bouton-ligne";
    supprimer.textContent = "✕";
    supprimer.setAttribute("aria-label", `Supprimer le versement ${deMois(moisDeCle(e.cle))}`);
    boutonAConfirmer(supprimer, "Sûr ?", () => {
      journal = retirerDuJournal(journal, e.cle);
      sauverJournal();
      afficherJournal();
    });
    return [
      libelleMoisCourt(moisDeCle(e.cle)) + (e.methode === "dca" ? " (DCA)" : ""),
      euros.format(e.valeurAvant),
      eurosSigne.format(e.verse),
      euros.format(arrondir(e.valeurAvant + e.verse)),
      e.cible === null ? "–" : euros.format(e.cible),
      supprimer,
    ];
  }));
}

function enregistrerVersement() {
  const verse = champs.verse.valueAsNumber;
  const message = $("enregistrer-confirmation");
  if (!dernierCalcul || modeExemple) return;
  if (!Number.isFinite(verse) || Math.abs(verse) > 1_000_000_000) {
    message.textContent = "❌ Indique le montant réellement investi.";
    message.hidden = false;
    return;
  }
  const dejaLa = journal.some((e) => e.cle === dernierCalcul.cle);
  journal = ajouterAuJournal(journal, {
    ...dernierCalcul,
    verse: arrondir(verse),
    date: new Date().toISOString().slice(0, 10),
  });
  sauverJournal();
  afficherJournal();
  message.textContent = `✅ Versement ${deMois(moisDeCle(dernierCalcul.cle))} ${dejaLa ? "mis à jour" : "ajouté"} dans ton suivi. Rendez-vous le mois prochain !`;
  message.hidden = false;
}

// ---------- 8. Exports et sauvegarde ----------
function telecharger(nomFichier, contenu, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const lien = document.createElement("a");
  lien.href = url;
  lien.download = nomFichier;
  document.body.append(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Le « ﻿ » au début indique à Excel que le fichier est en UTF-8 (sinon les accents sont cassés).
const telechargerCSV = (nom, csv) => telecharger(nom, `﻿${csv}`, "text/csv;charset=utf-8");

function afficherMessageSuivi(texte) {
  $("suivi-message").textContent = texte;
  $("suivi-message").hidden = false;
}

function sauvegarderFichier() {
  const contenu = { format: "calculateur-value-averaging", version: 1, reglages: lireReglages(), journal };
  telecharger(`sauvegarde-investissement-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(contenu, null, 2), "application/json");
  afficherMessageSuivi("💾 Fichier de sauvegarde téléchargé.");
}

async function restaurerFichier(evenement) {
  const fichier = evenement.target.files[0];
  evenement.target.value = ""; // permet de re-choisir le même fichier plus tard
  if (!fichier) return;
  if (fichier.size > 1_000_000) {
    afficherMessageSuivi("❌ Ce fichier est trop gros pour être une sauvegarde de cet outil.");
    return;
  }
  try {
    const donnees = JSON.parse(await fichier.text());
    if (donnees?.format !== "calculateur-value-averaging") throw new Error("format");
    journal = nettoyerJournal(donnees.journal);
    sauverJournal();
    appliquerReglages(donnees.reglages);
    sauvegarderReglages();
    afficherJournal();
    calculer();
    afficherMessageSuivi(`📂 Sauvegarde restaurée : ${journal.length} versement(s) retrouvé(s).`);
  } catch {
    afficherMessageSuivi("❌ Ce fichier n'est pas une sauvegarde valide de cet outil.");
  }
}

// ---------- 9. Mémoriser les réglages sur l'appareil (jamais envoyés) ----------
const CLE_REGLAGES = "value-averaging:reglages";

function lireReglages() {
  return {
    methode: methode(),
    increment: champs.increment.value,
    taux: champs.taux.value,
    plafond: champs.plafond.value,
    vente: champs.vente.checked,
    reequilibrage: champs.reequilibrage.checked,
    depart: lireMois(champs.departMois, champs.departAnnee),
    // Les valeurs des produits changent chaque mois : on ne garde que les noms et les parts.
    produits: lireProduits().map(({ nom, pourcentage }) => ({ nom, pourcentage })),
  };
}

function sauvegarderReglages() {
  if (modeExemple) return;
  try {
    localStorage.setItem(CLE_REGLAGES, JSON.stringify(lireReglages()));
  } catch {
    // Navigation privée ou stockage bloqué : ce n'est pas grave, on continue sans.
  }
}

// Remet des réglages dans la page, en ne gardant que des données propres
// (elles viennent de l'appareil ou d'un fichier : elles ont pu être modifiées).
function appliquerReglages(reglages) {
  if (!reglages || typeof reglages !== "object") return;
  for (const nom of ["increment", "taux", "plafond"]) {
    if (typeof reglages[nom] === "string" && /^-?\d+([.,]\d+)?$/.test(reglages[nom])) champs[nom].value = reglages[nom];
  }
  champs.vente.checked = reglages.vente === true;
  champs.reequilibrage.checked = reglages.reequilibrage === true;
  if (reglages.methode === "va" || reglages.methode === "dca") {
    document.querySelector(`input[name="methode"][value="${reglages.methode}"]`).checked = true;
  }
  const d = reglages.depart;
  if (d && Number.isInteger(d.annee) && d.annee >= 1970 && d.annee <= 2100 && Number.isInteger(d.mois) && d.mois >= 1 && d.mois <= 12) {
    ecrireMois(champs.departMois, champs.departAnnee, d);
  }
  if (Array.isArray(reglages.produits)) {
    const produits = reglages.produits
      .slice(0, MAX_PRODUITS)
      .filter((p) => p && typeof p.nom === "string" && typeof p.pourcentage === "number"
        && Number.isFinite(p.pourcentage) && p.pourcentage >= 0 && p.pourcentage <= 100)
      .map((p) => ({ nom: p.nom.slice(0, 40), pourcentage: p.pourcentage, valeur: NaN }));
    if (produits.length > 0) dessinerProduits(produits);
  }
  appliquerAffichage();
}

function restaurerReglages() {
  try {
    const brut = localStorage.getItem(CLE_REGLAGES);
    if (!brut) return false;
    appliquerReglages(JSON.parse(brut));
    return true;
  } catch {
    return false; // données illisibles : on garde les valeurs par défaut
  }
}

// ---------- 10. L'exemple ----------
function afficherExemple() {
  modeExemple = true;
  const maintenant = aujourdhui();
  document.querySelector('input[name="methode"][value="va"]').checked = true;
  champs.increment.value = "200";
  champs.taux.value = "0";
  champs.plafond.value = "0";
  champs.vente.checked = false;
  champs.reequilibrage.checked = true;
  ecrireMois(champs.departMois, champs.departAnnee, moisNumero(maintenant, -2)); // il y a 3 mois
  ecrireMois(champs.courantMois, champs.courantAnnee, maintenant);
  dessinerProduits([
    { nom: "MSCI World", pourcentage: 57, valeur: 340 },
    { nom: "Marchés émergents", pourcentage: 25, valeur: 120 },
    { nom: "CAC 40", pourcentage: 18, valeur: 110 },
  ]);
  appliquerAffichage();
  calculer();
  $("resultat").scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------- 11. Le chef d'orchestre ----------
function calculer() {
  const saisie = lireSaisie();
  const erreurs = verifier(saisie);
  afficherErreurs(erreurs);
  if (erreurs.length > 0) {
    $("resultat").hidden = true;
    return;
  }
  afficherResultat(saisie);
  afficherPlan(saisie);
  afficherSimulation(saisie);
  sauvegarderReglages();
}

const formulaire = $("formulaire");
formulaire.addEventListener("submit", (evenement) => {
  evenement.preventDefault(); // empêche le rechargement de la page
  calculer();
});
// Dès que l'utilisateur touche à un champ, on quitte le mode exemple.
formulaire.addEventListener("input", () => {
  if (modeExemple) {
    modeExemple = false;
    $("resultat").hidden = true;
  }
  majNumeroMois();
});
formulaire.addEventListener("change", (evenement) => {
  if (evenement.target.name === "methode" || evenement.target === champs.reequilibrage) appliquerAffichage();
  sauvegarderReglages();
});
champs.nbProduits.addEventListener("input", changerNombreProduits);
zoneProduits.addEventListener("input", majTotal);

$("exemple").addEventListener("click", afficherExemple);
$("enregistrer").addEventListener("click", enregistrerVersement);
$("export-journal").addEventListener("click", () => telechargerCSV("mon-suivi-investissement.csv", journalEnCSV(journal)));
$("export-plan").addEventListener("click", () => {
  const saisie = lireSaisie();
  if (verifier(saisie).length > 0) return calculer(); // affiche les erreurs
  telechargerCSV("mon-plan-value-averaging.csv", planEnCSV(planActuel(saisie), libelleNumero(saisie)));
});
$("sauvegarde").addEventListener("click", sauvegarderFichier);
$("restauration").addEventListener("change", restaurerFichier);
boutonAConfirmer($("effacer-journal"), "⚠️ Cliquer encore pour tout effacer", () => {
  journal = [];
  sauverJournal();
  afficherJournal();
  afficherMessageSuivi("🗑️ Suivi effacé.");
});

// ---------- Démarrage ----------
remplirListeMois(champs.departMois);
remplirListeMois(champs.courantMois);
ecrireMois(champs.departMois, champs.departAnnee, aujourdhui());
ecrireMois(champs.courantMois, champs.courantAnnee, aujourdhui()); // le mois du versement = ce mois-ci
dessinerProduits([{ nom: "", pourcentage: 100, valeur: NaN }]);
const dejaVenu = restaurerReglages();
chargerJournal();
afficherJournal();
appliquerAffichage();
// Un habitué n'a plus besoin du mode d'emploi : on le replie (un clic suffit pour le rouvrir).
if (dejaVenu && journal.length > 0) $("bienvenue").open = false;

const saisieInitiale = lireSaisie();
if (validerSaisie(saisieInitiale).length === 0 && validerCalendrier(saisieInitiale.depart, saisieInitiale.courant).length === 0) {
  afficherPlan(saisieInitiale);
  afficherSimulation(saisieInitiale);
}
