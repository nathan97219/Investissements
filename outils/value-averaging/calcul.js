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

  // Le mois où le Value Averaging a demandé le plus gros versement : c'est la réserve à prévoir.
  const plusGros = lignes.reduce((max, l) => (l.montantVA > max.montantVA ? l : max), lignes[0] ?? { mois: 0, montantVA: 0 });

  return {
    lignes,
    va: { ...bilan(valeurVA, investiVA), versementMax: plusGros.montantVA, moisVersementMax: plusGros.mois },
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
    erreurs.push("Le montant mensuel doit être supérieur à 0.");
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
  const montants = repartirSelonPoids(montant, produits.map((p) => p.pourcentage));
  return produits.map((p, index) => ({
    nom: p.nom,
    pourcentage: p.pourcentage,
    montant: montants[index],
  }));
}

/**
 * Le moteur commun : découpe `montant` proportionnellement à des `poids` quelconques
 * (pourcentages, retards en euros…). Renvoie un tableau de montants en euros dont la somme
 * est EXACTEMENT `montant`, au centime près. Poids tous nuls → tout à 0.
 */
export function repartirSelonPoids(montant, poids) {
  const signe = montant < 0 ? -1 : 1;
  const totalCentimes = Math.round(Math.abs(montant) * 100);
  const totalPoids = poids.reduce((s, p) => s + (p > 0 ? p : 0), 0);
  if (totalPoids <= 0 || totalCentimes === 0) return poids.map(() => 0);

  // 1. Part « exacte » de chaque produit, en centimes, puis arrondie vers le bas.
  const parts = poids.map((p, index) => {
    const exact = (totalCentimes * (p > 0 ? p : 0)) / totalPoids;
    const base = Math.floor(exact + 1e-9);
    return { index, base, reste: exact - base };
  });

  // 2. Les centimes manquants vont aux plus grands restes.
  let manquants = totalCentimes - parts.reduce((somme, p) => somme + p.base, 0);
  const parReste = [...parts].sort((a, b) => b.reste - a.reste);
  for (let i = 0; manquants > 0 && i < parReste.length; i++, manquants--) {
    parReste[i].base += 1;
  }

  // 3. Retour en euros, dans l'ordre d'origine (0 et non -0 pour un montant nul).
  return parts.map((p) => (p.base === 0 ? 0 : (signe * p.base) / 100));
}

/**
 * RÉÉQUILIBRAGE PAR LES VERSEMENTS : on connaît la valeur actuelle de chaque produit.
 * Le versement va EN PRIORITÉ aux produits en retard sur leur part cible, sans rien vendre.
 *
 *   produits = [{ nom, pourcentage, valeur }, …]
 *
 * Méthode : après versement, le portefeuille vaudra `total + montant`. Chaque produit
 * « devrait » alors valoir `pourcentage` de ce total. Le versement est réparti
 * proportionnellement aux retards (jamais plus que le retard d'un produit).
 * Si le montant est négatif (vente autorisée), on vend proportionnellement aux excédents.
 */
export function repartirAvecReequilibrage(montant, produits) {
  const totalAvant = produits.reduce((s, p) => s + p.valeur, 0);
  const totalApres = totalAvant + montant;
  const ecarts = produits.map((p) => (totalApres * p.pourcentage) / 100 - p.valeur);

  // Retards (si on investit) ou excédents (si on vend)
  let poids = ecarts.map((e) => (montant >= 0 ? Math.max(0, e) : Math.max(0, -e)));
  if (poids.every((p) => p <= 1e-9)) poids = produits.map((p) => p.pourcentage); // déjà pile à l'équilibre
  const montants = repartirSelonPoids(montant, poids);

  return produits.map((p, i) => {
    const valeurApres = arrondir(p.valeur + montants[i]);
    return {
      nom: p.nom,
      pourcentage: p.pourcentage,
      valeur: p.valeur,
      partAvant: totalAvant > 0 ? (p.valeur / totalAvant) * 100 : 0,
      montant: montants[i],
      valeurApres,
      partApres: totalApres > 0 ? (valeurApres / totalApres) * 100 : 0,
    };
  });
}

/** Vérifie les valeurs actuelles saisies pour chaque produit (mode rééquilibrage). */
export function validerValeursProduits(produits) {
  const erreurs = [];
  produits.forEach((p, i) => {
    if (typeof p.valeur !== "number" || !Number.isFinite(p.valeur) || p.valeur < 0 || p.valeur > 1_000_000_000) {
      erreurs.push(`Produit ${i + 1} : indique sa valeur actuelle (0 si tu ne l'as pas encore).`);
    }
  });
  return erreurs;
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

// =============================================================================
//  CALENDRIER : retrouver tout seul le numéro du mois
// -----------------------------------------------------------------------------
//  Un mois est représenté par { annee: 2026, mois: 10 } (mois de 1 à 12).
// =============================================================================

/** Numéro du mois de versement : 1 = le mois de départ, 2 = le suivant, etc. */
export function numeroDuMois(depart, courant) {
  return (courant.annee - depart.annee) * 12 + (courant.mois - depart.mois) + 1;
}

/** Le mois qui tombe `n` mois après `depart` (n = 1 → le mois de départ lui-même). */
export function moisNumero(depart, n) {
  const index = depart.annee * 12 + (depart.mois - 1) + (n - 1);
  return { annee: Math.floor(index / 12), mois: (index % 12) + 1 };
}

/** Vérifie le mois de départ et le mois du versement. Renvoie la liste des erreurs. */
export function validerCalendrier(depart, courant) {
  const ok = (m) => m && Number.isInteger(m.annee) && m.annee >= 1970 && m.annee <= 2100
    && Number.isInteger(m.mois) && m.mois >= 1 && m.mois <= 12;
  if (!ok(depart)) return ["Indique ton mois de départ (mois + année)."];
  if (!ok(courant)) return ["Indique le mois du versement (mois + année)."];
  const n = numeroDuMois(depart, courant);
  if (n < 1) return ["Le mois du versement est avant ton mois de départ : vérifie les deux dates."];
  if (n > 600) return ["Plus de 50 ans entre le départ et le versement : vérifie l'année de départ."];
  return [];
}
