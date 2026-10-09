// Statistiques pour un seul individu (eval-methodologie.md §2.1, §2.5, §2.6). PUR, sans hasard.

/** Intervalle de Wilson d'une proportion k/n (z = 1,96 : 95 %). Sans réponse : aucune information, [0 ; 1]. */
export function wilson(k, n, z = 1.96) {
  if (!n) return { low: 0, high: 1 };
  const p = k / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    low: k === 0 ? 0 : Math.max(0, center - half),
    high: k === n ? 1 : Math.min(1, center + half),
  };
}

/**
 * Fréquence naturelle « environ X sur 10 (entre a et b) », arrondie à l'entier. null sans réponse.
 * Jamais 10 ni 0 sur 10 : l'arrondi est borné à 9 (bound 'plus' : « 9 ou plus ») ou à 1 (bound 'moins').
 */
export function naturalFrequency(k, n) {
  if (!n) return null;
  const w = wilson(k, n);
  const rounded = Math.round((10 * k) / n);
  const bound = rounded >= 10 ? 'plus' : rounded <= 0 ? 'moins' : null;
  const approx = Math.min(9, Math.max(1, rounded));
  let low = Math.round(10 * w.low);
  let high = Math.round(10 * w.high);
  if (bound === 'plus') low = Math.min(low, approx);
  if (bound === 'moins') high = Math.max(high, approx);
  return { approx, low, high, bound };
}

// ln((m)!) pour m entier, par somme cumulée de logarithmes : exact à la précision du double près.
const lnFact = [0];
function logFactorial(m) {
  for (let i = lnFact.length; i <= m; i++) lnFact.push(lnFact[i - 1] + Math.log(i));
  return lnFact[m];
}
/** ln B(a, b) pour a et b entiers ≥ 1 : B(a, b) = (a-1)! (b-1)! / (a+b-1)!. */
const logBeta = (a, b) => logFactorial(a - 1) + logFactorial(b - 1) - logFactorial(a + b - 1);

function checkCounts(k, n) {
  if (!Number.isInteger(k) || !Number.isInteger(n) || k < 0 || n < 0 || k > n) {
    throw new RangeError(`Compte invalide : ${k} sur ${n}`);
  }
}

/**
 * P(p_new > p_old) avec p ~ Bêta(k + 1, n - k + 1) (a priori uniforme), en calcul EXACT :
 * somme finie d'Evan Miller, P(B > A) = Σ_{i<αB} B(αA+i, βA+βB) / ((βB+i) · B(1+i, βB) · B(αA, βA)).
 * Déterministe, aucun tirage aléatoire.
 */
export function probGreater(kNew, nNew, kOld, nOld) {
  checkCounts(kNew, nNew);
  checkCounts(kOld, nOld);
  const aA = kOld + 1;
  const bA = nOld - kOld + 1;
  const aB = kNew + 1;
  const bB = nNew - kNew + 1;
  const base = logBeta(aA, bA);
  let total = 0;
  for (let i = 0; i < aB; i++) {
    total += Math.exp(logBeta(aA + i, bA + bB) - Math.log(bB + i) - logBeta(1 + i, bB) - base);
  }
  return Math.min(1, Math.max(0, total));
}

/** Plus petite variation détectable à 95 % : 1,96 × √2 × SDw ≈ 2,77 × SDw (Weir, 2005). */
export const mdc95 = (sdw) => 2.77 * sdw;

/** Indice de changement fiable de Jacobson-Truax : (après − avant) / (√2 × SDw). */
export const rci = (x1, x2, sdw) => (x2 - x1) / (Math.SQRT2 * sdw);
