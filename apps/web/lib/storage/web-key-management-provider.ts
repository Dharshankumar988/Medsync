import { IKeyManagementProvider } from '@medsync/core';
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'medsync_keystore';
const STORE_NAME = 'keys';
const MASTER_KEY_STORE = 'master_keys';

type WrappedKeyEnvelope = {
  iv: number[];
  ciphertext: number[];
};

export class WebKeyManagementProvider implements IKeyManagementProvider {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(MASTER_KEY_STORE)) {
          db.createObjectStore(MASTER_KEY_STORE);
        }
      },
    });
  }

  private async getMasterKey(): Promise<CryptoKey> {
    const db = await this.dbPromise;
    const existing = await db.get(MASTER_KEY_STORE, 'default');
    if (existing) {
      return existing as CryptoKey;
    }

    const masterKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    await db.put(MASTER_KEY_STORE, masterKey, 'default');
    return masterKey;
  }

  private async wrapKey(rawKey: Uint8Array): Promise<WrappedKeyEnvelope> {
    const masterKey = await this.getMasterKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      masterKey,
      Uint8Array.from(rawKey)
    );

    return {
      iv: Array.from(iv),
      ciphertext: Array.from(new Uint8Array(ciphertext)),
    };
  }

  private async unwrapKey(envelope: WrappedKeyEnvelope): Promise<Uint8Array> {
    const masterKey = await this.getMasterKey();
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(envelope.iv) },
      masterKey,
      new Uint8Array(envelope.ciphertext)
    );
    return new Uint8Array(plaintext);
  }

  async storeKey(keyId: string, key: Uint8Array): Promise<void> {
    const db = await this.dbPromise;
    await db.put(STORE_NAME, await this.wrapKey(key), keyId);
  }

  async retrieveKey(keyId: string): Promise<Uint8Array | null> {
    const db = await this.dbPromise;
    const envelope = await db.get(STORE_NAME, keyId) as WrappedKeyEnvelope | undefined;
    if (!envelope) return null;
    return this.unwrapKey(envelope);
  }

  async deleteKey(keyId: string): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, keyId);
  }
}
