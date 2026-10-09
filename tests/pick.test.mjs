import test from 'node:test';
import assert from 'node:assert/strict';
import { hashString, pickLeastRecent } from '../js/core/pick.js';

const C = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

test('hashString est stable', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
});

test('préfère un item jamais joué', () => {
  assert.equal(pickLeastRecent(C, ['a', 'b'], 's').id, 'c');
});

test('sinon le moins récemment joué (historique : le plus récent en premier)', () => {
  assert.equal(pickLeastRecent(C, ['c', 'a', 'b'], 's').id, 'b');
});

test('déterministe pour une même graine', () => {
  assert.equal(pickLeastRecent(C, [], 'x').id, pickLeastRecent(C, [], 'x').id);
});

test('erreur si aucun candidat', () => {
  assert.throws(() => pickLeastRecent([], [], 's'));
});
