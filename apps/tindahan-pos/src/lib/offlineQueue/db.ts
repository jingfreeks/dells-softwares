const DB_VERSION = 1;
const STORE_NAME = "pending_sales";

function dbName(storeId: string): string {
  return `tindahan-pos-offline-queue-${storeId}`;
}

function openDb(storeId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName(storeId), DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status");
        store.createIndex("createdAt", "createdAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeId: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const db = await openDb(storeId);
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = run(store);
      if (result instanceof IDBRequest) {
        result.onsuccess = () => resolve(result.result);
        result.onerror = () => reject(result.error);
      } else {
        result.then(resolve, reject);
      }
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function dbPut<T>(storeId: string, value: T): Promise<void> {
  await withStore(storeId, "readwrite", (store) => store.put(value));
}

export async function dbGetAll<T>(storeId: string): Promise<T[]> {
  return withStore(storeId, "readonly", (store) => store.getAll() as IDBRequest<T[]>);
}

export async function dbDelete(storeId: string, id: string): Promise<void> {
  await withStore(storeId, "readwrite", (store) => store.delete(id));
}
