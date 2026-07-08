import { IStorageProvider } from '@medsync/core';
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'medsync_vault';
const STORE_NAME = 'files';

export class WebStorageProvider implements IStorageProvider {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }

  async saveFile(path: string, data: Uint8Array): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STORE_NAME, data, path);
  }

  async readFile(path: string): Promise<Uint8Array> {
    const db = await this.dbPromise;
    const data = await db.get(STORE_NAME, path);
    if (!data) throw new Error(`File not found: ${path}`);
    return data;
  }

  async deleteFile(path: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, path);
  }

  async fileExists(path: string): Promise<boolean> {
    const db = await this.dbPromise;
    const data = await db.get(STORE_NAME, path);
    return data !== undefined;
  }
}
