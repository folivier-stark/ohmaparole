const DB_NAME = 'ohmaparole';
const DB_VERSION = 2;
let dbPromise = null;

export const BLOCKED_MESSAGE = 'Ferme les autres onglets OhMaParole, puis rouvre l’appli.';
const BLOCKED_TIMEOUT_MS = 10000;

/** Les stores et leurs index. Migrations UNIQUEMENT additives : on ajoute ce qui manque, on ne touche à rien. */
const STORES = [
  ['meta', 'key', []],
  ['sessions', 'id', ['dateKey']],
  ['recordings', 'id', ['kind']],
  ['audio', 'id', []],
  // v2 (spec V2 §8) : les mesures de la voix, une ligne par valeur (js/core/voice-report.js).
  ['measures', 'id', ['metric', 'dateKey']],
];

function ensureStores(db) {
  for (const [name, keyPath, indexes] of STORES) {
    if (db.objectStoreNames.contains(name)) continue;
    const os = db.createObjectStore(name, { keyPath });
    for (const ix of indexes) os.createIndex(ix, ix);
  }
}

const hasAllStores = (db) => STORES.every(([name]) => db.objectStoreNames.contains(name));

/** Un autre onglet tient l'ancienne version de la base : on le dit, au lieu d'un écran figé. */
function showBlocked() {
  const app = globalThis.document?.getElementById?.('app');
  if (app) app.textContent = BLOCKED_MESSAGE;
}

function open(version, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = version == null ? indexedDB.open(DB_NAME) : indexedDB.open(DB_NAME, version);
    // Pas de blocage infini au démarrage : au bout de 10 s, le même message que onblocked.
    const timer = setTimeout(showBlocked, timeoutMs);
    req.onupgradeneeded = () => ensureStores(req.result);
    req.onblocked = showBlocked;
    req.onsuccess = () => {
      clearTimeout(timer);
      const db = req.result;
      // Une version future ouverte dans un autre onglet : on libère la base pour elle.
      db.onversionchange = () => { db.close(); dbPromise = null; };
      if (!hasAllStores(db)) {
        // Base créée par la branche de secours (version 2 sans le store measures) : on la complète.
        const next = db.version + 1;
        db.close();
        open(next, timeoutMs).then(resolve, reject);
        return;
      }
      resolve(db);
    };
    req.onerror = () => {
      clearTimeout(timer);
      // Base déjà en version plus haute (après une réparation) : on l'ouvre à sa version.
      if (req.error?.name === 'VersionError' && version != null) { open(null, timeoutMs).then(resolve, reject); return; }
      dbPromise = null;
      reject(req.error);
    };
  });
}

export function openDb({ timeoutMs = BLOCKED_TIMEOUT_MS } = {}) {
  if (!dbPromise) dbPromise = open(DB_VERSION, timeoutMs);
  return dbPromise;
}

/** Pour les tests : oublie la base ouverte. */
export function resetDbForTests() {
  dbPromise = null;
}

const asPromise = (req) => new Promise((resolve, reject) => {
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const txDone = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = () => resolve();
  tx.onerror = () => reject(tx.error);
  tx.onabort = () => reject(tx.error);
});

export async function get(store, key) {
  const db = await openDb();
  return asPromise(db.transaction(store).objectStore(store).get(key));
}

export async function getAll(store) {
  const db = await openDb();
  return asPromise(db.transaction(store).objectStore(store).getAll());
}

export async function put(store, value) {
  return putMany(store, [value]);
}

export async function putMany(store, values) {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const v of values) os.put(v);
  return txDone(tx);
}

export async function deleteMany(store, keys) {
  const db = await openDb();
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  for (const k of keys) os.delete(k);
  return txDone(tx);
}
