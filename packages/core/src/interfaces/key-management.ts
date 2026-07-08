export interface IKeyManagementProvider {
  /**
  * Secures and stores an encryption key in the platform's credential store.
  * Implementations should persist only wrapped/encrypted key material.
  * @param keyId A unique identifier for the key (e.g. user_id or document_id).
  * @param key The raw key bytes to wrap before storage.
   */
  storeKey(keyId: string, key: Uint8Array): Promise<void>;

  /**
  * Retrieves and unwraps an encryption key from the platform's credential store.
   * @param keyId The unique identifier.
   */
  retrieveKey(keyId: string): Promise<Uint8Array | null>;

  /**
   * Deletes a key from the secure store.
   */
  deleteKey(keyId: string): Promise<void>;
}
