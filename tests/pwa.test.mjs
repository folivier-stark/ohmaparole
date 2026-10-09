import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const sw = read('sw.js');
const ASSETS = JSON.parse(sw.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);
const walk = (dir) => readdirSync(join(ROOT, dir)).flatMap((f) => {
  const p = `${dir}/${f}`;
  return statSync(join(ROOT, p)).isDirectory() ? walk(p) : [p];
});

test('tout fichier servi est précaché', () => {
  for (const f of ['js', 'css', 'content', 'icons'].flatMap(walk)) assert.ok(ASSETS.includes(`./${f}`), `manque dans ASSETS : ./${f}`);
  for (const f of ['./', './index.html', './manifest.webmanifest']) assert.ok(ASSETS.includes(f), f);
});

test('chaque entrée de ASSETS existe', () => {
  for (const a of ASSETS) if (a !== './') assert.ok(existsSync(join(ROOT, a)), `fichier absent : ${a}`);
});

test('versions alignées entre sw.js et js/version.js', () => {
  const v1 = sw.match(/const VERSION = '([^']+)';/)[1];
  const v2 = read('js/version.js').match(/APP_VERSION = '([^']+)';/)[1];
  assert.equal(v1, v2);
});

test('les polices précachées par le SW sont celles de index.html, chargées en CORS', () => {
  const css = sw.match(/const FONTS_CSS = '([^']+)';/)[1];
  const link = read('index.html').match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com[^"]+)"([^>]*)>/);
  assert.equal(link[1], css);
  assert.match(link[2], /\bcrossorigin\b/);
});

test('manifest valide avec raccourcis', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.short_name, 'OhMaParole');
  assert.equal(m.display, 'standalone');
  assert.equal(m.shortcuts.length, 2);
  for (const i of m.icons) assert.ok(existsSync(join(ROOT, i.src)), i.src);
});
