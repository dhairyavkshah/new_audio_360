import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const ENCRYPTION_PREFIX = 'enc_v1_';
const INTEGRITY_SUFFIX = '_integrity';

class SecureStorageClass {
  private encryptionKey: string | null = null;

  private async getEncryptionKey(): Promise<string> {
    if (this.encryptionKey) return this.encryptionKey;

    const keyComponents = [
      Platform.OS,
      Platform.Version?.toString() || 'unknown',
      'na360_secure',
      '2026',
    ];

    const key = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      keyComponents.join('::')
    );
    
    this.encryptionKey = key;
    return key;
  }

  private async computeHMAC(data: string): Promise<string> {
    const key = await this.getEncryptionKey();
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data + key
    );
  }

  private obfuscate(data: string, key: string): string {
    const keyBytes = key.split('').map(c => c.charCodeAt(0));
    let result = '';
    
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      const keyByte = keyBytes[i % keyBytes.length];
      result += String.fromCharCode(charCode ^ keyByte);
    }
    
    return Buffer.from(result, 'binary').toString('base64');
  }

  private deobfuscate(encoded: string, key: string): string {
    try {
      const decoded = Buffer.from(encoded, 'base64').toString('binary');
      const keyBytes = key.split('').map(c => c.charCodeAt(0));
      let result = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i);
        const keyByte = keyBytes[i % keyBytes.length];
        result += String.fromCharCode(charCode ^ keyByte);
      }
      
      return result;
    } catch (e) {
      throw new Error('Deobfuscation failed');
    }
  }

  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      const encKey = await this.getEncryptionKey();
      
      const timestamp = Date.now();
      const payload = JSON.stringify({ v: value, t: timestamp });
      
      const obfuscated = this.obfuscate(payload, encKey);
      const integrity = await this.computeHMAC(obfuscated);
      
      const finalData = ENCRYPTION_PREFIX + obfuscated;
      
      await AsyncStorage.setItem(key, finalData);
      await AsyncStorage.setItem(key + INTEGRITY_SUFFIX, integrity);
    } catch (e) {
      console.error('SecureStorage.setSecureItem failed:', e);
      throw e;
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      const storedIntegrity = await AsyncStorage.getItem(key + INTEGRITY_SUFFIX);
      
      if (!stored || !storedIntegrity) {
        return null;
      }

      if (!stored.startsWith(ENCRYPTION_PREFIX)) {
        return null;
      }

      const obfuscated = stored.slice(ENCRYPTION_PREFIX.length);
      
      const expectedIntegrity = await this.computeHMAC(obfuscated);
      if (storedIntegrity !== expectedIntegrity) {
        await this.removeSecureItem(key);
        throw new Error('Integrity check failed - data may be tampered');
      }

      const encKey = await this.getEncryptionKey();
      const payload = this.deobfuscate(obfuscated, encKey);
      const parsed = JSON.parse(payload);

      const age = Date.now() - parsed.t;
      if (age < 0) {
        throw new Error('Invalid timestamp - possible tampering');
      }

      return parsed.v;
    } catch (e) {
      console.error('SecureStorage.getSecureItem failed:', e);
      return null;
    }
  }

  async removeSecureItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      await AsyncStorage.removeItem(key + INTEGRITY_SUFFIX);
    } catch (e) {
      console.error('SecureStorage.removeSecureItem failed:', e);
    }
  }

  async verifyIntegrity(key: string): Promise<boolean> {
    try {
      const stored = await AsyncStorage.getItem(key);
      const storedIntegrity = await AsyncStorage.getItem(key + INTEGRITY_SUFFIX);
      
      if (!stored || !storedIntegrity) {
        return true;
      }

      if (!stored.startsWith(ENCRYPTION_PREFIX)) {
        return false;
      }

      const obfuscated = stored.slice(ENCRYPTION_PREFIX.length);
      const expectedIntegrity = await this.computeHMAC(obfuscated);
      
      return storedIntegrity === expectedIntegrity;
    } catch (e) {
      return false;
    }
  }
}

export const SecureStorage = new SecureStorageClass();
