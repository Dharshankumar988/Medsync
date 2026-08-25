import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import crypto from 'react-native-quick-crypto';
import { api } from '../lib/api';

const QUEUE_FILE_PATH = FileSystem.documentDirectory + 'transfer_sync_queue.enc';
const QUEUE_KEY_STORE = 'transfer_sync_queue_key';
const ALGORITHM = 'aes-256-cbc';

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
  private static async getEncryptionKey(): Promise<Buffer> {
    let keyHex = await SecureStore.getItemAsync(QUEUE_KEY_STORE);
    if (!keyHex) {
      const newKey = crypto.randomBytes(32);
      keyHex = newKey.toString('hex');
      await SecureStore.setItemAsync(QUEUE_KEY_STORE, keyHex);
    }
    return Buffer.from(keyHex, 'hex');
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
        const encryptedContentBase64 = await FileSystem.readAsStringAsync(QUEUE_FILE_PATH);
        const encryptedBuffer = Buffer.from(encryptedContentBase64, 'base64');
        
        // Extract IV and ciphertext
        const iv = encryptedBuffer.subarray(0, 16);
        const ciphertext = encryptedBuffer.subarray(16);
        
        const key = await this.getEncryptionKey();
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        
        let decrypted = decipher.update(ciphertext, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted) as TransferRequest[];
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
      const iv = crypto.randomBytes(16);
      
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      let ciphertext = cipher.update(plaintext, 'utf8');
      ciphertext = Buffer.concat([ciphertext, cipher.final()]);
      
      const encryptedBuffer = Buffer.concat([iv, ciphertext]);
      const encryptedBase64 = encryptedBuffer.toString('base64');
      
      await FileSystem.writeAsStringAsync(QUEUE_FILE_PATH, encryptedBase64);
    } catch (error) {
      console.error('Failed to write and encrypt queue:', error);
    }
  }
}
