import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { SecureStorage } from './SecureStorage';

const _s1 = 'na360_is_v2';
const _s2 = 'na360_vc_v2';
const _s3 = 'na360_lu_v2';
const _b1 = 'na360_is_bk';
const _b2 = 'na360_vc_bk';

const LOCKOUT_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_VIOLATIONS = 3;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

interface IntegrityState {
  isCompromised: boolean;
  isLocked: boolean;
  lockoutUntil: number | null;
  violationCount: number;
  lastCheck: number;
  reasons: string[];
}

type CheckResult = { passed: boolean; code: string };

class IntegrityServiceClass {
  private state: IntegrityState = {
    isCompromised: false,
    isLocked: false,
    lockoutUntil: null,
    violationCount: 0,
    lastCheck: 0,
    reasons: [],
  };

  private initialized = false;
  private deviceFingerprint: string | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await SecureStorage.initialize();
      this.deviceFingerprint = await SecureStorage.getDeviceFingerprint();
      await this.loadState();
      this.initialized = true;
    } catch (e) {
      console.warn('Integrity init error');
      this.initialized = true;
    }
  }

  private async loadState(): Promise<void> {
    try {
      let stateData: string | null = null;
      let violationCount = 0;
      let lockoutUntil: number | null = null;

      if (Platform.OS !== 'web') {
        try {
          const secureVc = await SecureStore.getItemAsync(_s2);
          const secureLu = await SecureStore.getItemAsync(_s3);
          if (secureVc) violationCount = parseInt(secureVc, 10) || 0;
          if (secureLu) lockoutUntil = parseInt(secureLu, 10) || null;
        } catch (e) {}
      }

      const backupVc = await AsyncStorage.getItem(_b2);
      if (backupVc) {
        const backupCount = parseInt(backupVc, 10) || 0;
        violationCount = Math.max(violationCount, backupCount);
      }

      stateData = await AsyncStorage.getItem(_b1);
      if (stateData) {
        try {
          const parsed = JSON.parse(stateData);
          this.state = { ...this.state, ...parsed };
        } catch (e) {}
      }

      this.state.violationCount = violationCount;
      if (lockoutUntil) this.state.lockoutUntil = lockoutUntil;

      if (this.state.lockoutUntil && Date.now() > this.state.lockoutUntil) {
        this.state.isLocked = false;
        this.state.lockoutUntil = null;
        this.state.violationCount = Math.max(0, this.state.violationCount - 1);
        await this.saveState();
      } else if (this.state.lockoutUntil) {
        this.state.isLocked = true;
      }
    } catch (e) {}
  }

  private async saveState(): Promise<void> {
    try {
      if (Platform.OS !== 'web') {
        try {
          await SecureStore.setItemAsync(_s2, this.state.violationCount.toString());
          if (this.state.lockoutUntil) {
            await SecureStore.setItemAsync(_s3, this.state.lockoutUntil.toString());
          } else {
            await SecureStore.deleteItemAsync(_s3);
          }
        } catch (e) {}
      }

      await AsyncStorage.setItem(_b2, this.state.violationCount.toString());
      await AsyncStorage.setItem(_b1, JSON.stringify(this.state));
    } catch (e) {}
  }

  private checkEnvironment(): CheckResult {
    if (Platform.OS === 'web') {
      return { passed: true, code: 'ENV_WEB' };
    }

    const suspiciousGlobals = [
      'Frida', 'Cycript', 'substrate', 'xposed',
      'MSHookFunction', '_fridaAgent', 'ObjC',
    ];

    for (const name of suspiciousGlobals) {
      if ((global as any)[name] !== undefined) {
        return { passed: false, code: 'ENV_HOOK' };
      }
    }

    const suspiciousProps = ['__frida__', '__xposed__'];
    for (const prop of suspiciousProps) {
      if ((global as any)[prop] !== undefined) {
        return { passed: false, code: 'ENV_INJECT' };
      }
    }

    return { passed: true, code: 'ENV_OK' };
  }

  private checkTimingIntegrity(): CheckResult {
    const iterations = 50000;
    const start = Date.now();
    let counter = 0;
    
    for (let i = 0; i < iterations; i++) {
      counter += Math.sin(i) * Math.cos(i);
    }
    
    const elapsed = Date.now() - start;
    
    if (elapsed > 10000) {
      return { passed: false, code: 'TIME_SLOW' };
    }
    
    if (elapsed < 0) {
      return { passed: false, code: 'TIME_BACK' };
    }
    
    return { passed: true, code: 'TIME_OK' };
  }

  private async checkStorageIntegrity(): Promise<CheckResult> {
    try {
      const testKey = '_ic_' + Date.now() + '_' + Math.random().toString(36);
      const testValue = Crypto.getRandomBytes(16).join('');
      
      await AsyncStorage.setItem(testKey, testValue);
      const retrieved = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      
      if (retrieved !== testValue) {
        return { passed: false, code: 'STOR_CORRUPT' };
      }
      
      return { passed: true, code: 'STOR_OK' };
    } catch (e) {
      return { passed: false, code: 'STOR_ERR' };
    }
  }

  private checkFunctionIntegrity(): CheckResult {
    const criticalFunctions = [
      AsyncStorage.getItem,
      AsyncStorage.setItem,
      JSON.parse,
      JSON.stringify,
      Array.prototype.map,
    ];

    for (const fn of criticalFunctions) {
      if (!fn || typeof fn !== 'function') {
        return { passed: false, code: 'FN_MISSING' };
      }
    }

    try {
      const testObj = { a: 1, b: 'test' };
      const stringified = JSON.stringify(testObj);
      const parsed = JSON.parse(stringified);
      if (parsed.a !== 1 || parsed.b !== 'test') {
        return { passed: false, code: 'FN_CORRUPT' };
      }
    } catch (e) {
      return { passed: false, code: 'FN_ERR' };
    }

    return { passed: true, code: 'FN_OK' };
  }

  private async checkSecureStorageIntegrity(): Promise<CheckResult> {
    try {
      const testKey = '_ss_test_' + Date.now();
      const testValue = 'integrity_check_' + Math.random();
      
      await SecureStorage.setSecureItem(testKey, testValue);
      const retrieved = await SecureStorage.getSecureItem(testKey);
      await SecureStorage.removeSecureItem(testKey);
      
      if (retrieved !== testValue) {
        return { passed: false, code: 'SS_CORRUPT' };
      }
      
      return { passed: true, code: 'SS_OK' };
    } catch (e) {
      return { passed: true, code: 'SS_SKIP' };
    }
  }

  private async verifySubscriptionData(): Promise<CheckResult> {
    try {
      const subData = await SecureStorage.getSecureItem('subscription_data');
      if (!subData) {
        return { passed: true, code: 'SUB_NONE' };
      }

      let parsed;
      try {
        parsed = JSON.parse(subData);
      } catch (e) {
        return { passed: false, code: 'SUB_PARSE' };
      }
      
      if (!parsed.plan || !parsed.purchaseTime) {
        return { passed: false, code: 'SUB_STRUCT' };
      }

      const isTestSubscription = parsed.purchaseToken?.startsWith('test_');
      if (isTestSubscription) {
        return { passed: true, code: 'SUB_TEST' };
      }

      if (!parsed.checksum) {
        return { passed: false, code: 'SUB_NOSUM' };
      }

      const expectedChecksum = await this.computeChecksum(parsed.plan, parsed.purchaseTime);
      if (parsed.checksum !== expectedChecksum) {
        return { passed: false, code: 'SUB_TAMPER' };
      }

      const age = Date.now() - parsed.purchaseTime;
      if (age < -60000) {
        return { passed: false, code: 'SUB_FUTURE' };
      }

      return { passed: true, code: 'SUB_OK' };
    } catch (e) {
      return { passed: true, code: 'SUB_ERR' };
    }
  }

  async computeChecksum(plan: string, timestamp: number): Promise<string> {
    const salt = this.deviceFingerprint || 'na360_default';
    const data = `${plan}|${timestamp}|${salt}|v2`;
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      data
    );
  }

  async runIntegrityCheck(force = false): Promise<IntegrityState> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (this.state.isLocked) {
      if (this.state.lockoutUntil && Date.now() < this.state.lockoutUntil) {
        return this.state;
      } else {
        this.state.isLocked = false;
        this.state.lockoutUntil = null;
        this.state.violationCount = Math.max(0, this.state.violationCount - 1);
        await this.saveState();
      }
    }

    const now = Date.now();
    if (!force && now - this.state.lastCheck < CHECK_INTERVAL_MS) {
      return this.state;
    }

    const checks: CheckResult[] = [];
    const reasons: string[] = [];

    checks.push(this.checkEnvironment());
    checks.push(this.checkTimingIntegrity());
    checks.push(await this.checkStorageIntegrity());
    checks.push(this.checkFunctionIntegrity());
    checks.push(await this.checkSecureStorageIntegrity());
    checks.push(await this.verifySubscriptionData());

    const failedChecks = checks.filter(c => !c.passed);
    
    if (failedChecks.length > 0) {
      reasons.push(...failedChecks.map(c => c.code));
      this.state.violationCount++;
      this.state.isCompromised = true;

      if (this.state.violationCount >= MAX_VIOLATIONS) {
        this.state.isLocked = true;
        this.state.lockoutUntil = now + LOCKOUT_DURATION_MS;
      }
    } else {
      if (this.state.violationCount > 0 && Math.random() < 0.1) {
        this.state.violationCount = Math.max(0, this.state.violationCount - 0.5);
      }
      this.state.isCompromised = false;
    }

    this.state.lastCheck = now;
    this.state.reasons = reasons;
    
    await this.saveState();
    
    return this.state;
  }

  isAppLocked(): boolean {
    return this.state.isLocked;
  }

  isCompromised(): boolean {
    return this.state.isCompromised;
  }

  getViolationCount(): number {
    return this.state.violationCount;
  }

  getLockoutRemaining(): number | null {
    if (!this.state.lockoutUntil) return null;
    const remaining = this.state.lockoutUntil - Date.now();
    return remaining > 0 ? remaining : null;
  }

  async resetForTesting(): Promise<void> {
    this.state = {
      isCompromised: false,
      isLocked: false,
      lockoutUntil: null,
      violationCount: 0,
      lastCheck: 0,
      reasons: [],
    };
    await this.saveState();
  }
}

export const IntegrityService = new IntegrityServiceClass();
