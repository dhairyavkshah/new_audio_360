import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ThemeName } from '@/constants/theme';
import { IntegrityService } from '@/services/IntegrityService';
import { SecureStorage } from '@/services/SecureStorage';

export type SubscriptionPlan = 'free' | 'premium';

export interface SubscriptionState {
  plan: SubscriptionPlan;
  purchaseToken: string | null;
  productId: string | null;
  purchaseTime: number | null;
  checksum?: string;
}

const SECURE_STORAGE_KEY = 'subscription_data';

export const PRODUCT_IDS = {
  premium: 'new_audio_360_premium',
};

export const PRICING = {
  INR: {
    premium: 299,
    symbol: '₹',
  },
  USD: {
    premium: 30,
    symbol: '$',
  },
  EUR: {
    premium: 27,
    symbol: '€',
  },
  GBP: {
    premium: 24,
    symbol: '£',
  },
  AUD: {
    premium: 45,
    symbol: 'A$',
  },
  CAD: {
    premium: 42,
    symbol: 'C$',
  },
  JPY: {
    premium: 4500,
    symbol: '¥',
  },
  BRL: {
    premium: 150,
    symbol: 'R$',
  },
} as const;

export type SupportedCurrency = keyof typeof PRICING;

interface SubscriptionContextType {
  plan: SubscriptionPlan;
  isLoading: boolean;
  isLocked: boolean;
  lockoutRemaining: number | null;
  isThemeUnlocked: (themeId: ThemeName) => boolean;
  isImmersiveModeUnlocked: () => boolean;
  isNoiseReductionUnlocked: (level: string) => boolean;
  isReverbUnlocked: (reverb: string) => boolean;
  getAvailableThemes: () => ThemeName[];
  purchasePremium: () => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  setPlanForTesting: (plan: SubscriptionPlan) => void;
  runIntegrityCheck: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free',
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

  const initializeWithIntegrity = async () => {
    try {
      await IntegrityService.initialize();
      
      const integrityState = await IntegrityService.runIntegrityCheck();
      
      if (integrityState.isLocked) {
        setIsLocked(true);
        setLockoutRemaining(IntegrityService.getLockoutRemaining());
        setState({ plan: 'free', purchaseToken: null, productId: null, purchaseTime: null });
        setIsLoading(false);
        return;
      }

      if (integrityState.isCompromised) {
        setState({ plan: 'free', purchaseToken: null, productId: null, purchaseTime: null });
        setIsLoading(false);
        return;
      }

      await loadSubscriptionState();
    } catch (error) {
      console.error('Initialization error:', error);
      setState({ plan: 'free', purchaseToken: null, productId: null, purchaseTime: null });
    } finally {
      setIsLoading(false);
    }
  };

  const runPeriodicIntegrityCheck = async () => {
    try {
      const isTestSubscription = state.purchaseToken?.startsWith('test_');
      if (isTestSubscription) {
        return;
      }

      const integrityState = await IntegrityService.runIntegrityCheck();
      
      if (integrityState.isLocked) {
        setIsLocked(true);
        setLockoutRemaining(IntegrityService.getLockoutRemaining());
        setState({ plan: 'free', purchaseToken: null, productId: null, purchaseTime: null });
      } else if (integrityState.isCompromised) {
        setState({ plan: 'free', purchaseToken: null, productId: null, purchaseTime: null });
      }
    } catch (error) {
      console.warn('Periodic integrity check failed:', error);
    }
  };

  const runIntegrityCheck = useCallback(async () => {
    await runPeriodicIntegrityCheck();
  }, []);

