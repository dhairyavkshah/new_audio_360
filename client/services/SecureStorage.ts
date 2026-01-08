import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const _k1 = 'na360_dk_v2';
const _k2 = 'na360_sk_v2';
const PREFIX = 'ss_v2_';
const HMAC_SUFFIX = '_h';

class SecureStorageClass {
  private deviceKey: string | null = null;
  private saltKey: string | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (Platform.OS === 'web') {
        this.deviceKey = await this.getOrCreateWebKey(_k1);
        this.saltKey = await this.getOrCreateWebKey(_k2);
      } else {
        this.deviceKey = await this.getOrCreateSecureKey(_k1);
        this.saltKey = await this.getOrCreateSecureKey(_k2);
      }
      this.initialized = true;
    } catch (e) {
      const fallback = await this.generateFallbackKey();
      this.deviceKey = fallback;
      this.saltKey = fallback.split('').reverse().join('');
      this.initialized = true;
    }
  }

  private async getOrCreateSecureKey(keyName: string): Promise<string> {
    try {
      let existing = await SecureStore.getItemAsync(keyName);
      if (existing) return existing;

      const newKey = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}_${Math.random()}_${Platform.OS}_na360`
      );

      await SecureStore.setItemAsync(keyName, newKey);
      return newKey;
    } catch (e) {
      return await this.generateFallbackKey();
    }
  }

  private async getOrCreateWebKey(keyName: string): Promise<string> {
    let existing = await AsyncStorage.getItem(`web_${keyName}`);
    if (existing) return existing;

    const newKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Date.now()}_${Math.random()}_web_na360_secure`
    );

    await AsyncStorage.setItem(`web_${keyName}`, newKey);
    return newKey;
  }

  private async generateFallbackKey(): Promise<string> {
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${Platform.OS}_${Platform.Version}_na360_fallback_v2`
    );
  }

  private async getEncryptionKey(): Promise<string> {
    if (!this.initialized) await this.initialize();
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${this.deviceKey}::${this.saltKey}::enc`
    );
  }

  private async getHmacKey(): Promise<string> {
    if (!this.initialized) await this.initialize();
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${this.saltKey}::${this.deviceKey}::hmac`
    );
  }

  private async computeHMAC(data: string): Promise<string> {
    const hmacKey = await this.getHmacKey();
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      hmacKey + data + hmacKey
    );
  }

  private xorEncode(data: string, key: string): string {
    const keyBytes = key.split('').map(c => c.charCodeAt(0));
    const dataBytes = data.split('').map(c => c.charCodeAt(0));
    const encoded: number[] = [];
    
    for (let i = 0; i < dataBytes.length; i++) {
      const k1 = keyBytes[i % keyBytes.length];
      const k2 = keyBytes[(i * 7 + 3) % keyBytes.length];
      encoded.push(dataBytes[i] ^ k1 ^ k2);
    }
    
    return encoded.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private xorDecode(hexData: string, key: string): string {
    const keyBytes = key.split('').map(c => c.charCodeAt(0));
    const decoded: string[] = [];
    
    for (let i = 0; i < hexData.length; i += 2) {
      const byte = parseInt(hexData.substr(i, 2), 16);
      const idx = i / 2;
      const k1 = keyBytes[idx % keyBytes.length];
      const k2 = keyBytes[(idx * 7 + 3) % keyBytes.length];
      decoded.push(String.fromCharCode(byte ^ k1 ^ k2));
    }
    
    return decoded.join('');
  }

  async setSecureItem(key: string, value: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    try {
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 10);
      const payload = JSON.stringify({ v: value, t: timestamp, n: nonce });
      
      const encKey = await this.getEncryptionKey();
      const encoded = this.xorEncode(payload, encKey);
      
      const finalData = PREFIX + encoded;
      const hmac = await this.computeHMAC(finalData);
      
      await AsyncStorage.setItem(key, finalData);
      await AsyncStorage.setItem(key + HMAC_SUFFIX, hmac);
    } catch (e) {
      console.error('SecureStorage.setSecureItem failed:', e);
      throw e;
    }
  }

  async getSecureItem(key: string): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    try {
      const stored = await AsyncStorage.getItem(key);
      const storedHmac = await AsyncStorage.getItem(key + HMAC_SUFFIX);
      
      if (!stored || !storedHmac) {
        return null;
      }

      if (!stored.startsWith(PREFIX)) {
        await this.removeSecureItem(key);
        return null;
      }

      const expectedHmac = await this.computeHMAC(stored);
      if (storedHmac !== expectedHmac) {
        await this.removeSecureItem(key);
        console.warn('HMAC verification failed - data may be tampered');
        return null;
      }

      const encoded = stored.slice(PREFIX.length);
      const encKey = await this.getEncryptionKey();
      const payload = this.xorDecode(encoded, encKey);
      
      const parsed = JSON.parse(payload);

      const age = Date.now() - parsed.t;
      if (age < -60000) {
        console.warn('Invalid timestamp detected');
        return null;
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
      await AsyncStorage.removeItem(key + HMAC_SUFFIX);
    } catch (e) {
      console.error('SecureStorage.removeSecureItem failed:', e);
    }
  }

  async verifyIntegrity(key: string): Promise<boolean> {
    if (!this.initialized) await this.initialize();

    try {
      const stored = await AsyncStorage.getItem(key);
      const storedHmac = await AsyncStorage.getItem(key + HMAC_SUFFIX);
      
      if (!stored || !storedHmac) return true;
      if (!stored.startsWith(PREFIX)) return false;

      const expectedHmac = await this.computeHMAC(stored);
      return storedHmac === expectedHmac;
    } catch (e) {
      return false;
    }
  }

  async getDeviceFingerprint(): Promise<string> {
    if (!this.initialized) await this.initialize();
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${this.deviceKey}_fp`
    );
  }
}

export const SecureStorage = new SecureStorageClass();
