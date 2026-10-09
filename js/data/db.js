const DB_NAME = 'ohmaparole';
const DB_VERSION = 2;
let dbPromise = null;

export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = req.result;
        // Migrations UNIQUEMENT additives : on ajoute des stores et des index, on ne touche à aucune donnée.
        if (e.oldVersion < 1) {
          db.createObjectStore('meta', { keyPath: 'key' });
          db.createObjectStore('sessions', { keyPath: 'id' }).createIndex('dateKey', 'dateKey');
          db.createObjectStore('recordings', { keyPath: 'id' }).createIndex('kind', 'kind');
          db.createObjectStore('audio', { keyPath: 'id' });
        }
        // v2 (spec V2 §8) : les mesures de la voix, une ligne par valeur (js/core/voice-report.js).
        if (e.oldVersion < 2) {
          const measures = db.createObjectStore('measures', { keyPath: 'id' });
          measures.createIndex('metric', 'metric');
          measures.createIndex('dateKey', 'dateKey');
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        // Un onglet resté ouvert sur une version plus ancienne ne doit pas bloquer la mise à jour suivante.
        db.onversionchange = () => { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = () => { dbPromise = null; reject(req.error); };
    });
  }
  return dbPromise;
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