  const loadSubscriptionState = async () => {
    try {
      const stored = await SecureStorage.getSecureItem(SECURE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SubscriptionState;
        
        const isTestSubscription = parsed.purchaseToken?.startsWith('test_');
        
        if (!isTestSubscription && parsed.checksum && parsed.purchaseTime) {
          const expectedChecksum = await IntegrityService.computeChecksum(
            parsed.plan,
            parsed.purchaseTime
          );
          
          if (parsed.checksum !== expectedChecksum) {
            console.warn('Subscription data tampering detected');
            setState({ plan: 'free', purchaseToken: null, productId: null, purchaseTime: null });
            return;
          }
        }
        
        setState(parsed);
      }
    } catch (error) {
      console.error('Error loading subscription state:', error);
      setState({ plan: 'free', purchaseToken: null, productId: null, purchaseTime: null });
    }
  };

  const saveSubscriptionState = async (newState: SubscriptionState) => {
    try {
      console.log('[SUB] saveSubscriptionState called with plan:', newState.plan);
      
      const isTestSubscription = newState.purchaseToken?.startsWith('test_');
      
      if (!isTestSubscription) {
        const integrityState = await IntegrityService.runIntegrityCheck(true);
        if (integrityState.isLocked || integrityState.isCompromised) {
          console.warn('Cannot save subscription in compromised state');
          return;
        }
      }

      const checksum = await IntegrityService.computeChecksum(
        newState.plan,
        newState.purchaseTime || Date.now()
      );
      
      const stateWithChecksum = { ...newState, checksum };
      
      await SecureStorage.setSecureItem(SECURE_STORAGE_KEY, JSON.stringify(stateWithChecksum));
      console.log('[SUB] State saved and updated to plan:', stateWithChecksum.plan);
      setState(stateWithChecksum);
    } catch (error) {
      console.error('Error saving subscription state:', error);
    }
  };

  const isThemeUnlocked = useCallback((themeId: ThemeName): boolean => {
    if (isLocked) return false;
    return state.plan === 'premium';
  }, [state.plan, isLocked]);

  const getAvailableThemes = useCallback((): ThemeName[] => {
    if (isLocked) return [];
    if (state.plan === 'premium') {
      return [];
    }
    return [];
  }, [state.plan, isLocked]);

  const isImmersiveModeUnlocked = useCallback((): boolean => {
    console.log('[SUB] isImmersiveModeUnlocked check - plan:', state.plan, 'isLocked:', isLocked);
    if (isLocked) return false;
    return state.plan === 'premium';
  }, [state.plan, isLocked]);

  const isNoiseReductionUnlocked = useCallback((level: string): boolean => {
    if (isLocked) return level === 'Off';
    return state.plan === 'premium';
  }, [state.plan, isLocked]);

  const isReverbUnlocked = useCallback((reverb: string): boolean => {
    if (isLocked) return reverb === 'None';
    return state.plan === 'premium';
  }, [state.plan, isLocked]);

  const purchasePremium = useCallback(async (): Promise<boolean> => {
    try {
      const integrityState = await IntegrityService.runIntegrityCheck(true);
      if (integrityState.isLocked || integrityState.isCompromised) {
        console.warn('Purchase blocked due to integrity issues');
        return false;
      }

      const purchaseTime = Date.now();
      const newState: SubscriptionState = {
        plan: 'premium',
        purchaseToken: `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: PRODUCT_IDS.premium,
        purchaseTime,
      };
      await saveSubscriptionState(newState);
      return true;
    } catch (error) {
      console.error('Error purchasing premium:', error);
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
      await loadSubscriptionState();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPlanForTesting = useCallback((plan: SubscriptionPlan) => {
    const purchaseTime = Date.now();
    const newState: SubscriptionState = {
      plan,
      purchaseToken: plan === 'free' ? null : `test_${Date.now()}`,
      productId: plan === 'free' ? null : PRODUCT_IDS.premium,
      purchaseTime: plan === 'free' ? null : purchaseTime,
    };
    saveSubscriptionState(newState);
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        plan: isLocked ? 'free' : state.plan,
        isLoading,
        isLocked,
        lockoutRemaining,
        isThemeUnlocked,
        isImmersiveModeUnlocked,
        isNoiseReductionUnlocked,
        isReverbUnlocked,
        getAvailableThemes,
        purchasePremium,
        restorePurchases,
        setPlanForTesting,
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
