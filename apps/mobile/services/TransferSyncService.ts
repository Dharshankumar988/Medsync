import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import CryptoJS from 'crypto-js';
import { api } from '../lib/api';

const QUEUE_FILE_PATH = FileSystem.documentDirectory + 'transfer_sync_queue.enc';
const QUEUE_KEY_STORE = 'transfer_sync_queue_key';

export interface TransferRequest {
  action: 'CREATE' | 'AUTHORIZE' | 'COMPLETE';
  transfer_request_id: string;
  transfer_id?: string;
  patient_id?: string;
  pharmacy_id?: string;
  prescription_id?: string;
  authorization_reference?: string;
  timestamp: number;
}

export class TransferSyncService {
  /**
   * Retrieves or generates the symmetric encryption key for the queue.
   */
  private static async getEncryptionKey(): Promise<string> {
    let keyHex = await SecureStore.getItemAsync(QUEUE_KEY_STORE);
    if (!keyHex) {
      const bytes = await Crypto.getRandomBytesAsync(32);
      keyHex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      await SecureStore.setItemAsync(QUEUE_KEY_STORE, keyHex);
    }
    return keyHex;
  }

  /**
   * Add a request to the offline queue.
   */
  static async enqueueRequest(request: Omit<TransferRequest, 'timestamp'>): Promise<void> {
    const queue = await this.getQueue();
    const newRequest: TransferRequest = { ...request, timestamp: Date.now() };
    
    // Check for idempotency in the queue
    const exists = queue.find(
      (r) => r.transfer_request_id === newRequest.transfer_request_id && r.action === newRequest.action
    );
    
    if (!exists) {
      queue.push(newRequest);
      await this.saveQueue(queue);
    }
    
    // Attempt to sync immediately if online
    await this.syncQueue();
  }

  /**
   * Process all requests in the queue.
   */
  static async syncQueue(): Promise<void> {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      return; // Still offline
    }

    const queue = await this.getQueue();
    if (queue.length === 0) {
      return; // Nothing to sync
    }

    try {
      // Sort by timestamp to preserve order
      const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
      
      const response = await api.post('/transfers/sync-transfers', {
        transfer_requests: sortedQueue,
      });

      if (response.data?.data) {
        const { errors } = response.data.data;
        const failedRequestIds = new Set((errors || []).map((err: any) => err.transfer_request_id));
        
        // Only keep items that failed
        const remainingQueue = queue.filter(
          (req) => failedRequestIds.has(req.transfer_request_id)
        );
        
        await this.saveQueue(remainingQueue);
      }
    } catch (error) {
      console.error('Failed to sync transfer queue:', error);
      // Keep items in queue for next time
    }
  }

  /**
   * Load the queue from secure storage.
   */
  static async getQueue(): Promise<TransferRequest[]> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(QUEUE_FILE_PATH);
      if (fileInfo.exists) {
        const encryptedContent = await FileSystem.readAsStringAsync(QUEUE_FILE_PATH);
        const key = await this.getEncryptionKey();
        const decryptedBytes = CryptoJS.AES.decrypt(encryptedContent, key);
        const decrypted = decryptedBytes.toString(CryptoJS.enc.Utf8);
        if (decrypted) {
          return JSON.parse(decrypted) as TransferRequest[];
        }
      }
    } catch (error) {
      console.error('Failed to read and decrypt queue:', error);
    }
    return [];
  }

  /**
   * Save the queue to secure storage.
   */
  private static async saveQueue(queue: TransferRequest[]): Promise<void> {
    try {
      const plaintext = JSON.stringify(queue);
      const key = await this.getEncryptionKey();
      const encrypted = CryptoJS.AES.encrypt(plaintext, key).toString();
      await FileSystem.writeAsStringAsync(QUEUE_FILE_PATH, encrypted);
    } catch (error) {
      console.error('Failed to encrypt and save queue:', error);
      throw error;
    }
  }

  /**
   * Clear the local transfer queue.
   */
  static async clearQueue(): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(QUEUE_FILE_PATH);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(QUEUE_FILE_PATH);
      }
    } catch (error) {
      console.error('Failed to clear transfer queue:', error);
    }
  }
}
