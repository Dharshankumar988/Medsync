export interface IStorageProvider {
  /**
   * Saves raw encrypted data to local storage at the given path.
   */
  saveFile(path: string, data: Uint8Array): Promise<void>;

  /**
   * Reads raw encrypted data from local storage at the given path.
   */
  readFile(path: string): Promise<Uint8Array>;

  /**
   * Deletes a file from local storage.
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Checks if a file exists.
   */
  fileExists(path: string): Promise<boolean>;
}
