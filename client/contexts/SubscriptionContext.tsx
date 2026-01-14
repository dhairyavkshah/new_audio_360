import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ThemeName } from '@/constants/theme';
import { IntegrityService } from '@/services/IntegrityService';
import { SecureStorage } from '@/services/SecureStorage';
import { GooglePlayBilling } from '@/lib/payment';

export type LicenseStatus = 'unlicensed' | 'licensed';

export interface LicenseState {
  status: LicenseStatus;
  purchaseToken: string | null;
  productId: string | null;
  purchaseTime: number | null;
  checksum?: string;
}

const SECURE_STORAGE_KEY = 'subscription_data';

export const PRODUCT_IDS = {
  lifetime: 'new_audio_360_lifetime',
};

export const PRICING = {
  india: {
    oneTime: 299,
    symbol: '₹',
    currency: 'INR',
  },
  international: {
    oneTime: 29,
    symbol: '$',
    currency: 'USD',
  },
} as const;

export type SupportedCurrency = 'INR' | 'USD';

interface SubscriptionContextType {
  licenseStatus: LicenseStatus;
  isLoading: boolean;
  isLocked: boolean;
  lockoutRemaining: number | null;
  isThemeUnlocked: (themeId: ThemeName) => boolean;
  isImmersiveModeUnlocked: () => boolean;
  isNoiseReductionUnlocked: (level: string) => boolean;
  isReverbUnlocked: (reverb: string) => boolean;
  getAvailableThemes: () => ThemeName[];
  purchaseLicense: () => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  setLicenseForTesting: (status: LicenseStatus) => void;
  runIntegrityCheck: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LicenseState>({
    status: 'unlicensed',
    purchaseToken: null,
    productId: null,
    purchaseTime: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number | null>(null);

  useEffect(() => {
    initializeWithIntegrity();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      runPeriodicIntegrityCheck();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lockoutRemaining && lockoutRemaining > 0) {
      const timer = setInterval(() => {
        const remaining = IntegrityService.getLockoutRemaining();
        setLockoutRemaining(remaining);
        if (!remaining) {
          setIsLocked(false);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutRemaining]);

  const getDefaultState = (): LicenseState => ({
    status: 'unlicensed',
    purchaseToken: null,
    productId: null,
    purchaseTime: null,
  });

  const initializeWithIntegrity = async () => {
    try {
      await IntegrityService.initialize();
      
      const integrityState = await IntegrityService.runIntegrityCheck();
      
      if (integrityState.isLocked) {
        setIsLocked(true);
        setLockoutRemaining(IntegrityService.getLockoutRemaining());
        setState(getDefaultState());
        setIsLoading(false);
        return;
      }

      if (integrityState.isCompromised) {
        setState(getDefaultState());
        setIsLoading(false);
        return;
      }

      await loadLicenseState();
    } catch (error) {
      console.error('Initialization error:', error);
      setState(getDefaultState());
    } finally {
      setIsLoading(false);
    }
  };

  const runPeriodicIntegrityCheck = async () => {
    try {
      const isTestLicense = state.purchaseToken?.startsWith('test_');
      if (isTestLicense) {
        return;
      }

      const integrityState = await IntegrityService.runIntegrityCheck();
      
      if (integrityState.isLocked) {
        setIsLocked(true);
        setLockoutRemaining(IntegrityService.getLockoutRemaining());
        setState(getDefaultState());
      } else if (integrityState.isCompromised) {
        setState(getDefaultState());
      }
    } catch (error) {
      console.warn('Periodic integrity check failed:', error);
    }
  };

  const runIntegrityCheck = useCallback(async () => {
    await runPeriodicIntegrityCheck();
  }, []);

  const loadLicenseState = async () => {
    try {
      const stored = await SecureStorage.getSecureItem(SECURE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as LicenseState;
        
        const isTestLicense = parsed.purchaseToken?.startsWith('test_');
        
        if (!isTestLicense && parsed.checksum && parsed.purchaseTime) {
          const expectedChecksum = await IntegrityService.computeChecksum(
            parsed.status,
            parsed.purchaseTime
          );
          
          if (parsed.checksum !== expectedChecksum) {
            console.warn('License data tampering detected');
            setState(getDefaultState());
            return;
          }
        }
        
        setState(parsed);
      }
    } catch (error) {
      console.error('Error loading license state:', error);
      setState(getDefaultState());
    }
  };

  const saveLicenseState = async (newState: LicenseState) => {
    try {
      console.log('[LICENSE] saveLicenseState called with status:', newState.status);
      
      const isTestLicense = newState.purchaseToken?.startsWith('test_');
      
      if (!isTestLicense) {
        const integrityState = await IntegrityService.runIntegrityCheck(true);
        if (integrityState.isLocked || integrityState.isCompromised) {
          console.warn('Cannot save license in compromised state');
          return;
        }
      }

      const checksum = await IntegrityService.computeChecksum(
        newState.status,
        newState.purchaseTime || Date.now()
      );
      
      const stateWithChecksum = { ...newState, checksum };
      
      await SecureStorage.setSecureItem(SECURE_STORAGE_KEY, JSON.stringify(stateWithChecksum));
      console.log('[LICENSE] State saved and updated to status:', stateWithChecksum.status);
      setState(stateWithChecksum);
    } catch (error) {
      console.error('Error saving license state:', error);
    }
  };

  const isThemeUnlocked = useCallback((themeId: ThemeName): boolean => {
    if (isLocked) return false;
    return state.status === 'licensed';
  }, [state.status, isLocked]);

  const getAvailableThemes = useCallback((): ThemeName[] => {
    if (isLocked) return [];
    if (state.status === 'licensed') {
      return [];
    }
    return [];
  }, [state.status, isLocked]);

  const isImmersiveModeUnlocked = useCallback((): boolean => {
    console.log('[LICENSE] isImmersiveModeUnlocked check - status:', state.status, 'isLocked:', isLocked);
    if (isLocked) return false;
    return state.status === 'licensed';
  }, [state.status, isLocked]);

  const isNoiseReductionUnlocked = useCallback((level: string): boolean => {
    if (isLocked) return level === 'Off';
    return state.status === 'licensed';
  }, [state.status, isLocked]);

  const isReverbUnlocked = useCallback((reverb: string): boolean => {
    if (isLocked) return reverb === 'None';
    return state.status === 'licensed';
  }, [state.status, isLocked]);

  const purchaseLicense = useCallback(async (): Promise<boolean> => {
    try {
      const integrityState = await IntegrityService.runIntegrityCheck(true);
      if (integrityState.isLocked || integrityState.isCompromised) {
        console.warn('Purchase blocked due to integrity issues');
        return false;
      }

      const productId = PRODUCT_IDS.lifetime;
      const result = await GooglePlayBilling.purchaseSubscription(productId);
      
      if (!result.success) {
        console.error('Purchase failed');
        return false;
      }

      const purchaseTime = Date.now();

      const newState: LicenseState = {
        status: 'licensed',
        purchaseToken: result.purchaseToken || `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId,
        purchaseTime,
      };
      await saveLicenseState(newState);
      return true;
    } catch (error) {
      console.error('Error purchasing license:', error);
      return false;
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const integrityState = await IntegrityService.runIntegrityCheck(true);
      if (integrityState.isLocked) {
        setIsLocked(true);
        setLockoutRemaining(IntegrityService.getLockoutRemaining());
        return;
      }
      
      await GooglePlayBilling.restoreSubscriptions();
      await loadLicenseState();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setLicenseForTesting = useCallback((status: LicenseStatus) => {
    const purchaseTime = Date.now();
    
    const newState: LicenseState = {
      status,
      purchaseToken: status === 'unlicensed' ? null : `test_${Date.now()}`,
      productId: status === 'unlicensed' ? null : PRODUCT_IDS.lifetime,
      purchaseTime: status === 'unlicensed' ? null : purchaseTime,
    };
    saveLicenseState(newState);
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        licenseStatus: isLocked ? 'unlicensed' : state.status,
        isLoading,
        isLocked,
        lockoutRemaining,
        isThemeUnlocked,
        isImmersiveModeUnlocked,
        isNoiseReductionUnlocked,
        isReverbUnlocked,
        getAvailableThemes,
        purchaseLicense,
        restorePurchases,
        setLicenseForTesting,
        runIntegrityCheck,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
