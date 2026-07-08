import { IEncryptionProvider } from '@medsync/core';

export class WebEncryptionProvider implements IEncryptionProvider {
  private toBufferSource(value: Uint8Array): ArrayBuffer {
    return Uint8Array.from(value).buffer;
  }

  async encrypt(data: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.toBufferSource(key),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      this.toBufferSource(data)
    );

    const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encryptedBuffer), iv.length);
    return result;
  }

  async decrypt(encryptedData: Uint8Array, key: Uint8Array): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      this.toBufferSource(key),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    const iv = encryptedData.slice(0, 12);
    const data = encryptedData.slice(12);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      this.toBufferSource(data)
    );

    return new Uint8Array(decryptedBuffer);
  }

  async generateKey(): Promise<Uint8Array> {
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
    const rawKey = await crypto.subtle.exportKey('raw', key);
    return new Uint8Array(rawKey);
  }
}
