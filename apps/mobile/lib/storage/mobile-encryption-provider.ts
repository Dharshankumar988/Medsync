import { IEncryptionProvider } from '@medsync/core';
import crypto from 'react-native-quick-crypto';

export class MobileEncryptionProvider implements IEncryptionProvider {
  private toBuffer(value: Uint8Array): Buffer {
    return Buffer.from(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  }

  async encrypt(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      try {
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.toBuffer(key), iv);
        
        const encrypted = Buffer.concat([cipher.update(Buffer.from(data)), cipher.final()]);
        const authTag = cipher.getAuthTag();

        // Format: IV (12 bytes) + AuthTag (16 bytes) + EncryptedData
        const result = new Uint8Array(iv.length + authTag.length + encrypted.length);
        result.set(new Uint8Array(iv), 0);
        result.set(new Uint8Array(authTag), iv.length);
        result.set(new Uint8Array(encrypted), iv.length + authTag.length);

        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  }

  async decrypt(encryptedData: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      try {
        const iv = encryptedData.slice(0, 12);
        const authTag = encryptedData.slice(12, 28);
        const data = encryptedData.slice(28);

        const decipher = crypto.createDecipheriv('aes-256-gcm', this.toBuffer(key), Buffer.from(iv));
        decipher.setAuthTag(Buffer.from(authTag) as any);

        const decrypted = Buffer.concat([decipher.update(Buffer.from(data)), decipher.final()]);
        
        resolve(new Uint8Array(decrypted));
      } catch (err) {
        reject(err);
      }
    });
  }

  async generateKey(): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(32, (err, buf) => {
        if (err) {
          reject(err);
          return;
        }
        if (!buf) {
          reject(new Error('Failed to generate encryption key'));
          return;
        }
        resolve(new Uint8Array(buf));
      });
    });
  }
}
