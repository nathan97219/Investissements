// =============================================================================
//  calcul.js : le « cerveau » du calculateur Value Averaging
// -----------------------------------------------------------------------------
//  Ce fichier ne contient QUE des calculs. Il ne touche jamais à la page web.
//  Chaque fonction reçoit des nombres et renvoie des nombres : c'est ce qui permet
//  de la tester automatiquement (voir calcul.test.js).
// =============================================================================

/** Arrondit un montant au centime (évite les 0.30000000000000004 de JavaScript). */
export function arrondir(montant) {
  return Math.round((montant + Number.EPSILON) * 100) / 100;
}

/** Convertit un rendement annuel (ex. 0.06 pour 6 %) en rendement mensuel équivalent. */
export function tauxMensuel(tauxAnnuel) {
  return Math.pow(1 + tauxAnnuel, 1 / 12) - 1;
}

/**
 * Valeur que le portefeuille DOIT atteindre à la fin du mois numéro `mois`.
 *
 * - Sans rendement attendu (taux = 0) : la cible grandit de `increment` chaque mois.
 *     mois 1 → 200 €, mois 2 → 400 €, mois 3 → 600 €…
 * - Avec un rendement attendu : la cible correspond à ce que vaudrait un placement
 *   de `increment` € par mois si le marché rapportait exactement ce taux.
 */
export function valeurCible(mois, increment, tauxAnnuel = 0) {
  const r = tauxMensuel(tauxAnnuel);
  if (Math.abs(r) < 1e-12) {
    return arrondir(increment * mois);
  }
  return arrondir(increment * ((Math.pow(1 + r, mois) - 1) / r));
}

/**
 * LA fonction principale : combien investir ce mois-ci ?
 *
 *   montant = valeur cible du mois − valeur actuelle du portefeuille
 *
 * Puis on applique les garde-fous :
 * - `plafond` : on n'investit jamais plus que ce montant (0 = pas de plafond) ;
 * - `autoriserVente` : si false, un montant négatif devient 0 (on ne vend pas).
 */
export function montantAInvestir({
  valeurActuelle,
  mois,
  increment,
  tauxAnnuel = 0,
  plafond = 0,
  autoriserVente = false,
}) {
  const cible = valeurCible(mois, increment, tauxAnnuel);
  const brut = arrondir(cible - valeurActuelle);

  let montant = brut;
  let plafonne = false;
  let venteBloquee = false;

  if (montant < 0 && !autoriserVente) {
    montant = 0;
    venteBloquee = true;
  }
  if (plafond > 0 && montant > plafond) {
    montant = plafond;
    plafonne = true;
  }

  return { cible, brut, montant: arrondir(montant), plafonne, venteBloquee };
}

/** Le plan : la valeur cible de chaque mois, du mois 1 au mois `nbMois`. */
export function planCibles(nbMois, increment, tauxAnnuel = 0) {
  const plan = [];
  for (let mois = 1; mois <= nbMois; mois++) {
    plan.push({ mois, cible: valeurCible(mois, increment, tauxAnnuel) });
  }
  return plan;
}

/**
 * Simulation : compare le Value Averaging et le DCA sur une suite de rendements mensuels.
 *
 * `rendementsMensuels` : par exemple [0.02, -0.05, 0.03, …] (+2 %, −5 %, +3 %…).
 * Le DCA investit toujours `increment`. Le Value Averaging suit sa cible.
 * Convention : le marché bouge d'abord, puis on investit en fin de mois.
 */
export function simuler({ increment, tauxAnnuel = 0, rendementsMensuels, plafond = 0, autoriserVente = false }) {
  const lignes = [];
  let valeurVA = 0;
  let investiVA = 0;
  let valeurDCA = 0;
  let investiDCA = 0;

  rendementsMensuels.forEach((rendement, index) => {
    const mois = index + 1;

    // 1. Le marché bouge : les deux portefeuilles prennent le même rendement.
    valeurVA = arrondir(valeurVA * (1 + rendement));
    valeurDCA = arrondir(valeurDCA * (1 + rendement));

    // 2. Value Averaging : on investit ce qu'il faut pour atteindre la cible.
    const { montant } = montantAInvestir({
      valeurActuelle: valeurVA, mois, increment, tauxAnnuel, plafond, autoriserVente,
    });
    valeurVA = arrondir(valeurVA + montant);
    investiVA = arrondir(investiVA + montant);

    // 3. DCA : toujours le même montant.
    valeurDCA = arrondir(valeurDCA + increment);
    investiDCA = arrondir(investiDCA + increment);

    lignes.push({ mois, rendement, montantVA: montant, valeurVA, investiVA, montantDCA: increment, valeurDCA, investiDCA });
  });

  const bilan = (valeur, investi) => ({
    investi,
    valeur,
    gain: arrondir(valeur - investi),
    rendement: investi > 0 ? (valeur - investi) / investi : 0,
  });

  return {
    lignes,
    va: bilan(valeurVA, investiVA),
    dca: bilan(valeurDCA, investiDCA),
  };
}

/**
 * Scénario d'exemple pour la simulation (24 mois) : une hausse, un krach, puis un rebond.
 * Ces chiffres sont INVENTÉS pour illustrer la méthode, ce ne sont pas des données réelles.
 */
