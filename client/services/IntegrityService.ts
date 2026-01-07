import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const _0x1a2b = 'integrity_state';
const _0x3c4d = 'app_signature';
const _0x5e6f = 'violation_count';
const _0x7g8h = 'last_check';
const _0x9i0j = 'lockout_until';

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
  private expectedSignature: string | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.loadState();
      await this.generateAppSignature();
      this.initialized = true;
    } catch (e) {
      console.warn('Integrity init error');
    }
  }

  private async loadState(): Promise<void> {
    try {
      const stateData = await AsyncStorage.getItem(_0x1a2b);
      if (stateData) {
        const parsed = JSON.parse(stateData);
        this.state = { ...this.state, ...parsed };
        
        if (this.state.lockoutUntil && Date.now() > this.state.lockoutUntil) {
          this.state.isLocked = false;
          this.state.lockoutUntil = null;
          this.state.violationCount = Math.max(0, this.state.violationCount - 1);
        }
      }
    } catch (e) {
      // Silent fail
    }
  }

  private async saveState(): Promise<void> {
    try {
      await AsyncStorage.setItem(_0x1a2b, JSON.stringify(this.state));
    } catch (e) {
      // Silent fail
    }
  }

  private async generateAppSignature(): Promise<void> {
    const components = [
      Platform.OS,
      Platform.Version?.toString() || '',
      'na360',
      '1.0.0',
    ];
    
    const signatureBase = components.join('|');
    this.expectedSignature = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      signatureBase
    );
    
    const storedSig = await AsyncStorage.getItem(_0x3c4d);
    if (!storedSig) {
      await AsyncStorage.setItem(_0x3c4d, this.expectedSignature);
    }
  }

  private async checkAppSignature(): Promise<CheckResult> {
    try {
      const storedSig = await AsyncStorage.getItem(_0x3c4d);
      if (!storedSig || !this.expectedSignature) {
        return { passed: true, code: 'SIG_INIT' };
      }
      
      if (storedSig !== this.expectedSignature) {
        return { passed: false, code: 'SIG_MISMATCH' };
      }
      
      return { passed: true, code: 'SIG_OK' };
    } catch (e) {
      return { passed: true, code: 'SIG_ERR' };
    }
  }

  private checkEnvironment(): CheckResult {
    if (Platform.OS === 'web') {
      return { passed: true, code: 'ENV_WEB' };
    }

    const suspiciousGlobals = [
      'Frida',
      'Cycript', 
      'substrate',
      'xposed',
      'MSHookFunction',
    ];

    for (const name of suspiciousGlobals) {
      if ((global as any)[name] !== undefined) {
        return { passed: false, code: 'ENV_HOOK' };
      }
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__ === true) {
      return { passed: true, code: 'ENV_DEV' };
    }

    return { passed: true, code: 'ENV_OK' };
  }

  private checkTimingIntegrity(): CheckResult {
    const start = Date.now();
    let counter = 0;
    for (let i = 0; i < 10000; i++) {
      counter += Math.random();
    }
    const elapsed = Date.now() - start;
    
    if (elapsed > 5000) {
      return { passed: false, code: 'TIME_SLOW' };
    }
    
    return { passed: true, code: 'TIME_OK' };
  }

  private async checkStorageIntegrity(): Promise<CheckResult> {
    try {
      const testKey = '_ic_' + Date.now();
      const testValue = Math.random().toString(36);
      
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
    ];

    for (const fn of criticalFunctions) {
      if (!fn || typeof fn !== 'function') {
        return { passed: false, code: 'FN_MISSING' };
      }
      
      const fnStr = fn.toString() || '';
      if (!fnStr.includes('[native code]') && fnStr.length < 20) {
        return { passed: false, code: 'FN_MODIFIED' };
      }
    }

    return { passed: true, code: 'FN_OK' };
  }

  private async verifySubscriptionData(): Promise<CheckResult> {
    try {
      const subData = await AsyncStorage.getItem('subscription_data');
      if (!subData) {
        return { passed: true, code: 'SUB_NONE' };
      }

      const parsed = JSON.parse(subData);
      
      if (!parsed.checksum || !parsed.plan || !parsed.timestamp) {
        return { passed: false, code: 'SUB_STRUCT' };
      }

      const expectedChecksum = await this.computeChecksum(parsed.plan, parsed.timestamp);
      if (parsed.checksum !== expectedChecksum) {
        return { passed: false, code: 'SUB_TAMPER' };
      }

      const age = Date.now() - parsed.timestamp;
      if (age < 0 || age > 365 * 24 * 60 * 60 * 1000) {
        return { passed: false, code: 'SUB_TIME' };
      }

      return { passed: true, code: 'SUB_OK' };
    } catch (e) {
      return { passed: true, code: 'SUB_ERR' };
    }
  }

  async computeChecksum(plan: string, timestamp: number): Promise<string> {
    const salt = 'n4360_' + Platform.OS + '_sec';
    const data = `${plan}|${timestamp}|${salt}`;
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
      }
    }

    const now = Date.now();
    if (!force && now - this.state.lastCheck < CHECK_INTERVAL_MS) {
      return this.state;
    }

    const checks: CheckResult[] = [];
    const reasons: string[] = [];

    checks.push(await this.checkAppSignature());
    checks.push(this.checkEnvironment());
    checks.push(this.checkTimingIntegrity());
    checks.push(await this.checkStorageIntegrity());
    checks.push(this.checkFunctionIntegrity());
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
      if (this.state.violationCount > 0) {
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

  async clearLockout(): Promise<void> {
    this.state.isLocked = false;
    this.state.lockoutUntil = null;
    this.state.violationCount = 0;
    this.state.isCompromised = false;
    await this.saveState();
  }
}

export const IntegrityService = new IntegrityServiceClass();
