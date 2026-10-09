// js/data/db.js sous Node, avec un faux IndexedDB : migration additive, onblocked, délai, versionchange.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, resetDbForTests, BLOCKED_MESSAGE } from '../js/data/db.js';

const app = { textContent: '' };
globalThis.document = { getElementById: (id) => (id === 'app' ? app : null) };

/** Une base : stores existants, version. open() rend une requête que le test pilote. */
function fakeIdb(disk) {
  const reqs = [];
  globalThis.indexedDB = {
    open(name, version) {
      const req = { name, version };
      reqs.push(req);
      const makeDb = () => {
        const names = disk.stores;
        return {
          version: disk.version,
          objectStoreNames: { contains: (n) => names.includes(n) },
          createObjectStore(n) { names.push(n); return { createIndex() {} }; },
          close() { this.closed = true; },
        };
      };
      req.succeed = () => { req.result = makeDb(); req.onsuccess?.(); };
      req.upgrade = (oldVersion) => { disk.version = version; req.result = makeDb(); req.onupgradeneeded?.({ oldVersion }); };
      return req;
    },
  };
  return reqs;
}

test('openDb : migration additive v1 → v2, le store measures est ajouté', async () => {
  resetDbForTests();
  const disk = { version: 1, stores: ['meta', 'sessions', 'recordings', 'audio'] };
  const reqs = fakeIdb(disk);
  const p = openDb();
  assert.equal(reqs[0].version, 2);
  reqs[0].upgrade(1);
  reqs[0].succeed();
  const db = await p;
  assert.deepEqual(disk.stores, ['meta', 'sessions', 'recordings', 'audio', 'measures']);
  // Une version future dans un autre onglet : la base est libérée.
  db.onversionchange();
  assert.equal(db.closed, true);
});

test('openDb : un autre onglet bloque la mise à jour, l’appli le dit', async () => {
  resetDbForTests();
  app.textContent = '';
  const reqs = fakeIdb({ version: 1, stores: ['meta', 'sessions', 'recordings', 'audio'] });
  openDb({ timeoutMs: 20 });
  reqs[0].onblocked();
  assert.equal(app.textContent, BLOCKED_MESSAGE);
  assert.equal(BLOCKED_MESSAGE, 'Ferme les autres onglets OhMaParole, puis rouvre l’appli.');
});

test('openDb : jamais de blocage muet au démarrage, le message au bout du délai', async () => {
  resetDbForTests();
  app.textContent = '';
  fakeIdb({ version: 2, stores: [] });
  openDb({ timeoutMs: 20 });
  await new Promise((r) => { setTimeout(r, 40); });
  assert.equal(app.textContent, BLOCKED_MESSAGE);
});

test('openDb : une base v2 sans measures (branche de secours) est complétée', async () => {
  resetDbForTests();
  const disk = { version: 2, stores: ['meta', 'sessions', 'recordings', 'audio'] };
  const reqs = fakeIdb(disk);
  const p = openDb({ timeoutMs: 1000 });
  reqs[0].succeed();
  assert.equal(reqs.length, 2, 'rouverte en version 3');
  assert.equal(reqs[1].version, 3);
  reqs[1].upgrade(2);
  reqs[1].succeed();
  await p;
  assert.ok(disk.stores.includes('measures'));
});
