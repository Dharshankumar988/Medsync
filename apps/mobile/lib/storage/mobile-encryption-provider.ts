import { IEncryptionProvider } from '@medsync/core';
import * as Crypto from 'expo-crypto';
import CryptoJS from 'crypto-js';

export class MobileEncryptionProvider implements IEncryptionProvider {
  async encrypt(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    const iv = await Crypto.getRandomBytesAsync(16);
    const keyWordArray = CryptoJS.lib.WordArray.create(key as any);
    const ivWordArray = CryptoJS.lib.WordArray.create(iv as any);
    const dataWordArray = CryptoJS.lib.WordArray.create(data as any);

    const encrypted = CryptoJS.AES.encrypt(dataWordArray, keyWordArray, {
      iv: ivWordArray,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const cipherBytes = Buffer.from(encrypted.toString(), 'base64');
    const result = new Uint8Array(iv.length + cipherBytes.length);
    result.set(iv, 0);
    result.set(cipherBytes, iv.length);
    return result;
  }

  async decrypt(encryptedData: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    const iv = encryptedData.slice(0, 16);
    const cipherBytes = encryptedData.slice(16);
    const cipherBase64 = Buffer.from(cipherBytes).toString('base64');

    const keyWordArray = CryptoJS.lib.WordArray.create(key as any);
    const ivWordArray = CryptoJS.lib.WordArray.create(iv as any);

    const decrypted = CryptoJS.AES.decrypt(cipherBase64, keyWordArray, {
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

  async generateKey(): Promise<Uint8Array> {
    return await Crypto.getRandomBytesAsync(32);
  }
}
