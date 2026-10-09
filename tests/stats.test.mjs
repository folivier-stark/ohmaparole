import test from 'node:test';
import assert from 'node:assert/strict';
import { wilson, naturalFrequency, probGreater, mdc95, rci } from '../js/core/stats.js';

const close = (actual, expected, eps = 1e-9, msg = '') =>
  assert.ok(Math.abs(actual - expected) <= eps, `${msg} attendu ${expected}, obtenu ${actual}`);

// Valeurs de référence calculées à part (mpmath, 30 chiffres, résolution directe du second degré).
test('wilson : intervalle à 95 % contre des valeurs de référence', () => {
  const ref = [
    [8, 13, 0.355224809722685, 0.822905534187632],
    [0, 10, 0, 0.277540168766617],
    [10, 10, 0.722459831233383, 1],
    [3, 4, 0.300636052442637, 0.954413937355364],
    [1, 1, 0.206543291473893, 1],
    [5, 10, 0.236589593615487, 0.763410406384513],
    [2, 9, 0.0632237623122272, 0.547416656327195],
  ];
  for (const [k, n, low, high] of ref) {
    const w = wilson(k, n);
    close(w.low, low, 1e-12, `low ${k}/${n}`);
    close(w.high, high, 1e-12, `high ${k}/${n}`);
  }
});

test('wilson : bornes dans [0, 1], z réglable, aucune information sans réponse', () => {
  const w0 = wilson(0, 5);
  assert.equal(w0.low, 0);
  const w1 = wilson(5, 5);
  assert.equal(w1.high, 1);
  const narrow = wilson(8, 13, 1.2816);
  const wide = wilson(8, 13);
  assert.ok(narrow.low > wide.low && narrow.high < wide.high);
  assert.deepEqual(wilson(0, 0), { low: 0, high: 1 });
});

test('naturalFrequency : « environ X sur 10 (entre a et b) », arrondi à l’entier', () => {
  assert.deepEqual(naturalFrequency(8, 13), { approx: 6, low: 4, high: 8, bound: null });
  assert.deepEqual(naturalFrequency(3, 4), { approx: 8, low: 3, high: 10, bound: null });
  assert.deepEqual(naturalFrequency(13, 20), { approx: 7, low: 4, high: 8, bound: null });
  assert.equal(naturalFrequency(0, 0), null);
});

test('naturalFrequency : jamais 10 sur 10 ni 0 sur 10, mais « 9 ou plus » et « 1 ou moins »', () => {
  assert.deepEqual(naturalFrequency(10, 10), { approx: 9, low: 7, high: 10, bound: 'plus' });
  assert.deepEqual(naturalFrequency(19, 20), { approx: 9, low: 8, high: 10, bound: 'plus' }); // 9,5 arrondi à 10
  assert.deepEqual(naturalFrequency(0, 10), { approx: 1, low: 0, high: 3, bound: 'moins' });
  assert.deepEqual(naturalFrequency(1, 25), { approx: 1, low: 0, high: 2, bound: 'moins' }); // 0,4 arrondi à 0
  assert.deepEqual(naturalFrequency(1, 10), { approx: 1, low: 0, high: 4, bound: null });
  // La fourchette reste cohérente avec la borne : jamais « entre 10 et 10 ».
  const many = naturalFrequency(120, 120);
  assert.equal(many.approx, 9);
  assert.ok(many.low <= 9);
  assert.equal(naturalFrequency(0, 120).high >= 1, true);
});

// P(p_new > p_old), lois bêta à a priori uniforme. Références : somme exacte en fractions
// (Python, fractions.Fraction) et intégration numérique mpmath, concordantes à 1e-17.
test('probGreater : valeurs de référence calculées à part', () => {
  const ref = [
    [[0, 0, 0, 0], 0.5],
    [[1, 1, 0, 0], 2 / 3],
    [[1, 1, 0, 1], 5 / 6],
    [[5, 10, 5, 10], 0.5],
    [[8, 10, 3, 10], 0.985013438573810091],
    [[3, 10, 8, 10], 0.0149865614261899092],
    [[6, 8, 3, 8], 0.923282599753187988],
    [[7, 10, 4, 10], 0.900809716599190283],
    [[6, 10, 4, 10], 0.802572040962133841],
    [[12, 15, 9, 20], 0.979610180379150733],
    [[9, 12, 5, 12], 0.944649347153048863],
    [[8, 12, 5, 12], 0.881128011845470454],
    [[40, 60, 30, 60], 0.967028058455572762],
    [[150, 200, 120, 200], 0.999317549663520557],
    [[10, 10, 0, 10], 0.999998582428922986],
    [[0, 10, 10, 10], 1.41757107701380147e-6],
  ];
  for (const [args, p] of ref) close(probGreater(...args), p, 1e-11, `probGreater(${args})`);
});

test('probGreater : symétrie, déterminisme et entrées invalides', () => {
  for (const [a, b, c, d] of [[7, 10, 4, 10], [3, 9, 6, 14], [0, 3, 2, 2], [25, 31, 18, 40]]) {
    close(probGreater(a, b, c, d) + probGreater(c, d, a, b), 1, 1e-12, `symétrie ${[a, b, c, d]}`);
    assert.equal(probGreater(a, b, c, d), probGreater(a, b, c, d));
  }
  assert.throws(() => probGreater(5, 4, 0, 1), RangeError);
  assert.throws(() => probGreater(-1, 4, 0, 1), RangeError);
  assert.throws(() => probGreater(1.5, 4, 0, 1), RangeError);
});

test('mdc95 et rci (Jacobson-Truax, cas unique)', () => {
  close(mdc95(0.2), 0.554, 1e-12);
  close(mdc95(1), 2.77, 1e-12);
  close(rci(6.8, 6.1, 0.2), -0.7 / (Math.SQRT2 * 0.2), 1e-12);
  close(rci(10, 13, 1), 3 / Math.SQRT2, 1e-12);
  assert.equal(rci(5, 5, 0.3), 0);
});
