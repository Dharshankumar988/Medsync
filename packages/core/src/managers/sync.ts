import { DocumentMetadata } from '../models/metadata';
import { VaultManager } from './vault';
import { BlockchainVerificationService } from '../services/blockchain-verification';

export class OfflineSynchronizationManager {
  private verificationService = new BlockchainVerificationService();

  constructor(
    private vaultManager: VaultManager,
    private apiClient: any // Should be an abstraction over Axios or fetch
  ) {}

  /**
   * Synchronizes the local vault with the remote Supabase backend.
   * Downloads missing or outdated documents and updates metadata.
   */
  async synchronize(): Promise<void> {
    try {
      // 1. Fetch latest metadata from backend
      const remoteMetadata: DocumentMetadata[] = await this.fetchRemoteMetadata();

      for (const remoteDoc of remoteMetadata) {
        const localDoc = this.vaultManager.getMetadata(remoteDoc.documentId);

        if (!localDoc || localDoc.version < remoteDoc.version) {
          // Document is missing or outdated -> Download and cache
          await this.downloadAndCacheDocument(remoteDoc);
        } else if (localDoc.sha256Hash !== remoteDoc.sha256Hash) {
          // Local content drifted or was tampered with -> refresh from source of truth
          await this.downloadAndCacheDocument(remoteDoc);
        }
      }
    } catch (error) {
      console.error('Offline synchronization failed:', error);
    }
  }

  private async fetchRemoteMetadata(): Promise<DocumentMetadata[]> {
    if (!this.apiClient?.get) {
      return [];
    }

    const response = await this.apiClient.get('/api/v1/records/offline-metadata');
    return (response?.data?.data ?? response?.data ?? []) as DocumentMetadata[];
  }

  private async downloadAndCacheDocument(metadata: DocumentMetadata): Promise<void> {
    if (!metadata.storagePath) {
      throw new Error(`Missing storage path for document ${metadata.documentId}`);
    }

    if (!this.apiClient?.get) {
      throw new Error('Offline synchronization client is not configured');
    }

    const downloadResponse = await this.apiClient.get(`/api/v1/records/${metadata.documentId}/download`);
    const signedUrl = downloadResponse?.data?.data?.signed_url ?? downloadResponse?.data?.signed_url;
    if (!signedUrl) {
      throw new Error(`Failed to obtain download URL for document ${metadata.documentId}`);
    }

    const fileResponse = await fetch(signedUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download document ${metadata.documentId}: ${fileResponse.status}`);
    }

    const rawArrayBuffer = await fileResponse.arrayBuffer();
    const rawBuffer = new Uint8Array(rawArrayBuffer);

    const calculatedHash = this.verificationService.computeSha256(rawBuffer);
    if (calculatedHash !== metadata.sha256Hash) {
      throw new Error(`Integrity check failed for remote document ${metadata.documentId}`);
    }

    // 2. Pass to VaultManager to encrypt and store
    await this.vaultManager.saveDocument(metadata.documentId, rawBuffer, metadata);
    this.vaultManager.setMetadata(metadata.documentId, {
      ...metadata,
      downloadTimestamp: Date.now(),
      syncStatus: 'SYNCED',
    });
  }
}
