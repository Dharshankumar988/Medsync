import { IKeyManagementProvider } from '@medsync/core';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

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

    const masterKey = await Crypto.getRandomBytesAsync(32);
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
    const iv = await Crypto.getRandomBytesAsync(16);
    const keyWordArray = CryptoJS.lib.WordArray.create(masterKey as any);
    const ivWordArray = CryptoJS.lib.WordArray.create(iv as any);
    const dataWordArray = CryptoJS.lib.WordArray.create(rawKey as any);

    const encrypted = CryptoJS.AES.encrypt(dataWordArray, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return {
      iv: this.toBase64(iv),
      ciphertext: encrypted.toString(),
    };
  }

  private async unwrapKey(envelope: WrappedKeyEnvelope): Promise<Uint8Array> {
    const masterKey = await this.getMasterKey();
    const iv = this.fromBase64(envelope.iv);
    const keyWordArray = CryptoJS.lib.WordArray.create(masterKey as any);
    const ivWordArray = CryptoJS.lib.WordArray.create(iv as any);

    const decrypted = CryptoJS.AES.decrypt(envelope.ciphertext, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const sigBytes = decrypted.sigBytes;
    const words = decrypted.words;
    const u8 = new Uint8Array(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
      u8[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return u8;
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
