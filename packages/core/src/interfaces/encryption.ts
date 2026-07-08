export interface IEncryptionProvider {
  /**
   * Encrypts plaintext data using AES-256-GCM (or equivalent strong AEAD cipher).
   * @param data The raw file buffer.
   * @param key The encryption key bytes.
   * @returns The encrypted data including IV and Auth Tag.
   */
  encrypt(data: Uint8Array, key: Uint8Array): Promise<Uint8Array>;

  /**
   * Decrypts ciphertext using AES-256-GCM.
   * @param encryptedData The encrypted buffer containing IV, Auth Tag, and ciphertext.
   * @param key The encryption key bytes.
   * @returns The decrypted raw file buffer.
   */
  decrypt(encryptedData: Uint8Array, key: Uint8Array): Promise<Uint8Array>;

  /**
   * Generates a secure random AES-256 key (32 bytes).
   */
  generateKey(): Promise<Uint8Array>;
}
