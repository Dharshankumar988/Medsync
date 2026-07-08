export type SyncStatus = 'SYNCED' | 'PENDING_UPLOAD' | 'OUTDATED';

export interface DocumentMetadata {
  documentId: string;
  version: number;
  lastModified: number;
  downloadTimestamp: number;
  syncStatus: SyncStatus;
  sha256Hash: string;
  blockchainTxHash: string;
  storagePath?: string;
}
