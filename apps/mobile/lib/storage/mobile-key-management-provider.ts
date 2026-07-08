import { IKeyManagementProvider } from '@medsync/core';
import * as SecureStore from 'expo-secure-store';
import crypto from 'react-native-quick-crypto';

type WrappedKeyEnvelope = {
  iv: string;
  ciphertext: string;
};

const MASTER_KEY_ID = 'vault_master_key';

export class MobileKeyManagementProvider implements IKeyManagementProvider {
  private async getMasterKey(): Promise<Uint8Array> {
    const existing = await SecureStore.getItemAsync(MASTER_KEY_ID);
    if (existing) {
      return this.fromBase64(existing);
    }

    const masterKey = new Uint8Array(crypto.randomBytes(32));
    await SecureStore.setItemAsync(MASTER_KEY_ID, this.toBase64(masterKey));
    return masterKey;
  }

  private toBase64(data: Uint8Array): string {
    return Buffer.from(data).toString('base64');
  }

  private fromBase64(data: string): Uint8Array {
    return new Uint8Array(Buffer.from(data, 'base64'));
  }

  private async wrapKey(rawKey: Uint8Array): Promise<WrappedKeyEnvelope> {
    const masterKey = await this.getMasterKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(masterKey), iv);
    const ciphertext = Buffer.concat([cipher.update(Buffer.from(rawKey)), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return {
      iv: this.toBase64(new Uint8Array(iv)),
      ciphertext: this.toBase64(Buffer.concat([ciphertext, authTag])),
    };
  }

  private async unwrapKey(envelope: WrappedKeyEnvelope): Promise<Uint8Array> {
    const masterKey = await this.getMasterKey();
    const iv = this.fromBase64(envelope.iv);
    const packed = Buffer.from(envelope.ciphertext, 'base64');
    const authTag = packed.subarray(packed.length - 16);
    const ciphertext = packed.subarray(0, packed.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(masterKey), Buffer.from(iv));
    decipher.setAuthTag(authTag as any);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return new Uint8Array(plaintext);
  }

  async storeKey(keyId: string, key: Uint8Array): Promise<void> {
    await SecureStore.setItemAsync(keyId, JSON.stringify(await this.wrapKey(key)));
  }

  async retrieveKey(keyId: string): Promise<Uint8Array | null> {
    const envelopeJson = await SecureStore.getItemAsync(keyId);
    if (!envelopeJson) return null;

    const envelope = JSON.parse(envelopeJson) as WrappedKeyEnvelope;
    return this.unwrapKey(envelope);
  }

  async deleteKey(keyId: string): Promise<void> {
    await SecureStore.deleteItemAsync(keyId);
  }
}
