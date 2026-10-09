const DB_NAME = 'ohmaparole';
const DB_VERSION = 1;
let dbPromise = null;

export function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = req.result;
        // Migrations UNIQUEMENT additives : if (e.oldVersion < 2) { ... }
        if (e.oldVersion < 1) {
          db.createObjectStore('meta', { keyPath: 'key' });
          db.createObjectStore('sessions', { keyPath: 'id' }).createIndex('dateKey', 'dateKey');
          db.createObjectStore('recordings', { keyPath: 'id' }).createIndex('kind', 'kind');
          db.createObjectStore('audio', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
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