export const SCENARIO_EXEMPLE = [
  0.02, 0.01, 0.03, -0.01, 0.02, 0.01,
  -0.04, -0.08, -0.12, -0.06, 0.03, 0.05,
  0.06, 0.04, -0.02, 0.05, 0.03, 0.02,
  0.01, 0.04, -0.01, 0.03, 0.02, 0.01,
];

/**
 * Vérifie les saisies AVANT tout calcul. Renvoie la liste des erreurs (vide = tout va bien).
 * C'est la défense contre les valeurs absurdes ou malveillantes.
 */
export function validerSaisie({ valeurActuelle, mois, increment, tauxAnnuel = 0, plafond = 0 }) {
  const erreurs = [];
  const estNombre = (x) => typeof x === "number" && Number.isFinite(x);
  const MAX = 1_000_000_000; // 1 milliard : au-delà, c'est forcément une faute de frappe

  if (!estNombre(valeurActuelle) || valeurActuelle < 0 || valeurActuelle > MAX) {
    erreurs.push("La valeur actuelle doit être un montant positif (0 si tu démarres).");
  }
  if (!Number.isInteger(mois) || mois < 1 || mois > 600) {
    erreurs.push("Le numéro du mois doit être un nombre entier entre 1 et 600 (50 ans).");
  }
  if (!estNombre(increment) || increment <= 0 || increment > MAX) {
    erreurs.push("L'augmentation mensuelle visée doit être un montant supérieur à 0.");
  }
  if (!estNombre(tauxAnnuel) || tauxAnnuel < -0.5 || tauxAnnuel > 0.5) {
    erreurs.push("Le rendement attendu doit être compris entre −50 % et +50 % par an.");
  }
  if (!estNombre(plafond) || plafond < 0 || plafond > MAX) {
    erreurs.push("Le plafond doit être un montant positif (0 = pas de plafond).");
  }
  return erreurs;
}

// =============================================================================
//  RÉPARTITION ENTRE PLUSIEURS PRODUITS
// =============================================================================

export const MAX_PRODUITS = 10;

/**
 * Répartit `montant` entre plusieurs produits selon leurs pourcentages.
 *
 *   produits = [{ nom: "MSCI World", pourcentage: 60 }, { nom: "Émergents", pourcentage: 40 }]
 *
 * La somme des montants est TOUJOURS égale au total, au centime près
 * (méthode du « plus grand reste » : les centimes restants vont aux produits
 * dont l'arrondi a été le plus défavorable).
 * Un montant négatif (vente) est réparti de la même façon, en négatif.
 */
export function repartir(montant, produits) {
  const signe = montant < 0 ? -1 : 1;
  const totalCentimes = Math.round(Math.abs(montant) * 100);

  // 1. Part « exacte » de chaque produit, en centimes, puis arrondie vers le bas.
  const parts = produits.map((p, index) => {
    const exact = (totalCentimes * p.pourcentage) / 100;
    const base = Math.floor(exact + 1e-9);
    return { index, base, reste: exact - base };
  });

  // 2. Les centimes manquants vont aux plus grands restes.
  let manquants = totalCentimes - parts.reduce((somme, p) => somme + p.base, 0);
  const parReste = [...parts].sort((a, b) => b.reste - a.reste);
  for (let i = 0; manquants > 0 && i < parReste.length; i++, manquants--) {
    parReste[i].base += 1;
  }

  // 3. Retour en euros, dans l'ordre d'origine.
  return produits.map((p, index) => ({
    nom: p.nom,
    pourcentage: p.pourcentage,
    montant: (signe * parts[index].base) / 100,
  }));
}

/** Vérifie la liste des produits. Renvoie la liste des erreurs (vide = tout va bien). */
export function validerRepartition(produits) {
  const erreurs = [];
  if (!Array.isArray(produits) || produits.length < 1 || produits.length > MAX_PRODUITS) {
    return [`Il faut entre 1 et ${MAX_PRODUITS} produits.`];
  }
  produits.forEach((p, i) => {
    const numero = i + 1;
    if (typeof p.nom !== "string" || p.nom.trim() === "") {
      erreurs.push(`Produit ${numero} : donne-lui un nom.`);
    } else if (p.nom.length > 40) {
      erreurs.push(`Produit ${numero} : nom trop long (40 caractères maximum).`);
    }
    if (typeof p.pourcentage !== "number" || !Number.isFinite(p.pourcentage) || p.pourcentage < 0 || p.pourcentage > 100) {
      erreurs.push(`Produit ${numero} : le pourcentage doit être compris entre 0 et 100.`);
    }
  });
  if (erreurs.length === 0) {
    const total = totalPourcentages(produits);
    if (Math.abs(total - 100) > 0.001) {
      erreurs.push(`Le total des pourcentages fait ${arrondir(total)} % : il doit faire exactement 100 %.`);
    }
  }
  return erreurs;
}

/** Somme des pourcentages (pratique pour l'afficher en direct). */
export function totalPourcentages(produits) {
  return produits.reduce((somme, p) => somme + (Number.isFinite(p.pourcentage) ? p.pourcentage : 0), 0);
}
