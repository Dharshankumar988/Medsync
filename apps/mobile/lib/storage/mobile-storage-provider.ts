import { IStorageProvider } from '@medsync/core';
import * as FileSystem from 'expo-file-system';

export class MobileStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = `${FileSystem.Paths.document}/vault/`;
    this.ensureDir();
  }

  private async ensureDir() {
    const dirInfo = await FileSystem.getInfoAsync(this.baseDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.baseDir, { intermediates: true });
    }
  }

  async saveFile(path: string, data: Uint8Array): Promise<void> {
    const fullPath = `${this.baseDir}${path}`;
    // Convert Uint8Array to base64 for FileSystem
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(data)));
    await FileSystem.writeAsStringAsync(fullPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  async readFile(path: string): Promise<Uint8Array> {
    const fullPath = `${this.baseDir}${path}`;
    const base64 = await FileSystem.readAsStringAsync(fullPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Convert base64 to Uint8Array
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }

  async deleteFile(path: string): Promise<void> {
    const fullPath = `${this.baseDir}${path}`;
    await FileSystem.deleteAsync(fullPath, { idempotent: true });
  }

  async fileExists(path: string): Promise<boolean> {
    const fullPath = `${this.baseDir}${path}`;
    const info = await FileSystem.getInfoAsync(fullPath);
    return info.exists;
  }
}
