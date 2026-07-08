import CryptoJS from 'crypto-js';

export class BlockchainVerificationService {
  /**
   * Recalculates the SHA-256 hash of a file buffer and compares it against the expected hash from the blockchain.
   * @param rawBuffer The raw decrypted file buffer.
   * @param expectedHash The SHA-256 hash retrieved from the blockchain/backend metadata.
   * @returns true if the file is intact, false otherwise.
   */
  verifyIntegrity(rawBuffer: Uint8Array, expectedHash: string): boolean {
    // Convert Uint8Array to WordArray for crypto-js
    const words: number[] = [];
    for (let i = 0; i < rawBuffer.length; i++) {
      words[i >>> 2] |= rawBuffer[i] << (24 - (i % 4) * 8);
    }
    const wordArray = CryptoJS.lib.WordArray.create(words, rawBuffer.length);

    // Calculate SHA-256
    const calculatedHash = CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);

    return calculatedHash === expectedHash;
  }

  computeSha256(rawBuffer: Uint8Array): string {
    const words: number[] = [];
    for (let i = 0; i < rawBuffer.length; i++) {
      words[i >>> 2] |= rawBuffer[i] << (24 - (i % 4) * 8);
    }
    const wordArray = CryptoJS.lib.WordArray.create(words, rawBuffer.length);
    return CryptoJS.SHA256(wordArray).toString(CryptoJS.enc.Hex);
  }
}
