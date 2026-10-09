import test from 'node:test';
import assert from 'node:assert/strict';
import { parseYamlSubset, extractYamlBlocks } from '../tools/yaml-subset.mjs';

const sample = [
  '# ---------- commentaire ----------',
  '- id: E01',
  '  bloc: echauffement',
  '  type: voix',
  '  semaine_min: 1',
  '  duree_s: 30',
  '  titre: Le long soupir',
  '  consigne:',
  '    - Inspire : doucement.',
  '    - "Souffle « fff »."',
  '  texte: null',
  '  pourquoi: Ça calme : vraiment.',
  '',
  '- id: L01',
  '  passage: >',
  '    Ligne un',
  '    ligne deux.',
  '  titre: "Titre, cité"',
  '',
  'consignes_ecoute:',
  '  - id: C01',
  '    texte: "Pose une question, puis tais-toi."',
].join('\n');

test('parse le sous-ensemble YAML du rapport de contenu', () => {
  const { items, consignes } = parseYamlSubset(sample);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0].consigne, ['Inspire : doucement.', 'Souffle « fff ».']);
  assert.equal(items[0].texte, null);
  assert.equal(items[0].semaine_min, 1);
  assert.equal(items[0].pourquoi, 'Ça calme : vraiment.');
  assert.equal(items[1].passage, 'Ligne un ligne deux.');
  assert.equal(items[1].titre, 'Titre, cité');
  assert.deepEqual(consignes, [{ id: 'C01', texte: 'Pose une question, puis tais-toi.' }]);
});

test('ligne inconnue = erreur explicite avec son numéro', () => {
  assert.throws(() => parseYamlSubset('- id: X\nnimporte quoi'), /Ligne 2/);
});

test('extractYamlBlocks', () => {
  assert.equal(extractYamlBlocks('a\n```yaml\nx: 1\n```\nb\n```yaml\ny: 2\n```'), 'x: 1\ny: 2');
});
