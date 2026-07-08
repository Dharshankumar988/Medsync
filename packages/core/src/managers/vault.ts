import { IStorageProvider } from '../interfaces/storage';
import { IEncryptionProvider } from '../interfaces/encryption';
import { IKeyManagementProvider } from '../interfaces/key-management';
import { DocumentMetadata } from '../models/metadata';
import { BlockchainVerificationService } from '../services/blockchain-verification';

export class VaultManager {
  private verificationService = new BlockchainVerificationService();

  constructor(
    private storageProvider: IStorageProvider,
    private encryptionProvider: IEncryptionProvider,
    private keyManagementProvider: IKeyManagementProvider,
    private metadataStore: Map<string, DocumentMetadata> = new Map()
  ) {}

  /**
   * Securely saves a document to the local encrypted vault.
   */
  async saveDocument(
    documentId: string,
    rawBuffer: Uint8Array,
    metadata: Omit<DocumentMetadata, 'syncStatus' | 'downloadTimestamp'>
  ): Promise<void> {
    // 1. Retrieve or generate key
    let key = await this.keyManagementProvider.retrieveKey(documentId);
    if (!key) {
      key = await this.encryptionProvider.generateKey();
      await this.keyManagementProvider.storeKey(documentId, key);
    }

    // 2. Encrypt
    const encryptedBuffer = await this.encryptionProvider.encrypt(rawBuffer, key);

    // 3. Save to storage
    const path = `vault/${documentId}.enc`;
    await this.storageProvider.saveFile(path, encryptedBuffer);

    // 4. Update metadata
    this.metadataStore.set(documentId, {
      ...metadata,
      downloadTimestamp: Date.now(),
      syncStatus: 'SYNCED',
    });
  }

  /**
   * Retrieves and decrypts a document from the local encrypted vault.
   */
  async getDocument(documentId: string): Promise<Uint8Array | null> {
    const path = `vault/${documentId}.enc`;
    if (!(await this.storageProvider.fileExists(path))) {
      return null;
    }

    const key = await this.keyManagementProvider.retrieveKey(documentId);
    if (!key) {
      throw new Error(`Encryption key for document ${documentId} not found.`);
    }

    const encryptedBuffer = await this.storageProvider.readFile(path);
    const decryptedBuffer = await this.encryptionProvider.decrypt(encryptedBuffer, key);

    const metadata = this.metadataStore.get(documentId);
    if (metadata?.sha256Hash) {
      const integrityHash = this.verificationService.computeSha256(decryptedBuffer);
      if (integrityHash !== metadata.sha256Hash) {
        throw new Error(`Integrity check failed for document ${documentId}`);
      }
    }
    
    return decryptedBuffer;
  }

  async removeDocument(documentId: string): Promise<void> {
    const path = `vault/${documentId}.enc`;
    if (await this.storageProvider.fileExists(path)) {
      await this.storageProvider.deleteFile(path);
    }
    await this.keyManagementProvider.deleteKey(documentId);
    this.metadataStore.delete(documentId);
  }

  /**
   * Gets offline metadata.
   */
  getMetadata(documentId: string): DocumentMetadata | undefined {
    return this.metadataStore.get(documentId);
  }

  setMetadata(documentId: string, metadata: DocumentMetadata): void {
    this.metadataStore.set(documentId, metadata);
  }
}
