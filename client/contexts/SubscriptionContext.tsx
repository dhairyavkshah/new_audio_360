import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ThemeName } from '@/constants/theme';
import { IntegrityService } from '@/services/IntegrityService';
import { SecureStorage } from '@/services/SecureStorage';
import { GooglePlayBilling } from '@/lib/payment';

export type SubscriptionPlan = 'free' | 'premium';
export type SubscriptionType = 'monthly' | 'annual' | null;

export interface SubscriptionState {
  plan: SubscriptionPlan;
  subscriptionType: SubscriptionType;
  purchaseToken: string | null;
  productId: string | null;
  purchaseTime: number | null;
  expiresAt: number | null;
  checksum?: string;
}

const SECURE_STORAGE_KEY = 'subscription_data';

export const PRODUCT_IDS = {
  monthly: 'new_audio_360_premium_monthly',
  annual: 'new_audio_360_premium_annual',
};

export const PRICING = {
  india: {
    monthly: 30,
    annual: 300,
    annualSavings: 60,
    symbol: '₹',
  },
  international: {
    monthly: 1,
    annual: 10,
    annualSavings: 2,
    symbol: '$',
  },
} as const;

interface SubscriptionContextType {
  plan: SubscriptionPlan;
  subscriptionType: SubscriptionType;
  isLoading: boolean;
  isLocked: boolean;
  lockoutRemaining: number | null;
  isThemeUnlocked: (themeId: ThemeName) => boolean;
  isImmersiveModeUnlocked: () => boolean;
  isNoiseReductionUnlocked: (level: string) => boolean;
  isReverbUnlocked: (reverb: string) => boolean;
  getAvailableThemes: () => ThemeName[];
  purchaseSubscription: (type: 'monthly' | 'annual') => Promise<boolean>;
  restorePurchases: () => Promise<void>;
  setPlanForTesting: (plan: SubscriptionPlan, type?: SubscriptionType) => void;
  runIntegrityCheck: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free',
    subscriptionType: null,
    purchaseToken: null,
    productId: null,
    purchaseTime: null,
    expiresAt: null,
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
        setState({ plan: 'free', subscriptionType: null, purchaseToken: null, productId: null, purchaseTime: null, expiresAt: null });
        setIsLoading(false);
        return;
      }

      if (integrityState.isCompromised) {
        setState({ plan: 'free', subscriptionType: null, purchaseToken: null, productId: null, purchaseTime: null, expiresAt: null });
        setIsLoading(false);
        return;
      }

      await loadSubscriptionState();
    } catch (error) {
      console.error('Initialization error:', error);
      setState({ plan: 'free', subscriptionType: null, purchaseToken: null, productId: null, purchaseTime: null, expiresAt: null });
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
        setState({ plan: 'free', subscriptionType: null, purchaseToken: null, productId: null, purchaseTime: null, expiresAt: null });
      } else if (integrityState.isCompromised) {
        setState({ plan: 'free', subscriptionType: null, purchaseToken: null, productId: null, purchaseTime: null, expiresAt: null });
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
            setState({ plan: 'free', subscriptionType: null, purchaseToken: null, productId: null, purchaseTime: null, expiresAt: null });
            return;
          }
        }
        
        if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
          console.log('[SUB] Subscription expired');
          setState({ plan: 'free', subscriptionType: null, purchaseToken: null, productId: null, purchaseTime: null, expiresAt: null });
          return;
        }
        
        setState(parsed);
      }
    } catch (error) {
      console.error('Error loading subscription state:', error);
      setState({ plan: 'free', subscriptionType: null, purchaseToken: null, productId: null, purchaseTime: null, expiresAt: null });
    }
  };

  const saveSubscriptionState = async (newState: SubscriptionState) => {
    try {
      console.log('[SUB] saveSubscriptionState called with plan:', newState.plan, 'type:', newState.subscriptionType);
      
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

  const purchaseSubscription = useCallback(async (type: 'monthly' | 'annual'): Promise<boolean> => {
    try {
      const integrityState = await IntegrityService.runIntegrityCheck(true);
      if (integrityState.isLocked || integrityState.isCompromised) {
        console.warn('Purchase blocked due to integrity issues');
        return false;
      }

      const productId = type === 'monthly' ? PRODUCT_IDS.monthly : PRODUCT_IDS.annual;
      const result = await GooglePlayBilling.purchaseSubscription(productId);
      
      if (!result.success) {
        console.error('Purchase failed');
        return false;
      }

      const purchaseTime = Date.now();
      const expiresAt = type === 'monthly' 
        ? purchaseTime + 30 * 24 * 60 * 60 * 1000
        : purchaseTime + 365 * 24 * 60 * 60 * 1000;

      const newState: SubscriptionState = {
        plan: 'premium',
        subscriptionType: type,
        purchaseToken: result.purchaseToken || `gp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId,
        purchaseTime,
        expiresAt,
      };
      await saveSubscriptionState(newState);
      return true;
    } catch (error) {
      console.error('Error purchasing subscription:', error);
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
      await loadSubscriptionState();
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPlanForTesting = useCallback((plan: SubscriptionPlan, type: SubscriptionType = 'monthly') => {
    const purchaseTime = Date.now();
    const expiresAt = type === 'monthly' 
      ? purchaseTime + 30 * 24 * 60 * 60 * 1000
      : purchaseTime + 365 * 24 * 60 * 60 * 1000;
    
    const newState: SubscriptionState = {
      plan,
      subscriptionType: plan === 'free' ? null : type,
      purchaseToken: plan === 'free' ? null : `test_${Date.now()}`,
      productId: plan === 'free' ? null : (type === 'monthly' ? PRODUCT_IDS.monthly : PRODUCT_IDS.annual),
      purchaseTime: plan === 'free' ? null : purchaseTime,
      expiresAt: plan === 'free' ? null : expiresAt,
    };
    saveSubscriptionState(newState);
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        plan: isLocked ? 'free' : state.plan,
        subscriptionType: isLocked ? null : state.subscriptionType,
        isLoading,
        isLocked,
        lockoutRemaining,
        isThemeUnlocked,
        isImmersiveModeUnlocked,
        isNoiseReductionUnlocked,
        isReverbUnlocked,
        getAvailableThemes,
        purchaseSubscription,
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
